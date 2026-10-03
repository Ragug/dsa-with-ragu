export type TestCase = {
  input: unknown[];
  expected: unknown;
};

export type Problem = {
  id: string;
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  /** Sample cases: shown in the description and used by the "Run" button. */
  examples: TestCase[];
  /** Full case list used by "Submit". Falls back to `examples` if omitted. */
  tests?: TestCase[];
  functionName: string;
  /** Parameter names, shown in results as `nums = [...]`. */
  inputNames?: string[];
  /** Accept the answer in any order (e.g. Two Sum returning [1, 0]). */
  ignoreOrder?: boolean;
  constraints: string[];
  starterCode: string;
  completed?: boolean;
};
