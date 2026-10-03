
import { useState } from "react";
import {
  Play,
  RotateCcw,
  LoaderCircle,
  Info,
  Trash2,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { runPythonScript } from "../runtime/pythonRuntime";
import { indentUnit } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
const DEFAULT_CODE = `"""
DSA With Ragu — Python Playground

Practice Python, solve DSA problems, and experiment
with your own ideas.
"""

def solve():
    # Your code starts here
    print("Hello, Ragu!")

if __name__ == "__main__":
    solve()
`;

export default function Playground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function runCode() {
    if (running) return;

    setRunning(true);
    setOutput("");
    setError("");

    try {
      const result = await runPythonScript(code);

      setOutput(result.stdout ?? "");
      setError(result.stderr ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function resetCode() {
    setCode(DEFAULT_CODE);
    setOutput("");
    setError("");
  }

  function clearOutput() {
    setOutput("");
    setError("");
  }

  return (
    <main className="main-content playground-page">
      <header className="playground-header">
        <div>
          <span className="eyebrow">PYTHON ENVIRONMENT</span>
          <h1>Python Playground</h1>
          <p className="page-subtitle">
            Experiment with Python without creating a problem submission.
          </p>
        </div>

        <div className="playground-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={resetCode}
            disabled={running}
          >
            <RotateCcw size={15} />
            Reset
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={runCode}
            disabled={running}
          >
            {running ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Play size={15} />
            )}
            {running ? "Running..." : "Run Python"}
          </button>
        </div>
      </header>

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
            height="400px"
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

      <section className="playground-output panel">
        <div className="panel-heading">
          <h2>Output</h2>

          <button
            type="button"
            className="icon-button"
            onClick={clearOutput}
            disabled={!output && !error}
            aria-label="Clear output"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        <pre
          className={`playground-console${error ? " console-error" : ""}`}
          aria-live="polite"
        >
          {error || output || "Your program output will appear here."}
        </pre>
      </section>

      <p className="playground-note">
        <Info size={17} />
        <span>
          <strong>Note:</strong> Code runs in your browser using Pyodide.
          Check the{" "}
          <a
            href="https://pyodide.org/en/stable/usage/quickstart.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            supported features and limitations
          </a>{" "}
          of the Pyodide runtime.
        </span>
      </p>
    </main>
  );
}
