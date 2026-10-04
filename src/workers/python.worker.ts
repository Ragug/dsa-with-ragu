import type { PyodideInterface } from "pyodide";
import harnessSource from "./pythonHarness.py?raw";
import type {
  PythonTestCase,
  RunOptions,
} from "../runtime/pythonRuntime";

type WorkerRequest = {
  id: number;
  type: "init" | "run" | "script";
  payload?: {
    code?: string;
    testCase?: PythonTestCase;
    functionName?: string;
    options?: RunOptions;
  };
};

type WorkerResponse = {
  id: number;
  type: "ready" | "result" | "error" | "stream";
  payload?: unknown;
  error?: string;
};

// Output is streamed to the page as it is printed, so the final
// result only carries the measurements.
type PythonScriptResult = {
  executionTimeMs: number | null;
  memoryBytes: number | null;
  memoryApproximate: boolean;
  /**
   * The WebAssembly heap never shrinks, so after a memory-heavy run
   * the page restarts this worker to give the memory back.
   */
  recycle: boolean;
};

// Restart the runtime after a run if the heap grew past this size.
const RECYCLE_HEAP_BYTES = 768 * 1024 * 1024;

/**
 * Current size of the WebAssembly heap in bytes.
 * The heap never shrinks, so growth during a run is a usable
 * (approximate) memory figure when tracemalloc would be too slow.
 */
function getHeapBytes(pyodide: PyodideInterface): number | null {
  const module = (
    pyodide as unknown as {
      _module?: {
        HEAPU8?: { byteLength: number };
        wasmMemory?: { buffer: { byteLength: number } };
      };
    }
  )._module;

  return (
    module?.wasmMemory?.buffer.byteLength ??
    module?.HEAPU8?.byteLength ??
    null
  );
}

// Exact memory (tracemalloc) is only measured for quick scripts,
// because it re-runs the script. Longer scripts report approximate
// WebAssembly heap growth instead.
const MEMORY_PASS_MAX_MS = 500;

// Re-runs the script with tracemalloc and output discarded, and
// returns peak traced memory in bytes (or None if the script fails).
const MEMORY_HELPER = `
import contextlib, gc, io, sys, tracemalloc

def _playground_peak_memory(code):
    namespace = {"__name__": "__main__"}
    sink = io.StringIO()
    tracemalloc.start()
    try:
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            exec(compile(code, "<playground>", "exec"), namespace)
        return tracemalloc.get_traced_memory()[1]
    except BaseException:
        return None
    finally:
        tracemalloc.stop()
        namespace.clear()
        gc.collect()

def _playground_cleanup():
    # Drop references that keep a crashed script's objects alive.
    for name in ("last_exc", "last_value", "last_type", "last_traceback"):
        if hasattr(sys, name):
            delattr(sys, name)
    gc.collect()
`;

const PYODIDE_VERSION = "314.0.7";

const PYODIDE_BASE_URL =
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<PyodideInterface> | null = null;

/**
 * Load Pyodide directly in the browser worker.
 *
 * Loading from the CDN at runtime avoids bundling the npm package's
 * Node-compatible entry point into the Vite application.
 */
function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const { loadPyodide } = await import(
        /* @vite-ignore */
        `${PYODIDE_BASE_URL}pyodide.mjs`
      );

      const pyodide = await loadPyodide({
        indexURL: PYODIDE_BASE_URL,
      });

      // Define the DSA test harness once per Pyodide instance.
      pyodide.runPython(harnessSource);
      pyodide.runPython(MEMORY_HELPER);

      return pyodide;
    })().catch((error: unknown) => {
      // Allow a later request to retry initialization.
      pyodidePromise = null;
      throw error;
    });
  }

  return pyodidePromise;
}

/**
 * Pyodide's PythonError message includes its own internal frames.
 * Keep only the frames from the person's code, and explain
 * out-of-memory errors, which come from the browser's limit.
 */
function formatScriptError(message: string): string {
  const lines = message.split("\n");
  const firstUserFrame = lines.findIndex((line) =>
    line.includes('File "<exec>"'),
  );

  let text =
    firstUserFrame >= 0
      ? [
          "Traceback (most recent call last):",
          ...lines.slice(firstUserFrame),
        ].join("\n")
      : message;

  if (/\bMemoryError\b/.test(text)) {
    text =
      text.replace(/\s+$/, "") +
      "\nThe browser's WebAssembly memory limit (a few GB) was reached.";
  }

  return text;
}

