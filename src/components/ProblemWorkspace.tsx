import { useEffect, useMemo, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  Lock,
  Play,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { Problem } from "../types/problem";
import CodeEditor from "./CodeEditor";
import TestCaseDetail from "./TestCaseDetail";
import {
  getSavedCode,
  isProblemSolved,
  markProblemSolved,
  readPreciseTiming,
  saveCode,
  savePreciseTiming,
  type AppTheme,
} from "../storage/progress";
import {
  runPython,
  warmPythonRuntime,
  TEST_TIME_LIMIT_MS,
  type PythonRunResponse,
} from "../runtime/pythonRuntime";
import { ADVANCED_METRICS_UNLOCKED } from "../config/features";
import {
  formatInput,
  formatMemory,
  formatMs,
  getVerdict,
  statusLabel,
  toJson,
} from "../utils/format";
import "../styles/workspace.css";

type Props = {
  problem: Problem;
  previousProblem?: Problem;
  nextProblem?: Problem;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onProgressChange: () => void;
};

type RunMode = "run" | "submit";
type LeftTab = "description" | "result";

function useIsNarrow(maxWidth = 900): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return narrow;
}

export default function ProblemWorkspace({
  problem,
  previousProblem,
  nextProblem,
  onBack,
  onPrevious,
  onNext,
  theme,
  onThemeChange,
  onProgressChange,
}: Props) {
  // App renders this component with key={problem.id}, so all state below
  // starts fresh for every problem.
  const [code, setCode] = useState(() =>
    getSavedCode(problem.id, problem.starterCode),
  );
  const [language, setLanguage] = useState("python3");
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [runningMode, setRunningMode] = useState<RunMode | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState("");
  const [sampleResponse, setSampleResponse] =
    useState<PythonRunResponse | null>(null);
  const [submitResponse, setSubmitResponse] =
    useState<PythonRunResponse | null>(null);
  const [selectedCase, setSelectedCase] = useState(0);
  const [solved, setSolved] = useState(() => isProblemSolved(problem.id));
  const [precise, setPrecise] = useState(
    () => ADVANCED_METRICS_UNLOCKED && readPreciseTiming(),
  );

  const isNarrow = useIsNarrow();
  const direction = isNarrow ? "vertical" : "horizontal";

  const submitCases = useMemo(
    () => problem.tests ?? problem.examples,
    [problem.tests, problem.examples],
  );

  useEffect(() => {
    saveCode(problem.id, code);
  }, [problem.id, code]);

  useEffect(() => {
    savePreciseTiming(precise);
  }, [precise]);

  useEffect(() => {
    let cancelled = false;

    warmPythonRuntime()
      .then(() => {
        if (!cancelled) setRuntimeReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setRuntimeError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function execute(mode: RunMode) {
    if (runningMode) return;

    const cases = mode === "run" ? problem.examples : submitCases;

    setRunningMode(mode);
    setRuntimeError("");
    setProgress({ done: 0, total: cases.length });

    if (mode === "run") {
      setSampleResponse(null);
      setSelectedCase(0);
    }

    try {
      const response = await runPython(
        code,
        cases,
        problem.functionName,
        {
          ignoreOrder: problem.ignoreOrder,
          precise: precise && ADVANCED_METRICS_UNLOCKED,
        },
        (done, total) => setProgress({ done, total }),
      );

      if (response.results.some((result) => result.status === "timeout")) {
        setRuntimeReady(false);
      }

      if (mode === "run") {
        setSampleResponse(response);
        const firstBad = response.results.findIndex((result) => !result.passed);
        setSelectedCase(firstBad === -1 ? 0 : firstBad);
      } else {
        setSubmitResponse(response);
        setLeftTab("result");

        if (
          response.totalCount > 0 &&
          response.passedCount === response.totalCount
        ) {
          markProblemSolved(problem.id);
          setSolved(true);
          onProgressChange();
        }
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
      setRuntimeReady(false);
    } finally {
      setRunningMode(null);
      // After a time-limit restart the runtime needs to start again.
      warmPythonRuntime()
        .then(() => setRuntimeReady(true))
        .catch(() => undefined);
    }
  }

  function handleResetCode() {
    const confirmed = window.confirm(
      "Reset your code for this problem to the starter code?",
    );

    if (!confirmed) return;

    setCode(problem.starterCode);
    saveCode(problem.id, problem.starterCode);
    setSampleResponse(null);
    setRuntimeError("");
  }

  const submitVerdict = submitResponse
    ? getVerdict(submitResponse.results)
    : null;
  const sampleResult = sampleResponse?.results[selectedCase];
  const busyLabel = (mode: RunMode, idle: string) =>
    runningMode === mode
      ? `${progress.done}/${progress.total}…`
      : idle;

  /* ------------------------------ left panel ------------------------------ */

  const descriptionPanel = (
    <section className="ws-card">
      <div className="ws-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={leftTab === "description"}
          className={`ws-tab ${leftTab === "description" ? "active" : ""}`}
          onClick={() => setLeftTab("description")}
        >
          <FileText size={14} />
          Description
        </button>
        <button
          role="tab"
          aria-selected={leftTab === "result"}
          className={`ws-tab ${leftTab === "result" ? "active" : ""}`}
          onClick={() => setLeftTab("result")}
        >
          <FlaskConical size={14} />
          Result
          {submitVerdict && (
            <span className={`ws-tab-dot ${submitVerdict.tone}`} />
          )}
        </button>
      </div>

      <div className="ws-scroll">
        {leftTab === "description" ? (
          <div className="ws-description">
            <div className="ws-title-row">
              <h1>{problem.title}</h1>
              {solved && (
                <span className="solved-badge">
                  <CheckCircle2 size={13} />
                  Solved
                </span>
              )}
            </div>

            <div className="ws-meta">
              <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
              <span>{problem.topic}</span>
            </div>

            <p className="ws-paragraph">{problem.description}</p>

            <h3>Examples</h3>
            {problem.examples.map((example, index) => (
              <div className="ws-example" key={index}>
                <strong>Example {index + 1}</strong>
                <div>
                  <b>Input:</b>{" "}
                  <code>{formatInput(problem.inputNames, example.input)}</code>
                </div>
                <div>
                  <b>Output:</b> <code>{toJson(example.expected)}</code>
                </div>
              </div>
            ))}

            {problem.constraints.length > 0 && (
              <>
                <h3>Constraints</h3>
                <ul className="ws-constraints">
                  {problem.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="ws-description">
            {!submitResponse || !submitVerdict ? (
              <div className="ws-empty">
                <FlaskConical size={22} />
                <strong>No submission yet</strong>
                <p>
                  Press <b>Submit</b> to run all {submitCases.length} test cases.
                  The result appears here.
                </p>
              </div>
            ) : (
              <>
                <div className={`ws-verdict ${submitVerdict.tone}`}>
                  {submitVerdict.tone === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                  <div>
                    <strong>{submitVerdict.label}</strong>
                    <span>
                      {submitResponse.passedCount} / {submitResponse.totalCount}{" "}
                      test cases passed
                    </span>
                  </div>
                </div>

                <div className="ws-case-rows">
                  {submitResponse.results.map((result, index) => (
                    <details
                      className="ws-case-row"
                      key={index}
                      open={
                        index ===
                        submitResponse.results.findIndex((r) => !r.passed)
                      }
                    >
                      <summary>
                        <span
                          className={`ws-pill ${result.passed ? "success" : "danger"}`}
                        >
                          {result.passed ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          Test {index + 1}
                        </span>
                        <span className="ws-case-status">
                          {statusLabel(result)}
                        </span>
                        <span className="ws-case-numbers">
                          {formatMs(result.executionTimeMs)} ·{" "}
                          {formatMemory(result.memoryBytes)}
                        </span>
                      </summary>
                      <TestCaseDetail
                        result={result}
                        inputNames={problem.inputNames}
                      />
                    </details>
                  ))}
                </div>

                <p className="ws-footnote">
                  Time and memory are measured per test case on your own device
                  (Python runs as WebAssembly in the browser), so use them to
                  compare your own attempts, not as LeetCode-style percentiles.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );

  /* ------------------------------ editor panel ----------------------------- */

  const editorPanel = (
    <section className="ws-card">
      <div className="ws-card-header">
        <h2>Code</h2>

        <div className="ws-header-actions">
          <select
            className="ws-select"
            aria-label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="python3">Python 3</option>
          </select>

          <select
            className="ws-select"
            aria-label="Theme"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as AppTheme)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <button
            className="ws-btn ws-btn-ghost"
            onClick={handleResetCode}
            title="Reset code"
          >
            <RotateCcw size={14} />
            Reset code
          </button>
        </div>
      </div>

      <div className="ws-editor">
        <CodeEditor
          value={code}
          onChange={setCode}
          theme={theme}
          onRun={() => void execute("run")}
          onSubmit={() => void execute("submit")}
        />
      </div>

      <div className="ws-editor-footer">
        <span className="ws-runtime-status">
          <span className={`status-dot ${runtimeReady ? "ready" : "loading"}`} />
          {runtimeReady ? "Python ready" : "Preparing Python…"}
        </span>

        <label
          className={`ws-switch ${ADVANCED_METRICS_UNLOCKED ? "" : "locked"}`}
          title={
            ADVANCED_METRICS_UNLOCKED
              ? `Repeats each test up to 25 times (about 0.25 s) and reports the median, min and max runtime. Slower, but steadier numbers. Each test case still has a ${
                  TEST_TIME_LIMIT_MS / 1000
                } s limit.`
              : "Premium feature"
          }
        >
          <input
            type="checkbox"
            checked={precise && ADVANCED_METRICS_UNLOCKED}
            disabled={!ADVANCED_METRICS_UNLOCKED || runningMode !== null}
            onChange={(event) => setPrecise(event.target.checked)}
          />
          <span className="ws-switch-track" />
          Precise timing
          <span className="ws-badge">
            {ADVANCED_METRICS_UNLOCKED ? (
              "Advanced"
            ) : (
              <>
                <Lock size={10} /> Premium
              </>
            )}
          </span>
        </label>

        <div className="ws-footer-buttons">
          <button
            className="ws-btn ws-btn-secondary"
            onClick={() => void execute("run")}
            disabled={runningMode !== null}
            title="Run sample tests (Ctrl+Enter)"
          >
            <Play size={14} />
            {busyLabel("run", "Run")}
          </button>
          <button
            className="ws-btn ws-btn-primary"
            onClick={() => void execute("submit")}
            disabled={runningMode !== null}
            title="Submit all tests (Ctrl+Shift+Enter)"
          >
            <Send size={14} />
            {busyLabel("submit", "Submit")}
          </button>
        </div>
      </div>
    </section>
  );

  /* ------------------------------ results panel ---------------------------- */

  const resultsPanel = (
    <section className="ws-card">
      <div className="ws-card-header">
        <h2>
          Test results <span className="ws-badge">Samples</span>
        </h2>
        {sampleResponse && (
          <span
            className={`ws-summary ${
              sampleResponse.passedCount === sampleResponse.totalCount
                ? "success"
                : "danger"
            }`}
          >
            {sampleResponse.passedCount}/{sampleResponse.totalCount} passed
          </span>
        )}
      </div>

      <div className="ws-scroll ws-results">
        {runtimeError && (
          <div className="ws-error-block">
            <strong>Runtime error</strong>
            <pre>{runtimeError}</pre>
          </div>
        )}

        {!runtimeError && runningMode === "run" && (
          <p className="ws-muted">Running sample tests…</p>
        )}

        {!runtimeError && !runningMode && !sampleResponse && (
          <p className="ws-muted">
            Press <b>Run</b> to test your code on the sample cases. Press{" "}
            <b>Submit</b> to run every test case.
          </p>
        )}

        {sampleResponse && sampleResult && (
          <>
            <div className="ws-case-tabs">
              {sampleResponse.results.map((result, index) => (
                <button
                  key={index}
                  className={`ws-case-tab ${index === selectedCase ? "active" : ""}`}
                  onClick={() => setSelectedCase(index)}
                >
                  <span
                    className={`ws-dot ${result.passed ? "success" : "danger"}`}
                  />
                  Case {index + 1}
                </button>
              ))}
            </div>

            <div className={`ws-status-line ${sampleResult.passed ? "success" : "danger"}`}>
              {statusLabel(sampleResult)}
            </div>

            <TestCaseDetail
              result={sampleResult}
              inputNames={problem.inputNames}
            />
          </>
        )}
      </div>
    </section>
  );

  /* -------------------------------- layout -------------------------------- */


  /* -------------------------------- layout -------------------------------- */

  return (
    <main className="ws-page">
      <header className="ws-topbar">
        <button className="ws-btn ws-btn-secondary" onClick={onBack}>
          <ArrowLeft size={15} />
          All problems
        </button>

        <div className="ws-topbar-nav">
          <button
            className="ws-btn ws-btn-secondary"
            disabled={!previousProblem}
            onClick={onPrevious}
            title={previousProblem ? previousProblem.title : "No previous problem"}
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <button
            className="ws-btn ws-btn-secondary"
            disabled={!nextProblem}
            onClick={onNext}
            title={nextProblem ? nextProblem.title : "No next problem"}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <div className="ws-body">
        <Group
          key={direction}
          orientation={direction}
        >
          <Panel defaultSize="42%" minSize="20%">
            {descriptionPanel}
          </Panel>

          <Separator
            className={`ws-handle ${
              direction === "horizontal"
                ? "ws-handle-col"
                : "ws-handle-row"
            }`}
          />

          <Panel defaultSize="58%" minSize="30%">
            <Group
              orientation="vertical"
            >
              <Panel defaultSize="62%" minSize="25%">
                {editorPanel}
              </Panel>

              <Separator className="ws-handle ws-handle-row" />

              <Panel defaultSize="38%" minSize="12%">
                {resultsPanel}
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </main>
  );
}
