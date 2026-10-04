import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Play,
  RotateCcw,
  Info,
  MemoryStick,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  PythonStoppedError,
  runPythonScript,
  stopPythonScript,
  type PythonStreamChunk,
} from "../runtime/pythonRuntime";
import { indentUnit } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { Group, Panel, Separator } from "react-resizable-panels";

const DEFAULT_CODE = `"""
DSA With Ragu — Python Playground

Practice Python, solve DSA problems, and experiment
with your own ideas.

Note: The WebAssembly (WASM) runtime has a memory limit
of approximately 4 GB. Code that exceeds the available
memory may crash the Python runtime or stop execution.
"""

def solve():
    # Your code starts here
    print("Hello, Ragu!")

if __name__ == "__main__":
    solve()
`;

// Output is capped so a runaway print loop cannot freeze the page.
const MAX_OUTPUT_CHARS = 200_000;

// How often streamed output is pushed into React state.
const FLUSH_INTERVAL_MS = 30;

type OutputStream = "stdout" | "stderr" | "info";

type OutputSegment = {
  stream: OutputStream;
  text: string;
};

type RunStats = {
  executionTimeMs: number | null;
  memoryBytes: number | null;
  memoryApproximate: boolean;
};

function formatTime(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatMemory(bytes: number, approximate: boolean): string {
  const kb = 1024;
  const mb = 1024 * kb;
  const gb = 1024 * mb;

  const prefix = approximate ? "~" : "";

  if (bytes < 0.5 * mb) {
    return `${prefix}${(bytes / kb).toFixed(1)} KB`;
  }

  if (bytes < gb) {
    return `${prefix}${(bytes / mb).toFixed(1)} MB`;
  }

  return `${prefix}${(bytes / gb).toFixed(2)} GB`;
}

// Append chunks, merging consecutive output of the same stream.
function addChunks(
  segments: OutputSegment[],
  chunks: OutputSegment[],
): OutputSegment[] {
  const next = segments.slice();

  for (const chunk of chunks) {
    const last = next[next.length - 1];

    // Start notes on their own line.
    const text =
      chunk.stream === "info" && last && !last.text.endsWith("\n")
        ? "\n" + chunk.text
        : chunk.text;

    if (last && last.stream === chunk.stream) {
      next[next.length - 1] = { stream: last.stream, text: last.text + text };
    } else {
      next.push({ stream: chunk.stream, text });
    }
  }

  return next;
}

// Stack the panels vertically on narrow screens.
function useIsNarrow(maxWidth = 900): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [query]);

  return narrow;
}

