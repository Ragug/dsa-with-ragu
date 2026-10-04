import type { PythonRunResult } from "../runtime/pythonRuntime";

/** Browsers round timers (Chrome: 0.1 ms, Firefox: 1 ms or more). */
const TIMER_RESOLUTION_MS = 0.1;

export function toJson(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

const PREVIEW_CHARS = 300;
const PREVIEW_ITEMS = 8;

/** JSON for display. Long values are shortened so huge inputs stay readable. */
export function previewJson(value: unknown): string {
  const full = toJson(value);

  if (full.length <= PREVIEW_CHARS) return full;

  if (Array.isArray(value)) {
    const head = value.slice(0, PREVIEW_ITEMS).map(toJson).join(", ");
    return `[${head}, … ${value.length - PREVIEW_ITEMS} more] (${value.length} items)`;
  }

  return `${full.slice(0, PREVIEW_CHARS)}… (${full.length} characters)`;
}

export function formatInput(
  names: string[] | undefined,
  input: unknown[],
): string {
  return input
    .map((value, index) => `${names?.[index] ?? `arg${index + 1}`} = ${previewJson(value)}`)
    .join(", ");
}

export function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < TIMER_RESOLUTION_MS) return `< ${TIMER_RESOLUTION_MS} ms`;
  if (ms < 10) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatMemory(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type Verdict = {
  label: string;
  tone: "success" | "danger";
};

export function getVerdict(results: PythonRunResult[]): Verdict {
  const firstBad = results.find((result) => !result.passed);

  if (!firstBad) return { label: "Accepted", tone: "success" };
  if (firstBad.status === "timeout")
    return { label: "Time Limit Exceeded", tone: "danger" };
  if (firstBad.status === "error")
    return { label: "Runtime Error", tone: "danger" };

  return { label: "Wrong Answer", tone: "danger" };
}

export function statusLabel(result: PythonRunResult): string {
  switch (result.status) {
    case "passed":
      return "Passed";
    case "timeout":
      return "Time Limit Exceeded";
    case "error":
      return "Runtime Error";
    default:
      return "Wrong Answer";
  }
}
