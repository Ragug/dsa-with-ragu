import type { Problem } from "../types/problem";
import type { RunOptions } from "../runtime/pythonRuntime";

/** The whole file that runs: locked top + editable part + locked bottom. */
export function assembleCode(problem: Problem, editable: string): string {
  return `${problem.prelude ?? ""}${editable}${problem.epilogue ?? ""}`;
}

/** Everything the Python harness needs to know about this problem. */
export function buildRunOptions(problem: Problem, precise: boolean): RunOptions {
  return {
    ignoreOrder: problem.ignoreOrder,
    precise,
    paramKinds: problem.paramKinds,
    returnKind: problem.returnKind,
    listNode: problem.listNode,
    treeNode: problem.treeNode,
  };
}