function send(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    const pyodide = await getPyodide();

    // Runtime initialization request.
    if (type === "init") {
      send({
        id,
        type: "ready",
      });
      return;
    }

    if (!payload || typeof payload.code !== "string") {
      throw new Error("Invalid worker request: missing Python code.");
    }

    // Interactive Playground execution.
    if (type === "script") {
      // Stream each line to the page as soon as it is printed.
      // Pyodide's batched handler strips the trailing newline.
      const emit = (stream: "stdout" | "stderr", text: string) => {
        send({ id, type: "stream", payload: { stream, text } });
      };

      pyodide.setStdout({
        batched: (text) => emit("stdout", text + "\n"),
      });

      pyodide.setStderr({
        batched: (text) => emit("stderr", text + "\n"),
      });

      let executionTimeMs: number | null = null;
      let memoryBytes: number | null = null;
      let memoryApproximate = false;
      let failed = false;
      let outOfMemory = false;

      const heapBefore = getHeapBytes(pyodide);

      // Each run gets its own globals, so variables from an earlier
      // run (or a crashed one) cannot stay alive and use up memory.
      const scriptGlobals = pyodide.runPython("{'__name__': '__main__'}");

      const started = performance.now();

      try {
        await pyodide.runPythonAsync(payload.code, {
          globals: scriptGlobals,
        });
        executionTimeMs = performance.now() - started;
      } catch (error: unknown) {
        executionTimeMs = performance.now() - started;
        failed = true;

        const message =
          error instanceof Error ? error.message : String(error);

        outOfMemory = /\bMemoryError\b/.test(message);

        emit("stderr", formatScriptError(message) + "\n");
      } finally {
        // Restore default handlers for subsequent executions.
        pyodide.setStdout({});
        pyodide.setStderr({});

        // Free everything the script created.
        try {
          scriptGlobals.destroy();
          const cleanup = pyodide.globals.get("_playground_cleanup");

          try {
            cleanup();
          } finally {
            cleanup.destroy();
          }
        } catch {
          // Cleanup is best effort; the runtime is recycled below.
          outOfMemory = true;
        }
      }

      const heapAfter = getHeapBytes(pyodide);

      if (!failed && executionTimeMs < MEMORY_PASS_MAX_MS) {
        // Quick script: exact peak, in a separate pass so tracing
        // never inflates the timing.
        const peakMemory = pyodide.globals.get("_playground_peak_memory");

        try {
          const peak = peakMemory(payload.code);
          memoryBytes = typeof peak === "number" ? peak : null;
        } catch {
          memoryBytes = null;
        } finally {
          peakMemory.destroy();
        }
      } else if (
        executionTimeMs >= MEMORY_PASS_MAX_MS &&
        heapBefore !== null &&
        heapAfter !== null
      ) {
        // Long script: do not run it again. Report heap growth.
        memoryBytes = Math.max(0, heapAfter - heapBefore);
        memoryApproximate = true;
      }

      const recycle =
        outOfMemory ||
        (heapAfter !== null && heapAfter > RECYCLE_HEAP_BYTES);

      send({
        id,
        type: "result",
        payload: {
          executionTimeMs,
          memoryBytes,
          memoryApproximate,
          recycle,
        } satisfies PythonScriptResult,
      });

      return;
    }

    // DSA test-case execution.
    if (
      type !== "run" ||
      !payload.testCase ||
      !payload.functionName
    ) {
      throw new Error("Invalid worker request.");
    }

    const {
      code,
      testCase,
      functionName,
      options,
    } = payload;

    const runCase = pyodide.globals.get("run_case");

    if (typeof runCase !== "function") {
      throw new Error("Python test harness is not initialized.");
    }

    try {
      const raw = runCase(
        code,
        functionName,
        JSON.stringify(testCase.input),
        JSON.stringify(testCase.expected),
        JSON.stringify(options ?? {}),
      ) as string;

      send({
        id,
        type: "result",
        payload: JSON.parse(raw),
      });
    } finally {
      runCase.destroy();
    }
  } catch (error: unknown) {
    send({
      id,
      type: "error",
      error: error instanceof Error
        ? error.message
        : String(error),
    });
  }
};
