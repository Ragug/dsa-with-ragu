import type { ReactNode } from "react";
import type { PythonRunResult } from "../runtime/pythonRuntime";
import { formatMemory, formatMs, previewJson } from "../utils/format";

type Props = {
  result: PythonRunResult;
  inputNames?: string[];
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ws-field">
      <span className="ws-field-label">{label}</span>
      <div className="ws-code-block">{children}</div>
    </div>
  );
}

/** Everything about ONE test case: values, its own time and its own memory. */
export default function TestCaseDetail({ result, inputNames }: Props) {
  const stats = result.timeStats;

  return (
    <div className="ws-detail">
      {result.input.map((value, index) => (
        <Field key={index} label={inputNames?.[index] ?? `arg${index + 1}`}>
          {previewJson(value)}
        </Field>
      ))}

      {result.status !== "timeout" && (
        <Field label="Output">{previewJson(result.actual)}</Field>
      )}
      <Field label="Expected">{previewJson(result.expected)}</Field>

      <div className="ws-metrics">
        <div className="ws-metric">
          <span>Runtime</span>
          <strong>{formatMs(result.executionTimeMs)}</strong>
          {stats && stats.runs > 1 && (
            <small>
              median of {stats.runs} runs · min {formatMs(stats.minMs)} · max{" "}
              {formatMs(stats.maxMs)}
            </small>
          )}
        </div>
        <div className="ws-metric">
          <span>Memory</span>
          <strong>{formatMemory(result.memoryBytes)}</strong>
          <small>peak Python allocation</small>
        </div>
      </div>

      {result.stdout && (
        <div className="ws-field">
          <span className="ws-field-label">stdout</span>
          <pre className="ws-code-block">{result.stdout}</pre>
        </div>
      )}

      {result.stderr && (
        <div className="ws-field">
          <span className="ws-field-label">stderr</span>
          <pre className="ws-code-block">{result.stderr}</pre>
        </div>
      )}

      {result.error && <pre className="ws-error-block">{result.error}</pre>}
    </div>
  );
}
