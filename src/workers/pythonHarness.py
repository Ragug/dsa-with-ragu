"""Test harness executed inside Pyodide.

Defines `run_case`, which runs ONE test case and returns a JSON string.

Measurement strategy (per test case, never aggregated):
  1. Timing pass  - only the user's function call is timed (no compile, no JSON,
                    no object building, no tracemalloc).
  2. Memory pass  - a separate call with tracemalloc, so memory tracing never
                    inflates the timing. Skipped for slow functions.
  3. Optional "precise" mode repeats the timing pass and reports the median.

Python objects (linked lists, trees)
  Test data is JSON. Before every call the harness builds real node objects
  from it, and after the call it turns the returned nodes back into JSON.
  - LeetCode style : `ListNode` / `TreeNode` are injected into the user's
                     namespace (the editor only shows them as a comment).
  - HackerRank style: the problem's own locked code defines the node class, and
                     the problem tells the harness its class and attribute names.

JSON formats
  linked list : [1, 2, 3]                        (a plain list), or
                {"values": [1, 2, 3], "pos": 1}  (tail connects to node `pos`;
                                                  -1 = no cycle)
  tree        : [1, null, 2, 3]                  (LeetCode level order)
"""

import contextlib
import io
import json
import statistics
import sys
import time
import traceback
import tracemalloc
from collections import deque

MAX_OUTPUT_CHARS = 10_000
MEMORY_PASS_MAX_MS = 400
PRECISE_MAX_RUNS = 25
PRECISE_BUDGET_SECONDS = 0.25


# --------------------------------------------------------------------------
# What a LeetCode-style problem gets for free (injected, never typed by users)
# --------------------------------------------------------------------------

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


_PREAMBLE = """
from typing import *
from collections import *
from heapq import *
from bisect import *
import collections, heapq, bisect, math, itertools, functools, re, string, random, sys
"""

_LIST_SPEC = {"cls": "ListNode", "value": "val", "next": "next"}
_TREE_SPEC = {"cls": "TreeNode", "value": "val", "left": "left", "right": "right"}


def _new_namespace():
    namespace = {"__name__": "__submission__"}
    exec(_PREAMBLE, namespace)
    namespace["ListNode"] = ListNode
    namespace["TreeNode"] = TreeNode
    return namespace


# --------------------------------------------------------------------------
# JSON <-> node objects
# --------------------------------------------------------------------------

def _node_class(namespace, name):
    cls = namespace.get(name)
    if not callable(cls):
        raise NameError("Class '" + str(name) + "' was not found.")
    return cls


def _build_list(value, spec, namespace):
    cls = _node_class(namespace, spec["cls"])
    if isinstance(value, dict):
        values, pos = value["values"], value.get("pos", -1)
    else:
        values, pos = value, -1

    nodes = [cls(item) for item in values]
    for first, second in zip(nodes, nodes[1:]):
        setattr(first, spec["next"], second)
    if nodes and pos >= 0:
        setattr(nodes[-1], spec["next"], nodes[pos])
    return (nodes[0] if nodes else None), nodes