export default function Playground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [segments, setSegments] = useState<OutputSegment[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [running, setRunning] = useState(false);
  const vertical = useIsNarrow();

  const runningRef = useRef(false);

  // Streamed output is buffered and flushed on a short timer, so a
  // script that prints thousands of lines does not re-render each time.
  const pendingRef = useRef<OutputSegment[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charCountRef = useRef(0);
  const truncatedRef = useRef(false);

  const consoleRef = useRef<HTMLPreElement | null>(null);
  const stickToBottomRef = useRef(true);

  function flushOutput() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const chunks = pendingRef.current;
    pendingRef.current = [];

    if (chunks.length === 0) return;

    // Apply the output cap before touching React state.
    const kept: OutputSegment[] = [];

    for (const chunk of chunks) {
      if (truncatedRef.current) break;

      const room = MAX_OUTPUT_CHARS - charCountRef.current;

      if (chunk.text.length <= room) {
        charCountRef.current += chunk.text.length;
        kept.push(chunk);
        continue;
      }

      if (room > 0) {
        kept.push({ stream: chunk.stream, text: chunk.text.slice(0, room) });
      }

      charCountRef.current = MAX_OUTPUT_CHARS;
      truncatedRef.current = true;
      kept.push({
        stream: "info",
        text: "Output truncated: too much output to display.\n",
      });
    }

    if (kept.length > 0) {
      setSegments((previous) => addChunks(previous, kept));
    }
  }

  function queueOutput(chunk: PythonStreamChunk | OutputSegment) {
    pendingRef.current.push(chunk);

    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushOutput, FLUSH_INTERVAL_MS);
    }
  }

  function resetOutput() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    pendingRef.current = [];
    charCountRef.current = 0;
    truncatedRef.current = false;

    setSegments([]);
    setStats(null);
  }

  // Leaving the page while a script runs would leave it burning CPU
  // in the background (there is no time limit), so stop it.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (runningRef.current) stopPythonScript();
    };
  }, []);

  // Follow new output unless the person has scrolled up.
  useEffect(() => {
    const element = consoleRef.current;

    if (element && stickToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [segments]);

  function handleConsoleScroll() {
    const element = consoleRef.current;

    if (!element) return;

    stickToBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 24;
  }

  async function runCode() {
    if (runningRef.current) return;

    runningRef.current = true;
    stickToBottomRef.current = true;

    resetOutput();
    setRunning(true);

    const startedAt = performance.now();

    try {
      const result = await runPythonScript(code, queueOutput);

      flushOutput();

      setStats({
        executionTimeMs: result.executionTimeMs ?? null,
        memoryBytes: result.memoryBytes ?? null,
        memoryApproximate: result.memoryApproximate ?? false,
      });

      if (result.recycle) {
        queueOutput({
          stream: "info",
          text: "Python runtime restarted to release memory.\n",
        });
        flushOutput();
      }
    } catch (err) {
      // Keep everything printed so far, including when stopped.
      flushOutput();

      if (err instanceof PythonStoppedError) {
        queueOutput({ stream: "info", text: "Execution stopped.\n" });
        flushOutput();

        setStats({
          executionTimeMs: performance.now() - startedAt,
          memoryBytes: null,
          memoryApproximate: false,
        });
      } else {
        queueOutput({
          stream: "stderr",
          text: (err instanceof Error ? err.message : String(err)) + "\n",
        });
        flushOutput();
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }

  function stopCode() {
    if (!runningRef.current) return;
    stopPythonScript();
  }

  function resetCode() {
    setCode(DEFAULT_CODE);
    resetOutput();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runCode();
    }
  }

  return (
    <main className="playground-page" onKeyDown={handleKeyDown}>
      <header className="playground-toolbar">
        <div className="playground-title">
          <span className="eyebrow">PYTHON ENVIRONMENT</span>
          <h1>Python Playground</h1>
        </div>

        <div className="playground-actions">
          <span className="muted-text playground-hint">
            Ctrl + Enter to run
          </span>

          <button
            type="button"
            className="secondary-button"
            onClick={resetCode}
            disabled={running}
          >
            <RotateCcw size={15} />
            Reset
          </button>

          {running ? (
            <button
              type="button"
              className="secondary-button stop-button"
              onClick={stopCode}
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={runCode}
            >
              <Play size={15} />
              Run Python
            </button>
          )}
        </div>
      </header>

      <div className="playground-workspace">
        <Group
          orientation={vertical ? "vertical" : "horizontal"}
          className="playground-group"
        >
          <Panel
            defaultSize="60%"
            minSize="25%"
            className="playground-panel"
            style={{ overflow: "hidden" }}
          >
            <section className="playground-editor panel">
              <div className="panel-heading">
                <h2>main.py</h2>
                <span className="muted-text">
                  Python 3 · Browser runtime
                </span>
              </div>

              <div className="playground-code">
                <CodeMirror
                  value={code}
                  height="100%"
                  theme={oneDark}
                  extensions={[
                    python(),
                    indentUnit.of("    "), // 4 spaces per indentation level
                    EditorState.tabSize.of(4), // Tab width = 4
                  ]}
                  onChange={setCode}
                  editable={!running}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                    highlightActiveLineGutter: true,
                  }}
                />
              </div>
            </section>
          </Panel>

          <Separator
            className={`playground-separator ${
              vertical ? "is-vertical" : "is-horizontal"
            }`}
          />

          <Panel
            defaultSize="40%"
            minSize="20%"
            className="playground-panel"
            style={{ overflow: "hidden" }}
          >
            <section className="playground-output panel">
              <div className="panel-heading">
                <h2>Output</h2>

                <div className="playground-output-actions">
                  {stats && (
                    <div className="playground-stats" aria-live="polite">
                      {stats.executionTimeMs !== null && (
                        <span
                          className="playground-stat"
                          title="Execution time"
                        >
                          <Timer size={13} />
                          {formatTime(stats.executionTimeMs)}
                        </span>
                      )}

                      {stats.memoryBytes !== null && (
                        <span
                          className="playground-stat"
                          title={
                            stats.memoryApproximate
                              ? "Approximate: WebAssembly heap growth. Exact tracing is skipped for longer scripts."
                              : "Peak Python memory"
                          }
                        >
                          <MemoryStick size={13} />
                          {formatMemory(
                            stats.memoryBytes,
                            stats.memoryApproximate,
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="icon-button"
                    onClick={resetOutput}
                    disabled={segments.length === 0 && !stats}
                    aria-label="Clear output"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>

              <pre
                ref={consoleRef}
                className="playground-console"
                onScroll={handleConsoleScroll}
                aria-live="polite"
              >
                {segments.length === 0 ? (
                  <span className="console-placeholder">
                    {running
                      ? "Running..."
                      : "Your program output will appear here."}
                  </span>
                ) : (
                  segments.map((segment, index) => (
                    <span
                      key={index}
                      className={
                        segment.stream === "stderr"
                          ? "console-stderr"
                          : segment.stream === "info"
                            ? "console-info"
                            : undefined
                      }
                    >
                      {segment.text}
                    </span>
                  ))
                )}
              </pre>

              <p className="playground-note">
                <Info size={15} />
                <span>
                  Runs in your browser using Pyodide.{" "}
                  <a
                    href="https://pyodide.org/en/stable/usage/quickstart.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Supported features and limitations
                  </a>
                </span>
              </p>
            </section>
          </Panel>
        </Group>
      </div>
    </main>
  );
}
