
import { loadPyodide,version, type PyodideInterface } from "pyodide";
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

let pyodidePromise: Promise<PyodideInterface> | null = null;


function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({
      indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
    }).then((pyodide) => {
      // Define the DSA test harness once.
      pyodide.runPython(harnessSource);
      return pyodide;
    });
  }

  return pyodidePromise;
}

function send(message: WorkerResponse) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    const pyodide = await getPyodide();

    if (type === "init") {
      send({ id, type: "ready" });
      return;
    }

    if (!payload || typeof payload.code !== "string") {
      throw new Error("Invalid worker request: missing Python code.");
    }

    // Interactive Playground execution.
    if (type === "script") {
      let stdout = "";
      let stderr = "";

      pyodide.setStdout({
        batched: (text) => {
          stdout += text;
        },
      });

      pyodide.setStderr({
        batched: (text) => {
          stderr += text;
        },
      });

      try {
        await pyodide.runPythonAsync(payload.code);

        send({
          id,
          type: "result",
          payload: { stdout, stderr } satisfies PythonScriptResult,
        });
      } catch (error) {
        // Keep output printed before the exception.
        stderr += error instanceof Error ? error.message : String(error);

        send({
          id,
          type: "result",
          payload: { stdout, stderr } satisfies PythonScriptResult,
        });
      } finally {
        // Restore default output handlers for subsequent DSA runs.
        pyodide.setStdout({});
        pyodide.setStderr({});
      }

      return;
    }

    // Existing DSA test-case execution.
    if (type !== "run" || !payload.testCase || !payload.functionName) {
      throw new Error("Invalid worker request.");
    }

    const { code, testCase, functionName, options } = payload;
    const runCase = pyodide.globals.get("run_case");

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
  } catch (error) {
    send({
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
