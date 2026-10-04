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
  executionTimeMs: number | null;
  memoryBytes: number | null;
  /** True when memoryBytes is WebAssembly heap growth, not exact. */
  memoryApproximate: boolean;
  /** The runtime was restarted after this run to release memory. */
  recycle: boolean;
};

/** A piece of output printed by a running playground script. */
export type PythonStreamChunk = {
  stream: "stdout" | "stderr";
  text: string;
};

type WorkerResponse = {
  id: number;
  type: "ready" | "result" | "error" | "stream";
  payload?: unknown;
  error?: string;
};

type WorkerRequestType = "init" | "run" | "script";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout> | null;
  onStream?: (chunk: PythonStreamChunk) => void;
};

export class PythonTimeoutError extends Error {
  constructor(message = "Time limit exceeded") {
    super(message);
    this.name = "PythonTimeoutError";
  }
}

/** Thrown when the person stops a running playground script. */
export class PythonStoppedError extends Error {
  constructor(message = "Execution stopped.") {
    super(message);
    this.name = "PythonStoppedError";
  }
}

export const TEST_TIME_LIMIT_MS = 5_000;

const INIT_TIMEOUT_MS = 60_000;

/**
 * One Pyodide worker with its own request queue.
 *
 * The problem test runner and the Playground each use their own
 * client, so they never share a Python interpreter, and stopping
 * or restarting one can never affect the other.
 */
class PythonWorkerClient {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private readyPromise: Promise<void> | null = null;
  private readonly pending = new Map<number, PendingRequest>();

  private clearTimer(request: PendingRequest): void {
    if (request.timeout) clearTimeout(request.timeout);
  }

  private rejectPending(error: Error): void {
    for (const [id, request] of this.pending) {
      this.clearTimer(request);
      this.pending.delete(id);
      request.reject(error);
    }
  }

  private handleFailure(instance: Worker, message: string): void {
    // Ignore events from a worker that has already been replaced.
    if (this.worker !== instance) return;

    this.rejectPending(new Error(message));

    instance.terminate();

    this.worker = null;
    this.readyPromise = null;
  }

  private createWorker(): Worker {
    const instance = new Worker(
      new URL("../workers/python.worker.ts", import.meta.url),
      { type: "module" },
    );

    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      // Ignore messages from an obsolete worker.
      if (this.worker !== instance) return;

      const message = event.data;
      const request = this.pending.get(message.id);

      if (!request) return;

      // Streamed output does not finish the request.
      if (message.type === "stream") {
        request.onStream?.(message.payload as PythonStreamChunk);
        return;
      }

      this.clearTimer(request);
      this.pending.delete(message.id);

      if (message.type === "error") {
        request.reject(
          new Error(message.error ?? "Python worker failed."),
        );
        return;
      }

      request.resolve(message.payload);
    };

    instance.onerror = () => {
      this.handleFailure(
        instance,
        "Python runtime stopped unexpectedly.",
      );
    };

    instance.onmessageerror = () => {
      this.handleFailure(
        instance,
        "Could not read the response from the Python worker.",
      );
    };

    return instance;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker();
    }

    return this.worker;
  }

  /**
   * Send a request to the worker.
   * Pass `timeoutMs = null` for no time limit.
   */
  request<T>(
    type: WorkerRequestType,
    payload: unknown,
    timeoutMs: number | null,
    onStream?: (chunk: PythonStreamChunk) => void,
  ): Promise<T> {
    const currentWorker = this.getWorker();
    const id = this.nextRequestId++;

    return new Promise<T>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;

      if (timeoutMs !== null) {
        timeout = setTimeout(() => {
          // The request may have already completed or been rejected.
          const request = this.pending.get(id);

          if (!request) return;

          this.pending.delete(id);

          request.reject(
            new PythonTimeoutError(
              type === "init"
                ? "Python runtime took too long to start."
                : "Time limit exceeded",
            ),
          );

          // Terminate the worker to interrupt an infinite loop.
          // This also rejects any other requests using this worker.
          if (this.worker === currentWorker) {
            this.restart();
          }
        }, timeoutMs);
      }

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
        onStream,
      });

      try {
        currentWorker.postMessage({ id, type, payload });
      } catch (error) {
        if (timeout) clearTimeout(timeout);
        this.pending.delete(id);

        reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });
  }

  warm(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    const promise = this.request<void>(
      "init",
      undefined,
      INIT_TIMEOUT_MS,
    ).catch((error: unknown) => {
      // Only reset if a newer warm-up has not replaced this one.
      if (this.readyPromise === promise) {
        this.readyPromise = null;
      }

      throw error;
    });

    this.readyPromise = promise;

    return promise;
  }

  restart(
    reason: Error = new Error("Python runtime was restarted."),
  ): void {
    const currentWorker = this.worker;

    // Clear the shared references before terminating the worker.
    // Any later request will create a fresh worker.
    this.worker = null;
    this.readyPromise = null;

    this.rejectPending(reason);

    currentWorker?.terminate();
  }
}

// Used by problem pages. Every test case has a time limit.
const testRuntime = new PythonWorkerClient();

// Used only by the Playground. Isolated from the test runtime and
// has no time limit; the person can stop a script manually.
const playgroundRuntime = new PythonWorkerClient();

/* ---------------------------------------------------------------
   Problem test runner
   --------------------------------------------------------------- */

export function warmPythonRuntime(): Promise<void> {
  return testRuntime.warm();
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
    await testRuntime.warm();

    try {
      const raw = await testRuntime.request<WorkerCaseResult>(
        "run",
        {
          code,
          testCase,
          functionName,
          options,
        },
        TEST_TIME_LIMIT_MS,
      );

      results.push({
        ...raw,
        input: testCase.input,
        expected: testCase.expected,
      });
    } catch (error) {
      if (!(error instanceof PythonTimeoutError)) {
        throw error;
      }

      results.push({
        status: "timeout",
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        stdout: "",
        stderr: "",
        error:
          `Time Limit Exceeded: this test case ran for more than ` +
          `${TEST_TIME_LIMIT_MS / 1000} seconds.`,
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

export function restartPythonRuntime(): void {
  testRuntime.restart();
}

/* ---------------------------------------------------------------
   Playground (isolated, no time limit)
   --------------------------------------------------------------- */

export async function runPythonScript(
  code: string,
  onOutput?: (chunk: PythonStreamChunk) => void,
): Promise<PythonScriptResult> {
  await playgroundRuntime.warm();

  const result = await playgroundRuntime.request<PythonScriptResult>(
    "script",
    { code },
    null,
    onOutput,
  );

  // WebAssembly memory never shrinks. After a memory-heavy or crashed
  // run, discard the worker so the browser can reclaim the memory.
  // The next run starts a fresh interpreter.
  if (result.recycle) {
    playgroundRuntime.restart();
  }

  return result;
}

/**
 * Stop the running playground script by terminating its worker.
 * The next run starts a fresh interpreter. Problem tests are unaffected.
 */
export function stopPythonScript(): void {
  playgroundRuntime.restart(new PythonStoppedError());
}