def _build_tree(values, spec, namespace):
    if not values or values[0] is None:
        return None
    cls = _node_class(namespace, spec["cls"])
    root = cls(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            child = cls(values[i])
            setattr(node, spec["left"], child)
            queue.append(child)
        i += 1
        if i < len(values) and values[i] is not None:
            child = cls(values[i])
            setattr(node, spec["right"], child)
            queue.append(child)
        i += 1
    return root


def _check_node(node, spec, attrs):
    if not all(hasattr(node, spec[attr]) for attr in attrs):
        raise TypeError(
            "Expected a " + str(spec["cls"]) + " (or None) but the function returned "
            + type(node).__name__ + "."
        )


def _list_to_json(node, spec):
    out, seen = [], set()
    while node is not None:
        _check_node(node, spec, ("value", "next"))
        if id(node) in seen:
            raise ValueError("The returned linked list contains a cycle.")
        seen.add(id(node))
        out.append(getattr(node, spec["value"]))
        node = getattr(node, spec["next"])
    return out


def _tree_to_json(root, spec):
    out, seen, queue = [], set(), deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append(None)
            continue
        _check_node(node, spec, ("value", "left", "right"))
        if id(node) in seen:
            raise ValueError("The returned tree contains a cycle.")
        seen.add(id(node))
        out.append(getattr(node, spec["value"]))
        queue.append(getattr(node, spec["left"]))
        queue.append(getattr(node, spec["right"]))
    while out and out[-1] is None:
        out.pop()
    return out


def _node_to_index(node, nodes):
    """A returned list node, as its position in the input list (-1 for None)."""
    if node is None:
        return -1
    for index, candidate in enumerate(nodes or []):
        if candidate is node:
            return index
    raise ValueError("The returned node is not a node of the input list.")


# --------------------------------------------------------------------------
# Freeing long chains of nodes
#
# In WebAssembly, CPython frees a linked chain of objects recursively. A chain
# of a few thousand nodes overflows the (small) WebAssembly stack and kills the
# whole Python runtime. So every node structure is taken apart one node at a
# time (iteratively) BEFORE it is dropped.
# --------------------------------------------------------------------------

def _collect_nodes(start, attrs):
    """Every node reachable from `start` through `attrs` (iterative, cycle-safe)."""
    out, seen, stack = [], set(), [start]
    while stack:
        node = stack.pop()
        if node is None or id(node) in seen:
            continue
        if not any(hasattr(node, attr) for attr in attrs):
            continue
        seen.add(id(node))
        out.append(node)
        for attr in attrs:
            stack.append(getattr(node, attr, None))
    return out


class _NodeTracker:
    def __init__(self, attrs):
        self.attrs = tuple(attrs)
        self.nodes = []

    def add(self, nodes):
        if self.attrs:
            self.nodes.extend(nodes)

    def add_reachable(self, start):
        if self.attrs and start is not None:
            self.nodes.extend(_collect_nodes(start, self.attrs))

    def release(self):
        """Cut every link, so nodes are freed one by one instead of as a chain."""
        for node in self.nodes:
            for attr in self.attrs:
                try:
                    setattr(node, attr, None)
                except Exception:
                    pass
        self.nodes.clear()


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _jsonable(value):
    try:
        return json.loads(json.dumps(value))
    except (TypeError, ValueError):
        return repr(value)


def _canon(value):
    return json.dumps(value, sort_keys=True)


def _same(actual, expected, ignore_order):
    if ignore_order and isinstance(actual, list) and isinstance(expected, list):
        if len(actual) != len(expected):
            return False
        return sorted(map(_canon, actual)) == sorted(map(_canon, expected))
    return _canon(actual) == _canon(expected)


def _truncate(text):
    if len(text) > MAX_OUTPUT_CHARS:
        return text[:MAX_OUTPUT_CHARS] + chr(10) + "... output truncated"
    return text


def _format_error(exc):
    frames = [
        frame
        for frame in traceback.extract_tb(exc.__traceback__)
        if frame.filename == "<submission>"
    ][-8:]
    lines = []
    if frames:
        lines.append("Traceback (most recent call last):")
        lines.extend(line.rstrip() for line in traceback.format_list(frames))
    lines.extend(line.rstrip() for line in traceback.format_exception_only(type(exc), exc))
    return chr(10).join(lines)


def _measure_memory(fn, args):
    """Returns (peak_bytes, returned_value). The caller must release the value."""
    sink = io.StringIO()
    saved = (sys.stdout, sys.stderr)
    sys.stdout = sys.stderr = sink
    tracemalloc.start()
    try:
        returned = fn(*args)
        return tracemalloc.get_traced_memory()[1], returned
    finally:
        tracemalloc.stop()
        sys.stdout, sys.stderr = saved


def run_case(code, function_name, input_json, expected_json, options_json):
    options = json.loads(options_json)
    ignore_order = bool(options.get("ignoreOrder", False))
    precise = bool(options.get("precise", False))
    param_kinds = options.get("paramKinds") or []
    return_kind = options.get("returnKind") or "json"
    list_spec = options.get("listNode") or _LIST_SPEC
    tree_spec = options.get("treeNode") or _TREE_SPEC

    link_attrs = []
    if "linked_list" in param_kinds or return_kind in ("linked_list", "list_node_index"):
        link_attrs.append(list_spec["next"])
    if "tree" in param_kinds or return_kind == "tree":
        link_attrs.extend([tree_spec["left"], tree_spec["right"]])
    tracker = _NodeTracker(link_attrs)

    result = {
        "status": "failed",
        "passed": False,
        "actual": None,
        "stdout": "",
        "stderr": "",
        "error": None,
        "executionTimeMs": None,
        "memoryBytes": None,
        "timeStats": None,
    }
    stdout = io.StringIO()
    stderr = io.StringIO()

    try:
        namespace = _new_namespace()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(compile(code, "<submission>", "exec"), namespace)

        fn = namespace.get(function_name)
        if not callable(fn):
            raise NameError("Function '" + function_name + "' was not defined.")

        expected = json.loads(expected_json)

        def make_args():
            """Fresh arguments for every call (also copes with in-place edits)."""
            raw = json.loads(input_json)
            args, first_list_nodes = [], None
            for index, value in enumerate(raw):
                kind = param_kinds[index] if index < len(param_kinds) else "json"
                if kind == "linked_list":
                    head, nodes = _build_list(value, list_spec, namespace)
                    tracker.add(nodes)
                    if first_list_nodes is None:
                        first_list_nodes = nodes
                    args.append(head)
                elif kind == "tree":
                    root = _build_tree(value, tree_spec, namespace)
                    tracker.add_reachable(root)
                    args.append(root)
                else:
                    args.append(value)
            return args, first_list_nodes

        # Pass 1: time ONLY the function call.
        call_args, list_nodes = make_args()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            started = time.perf_counter()
            actual = fn(*call_args)
            first_ms = (time.perf_counter() - started) * 1000

        # Turn the answer into JSON now, then take the nodes apart.
        tracker.add_reachable(actual)
        if return_kind == "linked_list":
            actual_json = _list_to_json(actual, list_spec)
        elif return_kind == "tree":
            actual_json = _tree_to_json(actual, tree_spec)
        elif return_kind == "list_node_index":
            actual_json = _node_to_index(actual, list_nodes)
        else:
            actual_json = _jsonable(actual)
        tracker.release()

        samples = [first_ms]
        if precise:
            sink = io.StringIO()
            deadline = time.perf_counter() + PRECISE_BUDGET_SECONDS
            while len(samples) < PRECISE_MAX_RUNS and time.perf_counter() < deadline:
                call_args, _ = make_args()
                with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                    started = time.perf_counter()
                    returned = fn(*call_args)
                    samples.append((time.perf_counter() - started) * 1000)
                sink.seek(0)
                sink.truncate(0)
                tracker.add_reachable(returned)
                tracker.release()
                returned = None

        median_ms = statistics.median(samples)
        result["executionTimeMs"] = median_ms
        result["timeStats"] = {
            "runs": len(samples),
            "medianMs": median_ms,
            "minMs": min(samples),
            "maxMs": max(samples),
        }

        # Pass 2: memory, in a separate call so tracing never slows pass 1.
        if first_ms < MEMORY_PASS_MAX_MS:
            peak, returned = _measure_memory(fn, make_args()[0])
            result["memoryBytes"] = peak
            tracker.add_reachable(returned)
            tracker.release()
            returned = None

        result["actual"] = actual_json
        result["passed"] = _same(actual_json, expected, ignore_order)
        result["status"] = "passed" if result["passed"] else "failed"

    except BaseException as exc:  # includes SystemExit from exit()
        result["status"] = "error"
        result["passed"] = False
        result["error"] = _format_error(exc)
    finally:
        if tracemalloc.is_tracing():
            tracemalloc.stop()
        tracker.release()

    result["stdout"] = _truncate(stdout.getvalue())
    result["stderr"] = _truncate(stderr.getvalue())
    return json.dumps(result)
