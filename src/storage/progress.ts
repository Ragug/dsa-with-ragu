export type AppTheme = "system" | "light" | "dark";

type ProblemProgress = {
  code?: string;
  solved?: boolean;
};

type ProgressStore = Record<string, ProblemProgress>;

const PROGRESS_KEY = "dsa-with-ragu:progress";
const THEME_KEY = "dsa-with-ragu:theme";
const PRECISE_TIMING_KEY = "dsa-with-ragu:precise-timing";

function readStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
}

export function getSavedCode(
  problemId: string,
  fallback: string,
): string {
  return readStore()[problemId]?.code ?? fallback;
}

export function saveCode(problemId: string, code: string): void {
  const store = readStore();

  store[problemId] = {
    ...store[problemId],
    code,
  };

  writeStore(store);
}

export function isProblemSolved(problemId: string): boolean {
  return readStore()[problemId]?.solved === true;
}

export function markProblemSolved(problemId: string): void {
  const store = readStore();

  store[problemId] = {
    ...store[problemId],
    solved: true,
  };

  writeStore(store);
}

export function readProgress(): ProgressStore {
  return readStore();
}

export function resetAllProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

export function readTheme(): AppTheme {
  const theme = localStorage.getItem(THEME_KEY);

  if (theme === "light" || theme === "dark" || theme === "system") {
    return theme;
  }

  return "system";
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function readPreciseTiming(): boolean {
  return localStorage.getItem(PRECISE_TIMING_KEY) === "true";
}

export function savePreciseTiming(enabled: boolean): void {
  localStorage.setItem(PRECISE_TIMING_KEY, String(enabled));
}
