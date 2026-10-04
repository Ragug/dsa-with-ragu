export type TestCase = {
  input: unknown[];
  expected: unknown;
};

/**
 * How a test-case argument is turned into a Python value before the call.
 *  json        - passed as is (numbers, strings, lists, ...)
 *  linked_list - JSON `[1, 2, 3]`, or `{ "values": [...], "pos": 1 }` for a
 *                list whose tail connects to node `pos` (-1 = no cycle).
 *                The function receives the head node (or None).
 *  tree        - LeetCode level order `[1, null, 2]`. The function receives
 *                the root node (or None).
 */
export type ParamKind = "json" | "linked_list" | "tree";

/**
 * How the returned Python value is turned back into JSON for comparing.
 *  linked_list     - a returned head node  -> `[1, 2, 3]`
 *  tree            - a returned root node  -> level order list
 *  list_node_index - a returned node of the first linked-list argument
 *                    -> its index (-1 for None). Like LeetCode's
 *                    "tail connects to node index".
 */
export type ReturnKind = "json" | "linked_list" | "tree" | "list_node_index";

export type ListNodeSpec = { cls: string; value: string; next: string };
export type TreeNodeSpec = {
  cls: string;
  value: string;
  left: string;
  right: string;
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
  /** The editable part of the editor. */
  starterCode: string;

  /* ---- Python objects (linked lists, trees) ---- */

  /** One entry per parameter. Omit when every argument is plain JSON. */
  paramKinds?: ParamKind[];
  returnKind?: ReturnKind;
  /** Node class used for `linked_list` values. Default: LeetCode `ListNode`. */
  listNode?: ListNodeSpec;
  /** Node class used for `tree` values. Default: LeetCode `TreeNode`. */
  treeNode?: TreeNodeSpec;

  /* ---- HackerRank style: locked code around the editable part ---- */

  /** Read-only code shown above `starterCode` (e.g. the node class). */
  prelude?: string;
  /** Read-only code shown below `starterCode`. */
  epilogue?: string;

  completed?: boolean;
};
