"""Test harness executed inside Pyodide.

Defines `run_case`, which runs ONE test case and returns a JSON string.

Measurement strategy (per test case, never aggregated):
  1. Timing pass  - only the user's function call is timed (no compile, no JSON,
                    no tracemalloc), using a deep-copied copy of the input.
  2. Memory pass  - a separate call with tracemalloc, so memory tracing never
                    inflates the timing. Skipped for very slow functions.
  3. Optional "precise" mode repeats the timing pass and reports the median.
"""

import contextlib
import copy
import io
import json
import statistics
import sys
import time
import traceback
import tracemalloc

MAX_OUTPUT_CHARS = 10_000
MEMORY_PASS_MAX_MS = 1_000
PRECISE_MAX_RUNS = 25
PRECISE_BUDGET_SECONDS = 0.25


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
    sink = io.StringIO()
    saved = (sys.stdout, sys.stderr)
    sys.stdout = sys.stderr = sink
    tracemalloc.start()
    try:
        fn(*args)
        return tracemalloc.get_traced_memory()[1]
    finally:
        tracemalloc.stop()
        sys.stdout, sys.stderr = saved


def run_case(code, function_name, input_json, expected_json, options_json):
    options = json.loads(options_json)
    ignore_order = bool(options.get("ignoreOrder", False))
    precise = bool(options.get("precise", False))

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
        namespace = {"__name__": "__submission__"}
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(compile(code, "<submission>", "exec"), namespace)

        fn = namespace.get(function_name)
        if not callable(fn):
            raise NameError("Function '" + function_name + "' was not defined.")

        args = json.loads(input_json)
        expected = json.loads(expected_json)

        # Pass 1: time ONLY the function call.
        call_args = copy.deepcopy(args)
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            started = time.perf_counter()
            actual = fn(*call_args)
            first_ms = (time.perf_counter() - started) * 1000

        samples = [first_ms]
        if precise:
            sink = io.StringIO()
            deadline = time.perf_counter() + PRECISE_BUDGET_SECONDS
            while len(samples) < PRECISE_MAX_RUNS and time.perf_counter() < deadline:
                call_args = copy.deepcopy(args)
                with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                    started = time.perf_counter()
                    fn(*call_args)
                    samples.append((time.perf_counter() - started) * 1000)
                sink.seek(0)
                sink.truncate(0)

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
            result["memoryBytes"] = _measure_memory(fn, copy.deepcopy(args))

        actual_json = _jsonable(actual)
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

    result["stdout"] = _truncate(stdout.getvalue())
    result["stderr"] = _truncate(stderr.getvalue())
    return json.dumps(result)
