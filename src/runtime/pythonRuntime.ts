
export type PythonTestCase = {
  input: unknown[];
  expected: unknown;
};

export type RunOptions = {
  ignoreOrder?: boolean;
  precise?: boolean;
};

export type TestStatus = "passed" | "failed" | "error" | "timeout";

export type TimeStats = {
  runs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
};

export type PythonRunResult = {
  status: TestStatus;
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual: unknown;
  stdout: string;
  stderr: string;
  error: string | null;
  executionTimeMs: number | null;
  memoryBytes: number | null;
  timeStats: TimeStats | null;
};

export type PythonRunResponse = {
  results: PythonRunResult[];
  passedCount: number;
  totalCount: number;
};

export type PythonScriptResult = {
  stdout: string;
  stderr: string;
};

type WorkerResponse = {
  id: number;
  type: "ready" | "result" | "error";
  payload?: unknown;
  error?: string;
};

type WorkerRequestType = "init" | "run" | "script";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class PythonTimeoutError extends Error {
  constructor(message = "Time limit exceeded") {
    super(message);
    this.name = "PythonTimeoutError";
  }
}

export const TEST_TIME_LIMIT_MS = 5_000;
const INIT_TIMEOUT_MS = 60_000;

let worker: Worker | null = null;
let nextRequestId = 1;
let readyPromise: Promise<void> | null = null;

const pending = new Map<number, PendingRequest>();

function rejectPendingRequests(message: string) {
  for (const [id, request] of pending) {
    clearTimeout(request.timeout);
    request.reject(new Error(message));
    pending.delete(id);
  }
}

function createWorker(): Worker {
  const instance = new Worker(
    new URL("../workers/python.worker.ts", import.meta.url),
    { type: "module" },
  );

  instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    const request = pending.get(message.id);

    if (!request) return;

    clearTimeout(request.timeout);
    pending.delete(message.id);

    if (message.type === "error") {
      request.reject(new Error(message.error ?? "Python worker failed."));
    } else {
      request.resolve(message.payload);
    }
  };

  instance.onerror = () => {
    rejectPendingRequests("Python runtime stopped unexpectedly.");
    instance.terminate();

    if (worker === instance) {
      worker = null;
      readyPromise = null;
    }
  };

  return instance;
}

function getWorker(): Worker {
  if (!worker) {
    worker = createWorker();
  }

  return worker;
}

function requestWorker<T>(
  type: WorkerRequestType,
  payload: unknown,
  timeoutMs: number,
): Promise<T> {
  const currentWorker = getWorker();
  const id = nextRequestId++;

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);

      reject(
        new PythonTimeoutError(
          type === "init"
            ? "Python runtime took too long to start."
            : "Time limit exceeded",
        ),
      );

      // Replace the worker to interrupt an infinite loop.
      restartPythonRuntime();
    }, timeoutMs);

    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    currentWorker.postMessage({ id, type, payload });
  });
}

export function warmPythonRuntime(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = requestWorker<void>(
    "init",
    undefined,
    INIT_TIMEOUT_MS,
  ).catch((error: unknown) => {
    readyPromise = null;
    throw error;
  });

  return readyPromise;
}

type WorkerCaseResult = Omit<PythonRunResult, "input" | "expected">;

export async function runPython(
  code: string,
  testCases: PythonTestCase[],
  functionName: string,
  options: RunOptions = {},
  onProgress?: (done: number, total: number) => void,
): Promise<PythonRunResponse> {
  const results: PythonRunResult[] = [];

  for (const testCase of testCases) {
    await warmPythonRuntime();

    try {
      const raw = await requestWorker<WorkerCaseResult>(
        "run",
        { code, testCase, functionName, options },
        TEST_TIME_LIMIT_MS,
      );

      results.push({
        ...raw,
        input: testCase.input,
        expected: testCase.expected,
      });
    } catch (error) {
      if (!(error instanceof PythonTimeoutError)) throw error;

      results.push({
        status: "timeout",
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        stdout: "",
        stderr: "",
        error: `Time Limit Exceeded: this test case ran for more than ${
          TEST_TIME_LIMIT_MS / 1000
        } seconds.`,
        executionTimeMs: null,
        memoryBytes: null,
        timeStats: null,
      });
    }

    onProgress?.(results.length, testCases.length);
  }

  return {
    results,
    passedCount: results.filter((result) => result.passed).length,
    totalCount: results.length,
  };
}

export async function runPythonScript(
  code: string,
): Promise<PythonScriptResult> {
  await warmPythonRuntime();

  return requestWorker<PythonScriptResult>(
    "script",
    { code },
    TEST_TIME_LIMIT_MS,
  );
}

export function restartPythonRuntime(): void {
  rejectPendingRequests("Python runtime was restarted.");

  worker?.terminate();
  worker = null;
  readyPromise = null;
}
