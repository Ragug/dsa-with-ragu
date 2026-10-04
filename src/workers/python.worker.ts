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
  type: "ready" | "result" | "error";
  payload?: unknown;
  error?: string;
};

type PythonScriptResult = {
  stdout: string;
  stderr: string;
};

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

      return pyodide;
    })().catch((error: unknown) => {
      // Allow a later request to retry initialization.
      pyodidePromise = null;
      throw error;
    });
  }

  return pyodidePromise;
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
      let stdout = "";
      let stderr = "";

      // Pyodide calls `batched` once per line with the trailing
      // newline already removed, so add it back.
      pyodide.setStdout({
        batched: (text) => {
          stdout += text + "\n";
        },
      });

      pyodide.setStderr({
        batched: (text) => {
          stderr += text + "\n";
        },
      });

      try {
        await pyodide.runPythonAsync(payload.code);

        send({
          id,
          type: "result",
          payload: {
            stdout,
            stderr,
          } satisfies PythonScriptResult,
        });
      } catch (error: unknown) {
        // Preserve output printed before an exception.
        const message = error instanceof Error
          ? error.message
          : String(error);

        stderr += (stderr && !stderr.endsWith("\n") ? "\n" : "") + message;

        send({
          id,
          type: "result",
          payload: {
            stdout,
            stderr,
          } satisfies PythonScriptResult,
        });
      } finally {
        // Restore default handlers for subsequent executions.
        pyodide.setStdout({});
        pyodide.setStderr({});
      }

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
