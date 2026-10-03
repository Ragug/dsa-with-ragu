import type { Problem } from "../types/problem";

/**
 * Test data is deterministic so results are reproducible.
 * Large cases are intentionally bounded for browser-based Python/WASM execution.
 */
const range = (length: number, start = 0): number[] =>
  Array.from({ length }, (_, index) => start + index);

const reversedRange = (length: number): number[] =>
  Array.from({ length }, (_, index) => length - index);

const alternating = (length: number): number[] =>
  Array.from({ length }, (_, index) => (index % 2 === 0 ? index : -index));

const sortedRange = (length: number): number[] => range(length);

const expectedSortedAlternating = (length: number): number[] =>
  alternating(length).sort((a, b) => a - b);

export const problems: Problem[] = [
  // ---------------------------------------------------------------------------
  // ARRAYS AND SEARCHING
  // ---------------------------------------------------------------------------
  {
    id: "two-sum",
    title: "Two Sum",
    topic: "Arrays",
    difficulty: "Easy",
    functionName: "two_sum",
    inputNames: ["nums", "target"],
    ignoreOrder: true,
    description:
      "Given an integer array nums and an integer target, return the indices of two distinct elements whose values add up to target. Exactly one solution exists.",
    examples: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3] },
      { input: [[-10, 5, 20, 7], -3], expected: [0, 3] },
      {
        input: [range(9999, 1).concat([10000]), 19999],
        expected: [9998, 9999],
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i], target <= 10^9",
      "Exactly one valid answer exists.",
      "You cannot use the same element twice.",
      "Expected time: O(n); expected extra space: O(n).",
    ],
    starterCode: "def two_sum(nums, target):\n    # Return the two indices\n    pass",
  },
  {
    id: "linear-search",
    title: "Linear Search",
    topic: "Searching",
    difficulty: "Easy",
    functionName: "linear_search",
    inputNames: ["nums", "target"],
    description:
      "Return the index of the first occurrence of target in nums, or -1 if it is absent. Use a sequential scan.",
    examples: [
      { input: [[4, 2, 7, 1], 7], expected: 2 },
      { input: [[4, 2, 7, 1], 9], expected: -1 },
    ],
    tests: [
      { input: [[4, 2, 7, 1], 7], expected: 2 },
      { input: [[4, 2, 7, 1], 9], expected: -1 },
      { input: [[5], 5], expected: 0 },
      { input: [[5], 1], expected: -1 },
      { input: [[2, 3, 2, 4], 2], expected: 0 },
      { input: [range(10000), 9999], expected: 9999 },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "Return the first matching index.",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def linear_search(nums, target):\n    # Return the first matching index, or -1\n    pass",
  },
  {
    id: "binary-search",
    title: "Binary Search",
    topic: "Searching",
    difficulty: "Easy",
    functionName: "search",
    inputNames: ["nums", "target"],
    description:
      "Given a sorted array of unique integers, return the index of target or -1 if it is absent. Use binary search.",
    examples: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
    ],
    tests: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { input: [[5], 5], expected: 0 },
      { input: [[5], -5], expected: -1 },
      { input: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { input: [[1, 3, 5, 7, 9], 9], expected: 4 },
      { input: [sortedRange(100000), 87654], expected: 87654 },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "nums is sorted in ascending order and contains unique values.",
      "Expected time: O(log n); extra space: O(1).",
    ],
    starterCode: "def search(nums, target):\n    # Implement binary search\n    pass",
  },
  {
    id: "jump-search",
    title: "Jump Search",
    topic: "Searching",
    difficulty: "Easy",
    functionName: "jump_search",
    inputNames: ["nums", "target"],
    description:
      "Given a sorted array of unique integers, return the index of target or -1. Jump ahead by approximately the square root of the array length, then linearly scan the candidate block.",
    examples: [
      { input: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 7], expected: 7 },
      { input: [[0, 1, 2, 3, 4], 8], expected: -1 },
    ],
    tests: [
      { input: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 7], expected: 7 },
      { input: [[0, 1, 2, 3, 4], 8], expected: -1 },
      { input: [[10], 10], expected: 0 },
      { input: [[10], 9], expected: -1 },
      { input: [sortedRange(10000), 8765], expected: 8765 },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "nums is sorted in ascending order and contains unique values.",
      "Expected time: O(sqrt(n)); extra space: O(1).",
    ],
    starterCode: "def jump_search(nums, target):\n    # Implement jump search\n    pass",
  },
  {
    id: "interpolation-search",
    title: "Interpolation Search",
    topic: "Searching",
    difficulty: "Medium",
    functionName: "interpolation_search",
    inputNames: ["nums", "target"],
    description:
      "Search a sorted array of unique integers and return target's index, or -1. Estimate the likely position from the target's value. Handle arrays whose first and last values are equal without division by zero.",
    examples: [
      { input: [[10, 20, 30, 40, 50], 30], expected: 2 },
      { input: [[10, 20, 30, 40, 50], 35], expected: -1 },
    ],
    tests: [
      { input: [[10, 20, 30, 40, 50], 30], expected: 2 },
      { input: [[10, 20, 30, 40, 50], 35], expected: -1 },
      { input: [[7], 7], expected: 0 },
      { input: [[7], 8], expected: -1 },
      { input: [[5, 5, 5], 5], expected: 0 },
      { input: [range(10000), 7654], expected: 7654 },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "nums is sorted in non-decreasing order.",
      "Expected average time on uniform data: O(log log n); worst case: O(n).",
      "Extra space: O(1).",
    ],
    starterCode: "def interpolation_search(nums, target):\n    # Implement interpolation search\n    pass",
  },
  {
    id: "exponential-search",
    title: "Exponential Search",
    topic: "Searching",
    difficulty: "Medium",
    functionName: "exponential_search",
    inputNames: ["nums", "target"],
    description:
      "Given a sorted array of unique integers, find target's index or return -1. Expand a search range by doubling its bound, then use binary search within that range.",
    examples: [
      { input: [[2, 3, 4, 10, 40], 10], expected: 3 },
      { input: [[2, 3, 4, 10, 40], 11], expected: -1 },
    ],
    tests: [
      { input: [[2, 3, 4, 10, 40], 10], expected: 3 },
      { input: [[2, 3, 4, 10, 40], 11], expected: -1 },
      { input: [[5], 5], expected: 0 },
      { input: [[5], 1], expected: -1 },
      { input: [sortedRange(100000), 99999], expected: 99999 },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "nums is sorted in ascending order and contains unique values.",
      "Expected time: O(log n); extra space: O(1).",
    ],
    starterCode: "def exponential_search(nums, target):\n    # Find a range, then binary search it\n    pass",
  },

  // ---------------------------------------------------------------------------
  // SORTING AND SELECTION
  // ---------------------------------------------------------------------------
  {
    id: "bubble-sort",
    title: "Bubble Sort",
    topic: "Sorting",
    difficulty: "Easy",
    functionName: "bubble_sort",
    inputNames: ["nums"],
    description:
      "Return the array sorted in ascending order using bubble sort. Stop early if a full pass makes no swaps.",
    examples: [
      { input: [[5, 1, 4, 2, 8]], expected: [1, 2, 4, 5, 8] },
      { input: [[3, 2, 1]], expected: [1, 2, 3] },
    ],
    tests: [
      { input: [[5, 1, 4, 2, 8]], expected: [1, 2, 4, 5, 8] },
      { input: [[3, 2, 1]], expected: [1, 2, 3] },
      { input: [[1]], expected: [1] },
      { input: [[2, 2, 1, 1]], expected: [1, 1, 2, 2] },
      { input: [range(1000)], expected: range(1000) },
    ],
    constraints: [
      "1 <= nums.length <= 1000",
      "Expected worst-case time: O(n^2); best-case with early exit: O(n).",
      "Extra space: O(1) if sorted in place.",
    ],
    starterCode: "def bubble_sort(nums):\n    # Sort in ascending order\n    pass",
  },
  {
    id: "selection-sort",
    title: "Selection Sort",
    topic: "Sorting",
    difficulty: "Easy",
    functionName: "selection_sort",
    inputNames: ["nums"],
    description:
      "Sort the integers in ascending order using selection sort by repeatedly selecting the minimum remaining value.",
    examples: [
      { input: [[64, 25, 12, 22, 11]], expected: [11, 12, 22, 25, 64] },
      { input: [[3, 1, 2]], expected: [1, 2, 3] },
    ],
    tests: [
      { input: [[64, 25, 12, 22, 11]], expected: [11, 12, 22, 25, 64] },
      { input: [[3, 1, 2]], expected: [1, 2, 3] },
      { input: [[1]], expected: [1] },
      { input: [[2, 2, -1, 0]], expected: [-1, 0, 2, 2] },
      { input: [reversedRange(500)], expected: range(500, 1) },
    ],
    constraints: [
      "1 <= nums.length <= 500",
      "Expected time: O(n^2); extra space: O(1) if sorted in place.",
    ],
    starterCode: "def selection_sort(nums):\n    # Sort in ascending order\n    pass",
  },
  {
    id: "insertion-sort",
    title: "Insertion Sort",
    topic: "Sorting",
    difficulty: "Easy",
    functionName: "insertion_sort",
    inputNames: ["nums"],
    description:
      "Sort integers in ascending order using insertion sort, maintaining a sorted prefix as you process each value.",
    examples: [
      { input: [[5, 2, 4, 6, 1, 3]], expected: [1, 2, 3, 4, 5, 6] },
      { input: [[1, 2, 3]], expected: [1, 2, 3] },
    ],
    tests: [
      { input: [[5, 2, 4, 6, 1, 3]], expected: [1, 2, 3, 4, 5, 6] },
      { input: [[1, 2, 3]], expected: [1, 2, 3] },
      { input: [[3, 3, 2, 1]], expected: [1, 2, 3, 3] },
      { input: [[-3, 0, -1, 5]], expected: [-3, -1, 0, 5] },
      { input: [range(1000)], expected: range(1000) },
    ],
    constraints: [
      "1 <= nums.length <= 1000",
      "Expected worst-case time: O(n^2); best-case time: O(n).",
      "Extra space: O(1) if sorted in place.",
    ],
    starterCode: "def insertion_sort(nums):\n    # Sort in ascending order\n    pass",
  },
  {
    id: "merge-sort",
    title: "Merge Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "merge_sort",
    inputNames: ["nums"],
    description:
      "Return the integers sorted in ascending order using merge sort. Aim for O(n log n) time.",
    examples: [
      { input: [[5, 2, 3, 1]], expected: [1, 2, 3, 5] },
      { input: [[5, 1, 1, 2, 0, 0]], expected: [0, 0, 1, 1, 2, 5] },
    ],
    tests: [
      { input: [[5, 2, 3, 1]], expected: [1, 2, 3, 5] },
      { input: [[5, 1, 1, 2, 0, 0]], expected: [0, 0, 1, 1, 2, 5] },
      { input: [[1]], expected: [1] },
      { input: [[3, 2, 1]], expected: [1, 2, 3] },
      { input: [[-5, 3, 0, -1, 2]], expected: [-5, -1, 0, 2, 3] },
      { input: [[2, 2, 2, 2]], expected: [2, 2, 2, 2] },
      {
        input: [alternating(50000)],
        expected: expectedSortedAlternating(50000),
      },
    ],
    constraints: [
      "1 <= nums.length <= 50000",
      "-50000 <= nums[i] <= 50000",
      "Expected time: O(n log n); extra space: O(n).",
    ],
    starterCode: "def merge_sort(nums):\n    # Return a sorted list\n    pass",
  },
  {
    id: "quick-sort",
    title: "Quick Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "quick_sort",
    inputNames: ["nums"],
    description:
      "Return the integers sorted in ascending order using quick sort. Choose pivots carefully or use an iterative/randomized strategy to avoid recursion-depth failures on sorted input.",
    examples: [
      { input: [[10, 7, 8, 9, 1, 5]], expected: [1, 5, 7, 8, 9, 10] },
      { input: [[3, 3, 2, 1]], expected: [1, 2, 3, 3] },
    ],
    tests: [
      { input: [[10, 7, 8, 9, 1, 5]], expected: [1, 5, 7, 8, 9, 10] },
      { input: [[3, 3, 2, 1]], expected: [1, 2, 3, 3] },
      { input: [[1]], expected: [1] },
      { input: [[-4, 0, 9, -4, 2]], expected: [-4, -4, 0, 2, 9] },
      { input: [reversedRange(50000)], expected: range(50000, 1) },
    ],
    constraints: [
      "1 <= nums.length <= 50000",
      "Expected average time: O(n log n); worst case: O(n^2).",
      "Avoid unbounded recursion on already sorted or reverse-sorted input.",
    ],
    starterCode: "def quick_sort(nums):\n    # Return a sorted list\n    pass",
  },
  {
    id: "heap-sort",
    title: "Heap Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "heap_sort",
    inputNames: ["nums"],
    description:
      "Sort integers in ascending order using heap sort. Return the sorted list.",
    examples: [
      { input: [[12, 11, 13, 5, 6, 7]], expected: [5, 6, 7, 11, 12, 13] },
      { input: [[4, 10, 3, 5, 1]], expected: [1, 3, 4, 5, 10] },
    ],
    tests: [
      { input: [[12, 11, 13, 5, 6, 7]], expected: [5, 6, 7, 11, 12, 13] },
      { input: [[4, 10, 3, 5, 1]], expected: [1, 3, 4, 5, 10] },
      { input: [[1]], expected: [1] },
      { input: [[2, 2, -1, 0]], expected: [-1, 0, 2, 2] },
      { input: [alternating(50000)], expected: expectedSortedAlternating(50000) },
    ],
    constraints: [
      "1 <= nums.length <= 50000",
      "Expected time: O(n log n); extra space: O(1) for an in-place implementation.",
    ],
    starterCode: "def heap_sort(nums):\n    # Return a sorted list\n    pass",
  },
  {
    id: "counting-sort",
    title: "Counting Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "counting_sort",
    inputNames: ["nums"],
    description:
      "Sort integers in ascending order using counting sort. The input values are bounded, including negative values.",
    examples: [
      { input: [[4, 2, 2, 8, 3, 3, 1]], expected: [1, 2, 2, 3, 3, 4, 8] },
      { input: [[-2, 5, -2, 0]], expected: [-2, -2, 0, 5] },
    ],
    tests: [
      { input: [[4, 2, 2, 8, 3, 3, 1]], expected: [1, 2, 2, 3, 3, 4, 8] },
      { input: [[-2, 5, -2, 0]], expected: [-2, -2, 0, 5] },
      { input: [[0]], expected: [0] },
      { input: [[3, 3, 3]], expected: [3, 3, 3] },
      { input: [alternating(10000)], expected: expectedSortedAlternating(10000) },
    ],
    constraints: [
      "1 <= nums.length <= 10000",
      "-10000 <= nums[i] <= 10000",
      "Expected time: O(n + k), where k is the value range; extra space: O(k).",
    ],
    starterCode: "def counting_sort(nums):\n    # Support negative values too\n    pass",
  },
  {
    id: "radix-sort",
    title: "Radix Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "radix_sort",
    inputNames: ["nums"],
    description:
      "Sort integers in ascending order using radix sort. Support negative and non-negative integers.",
    examples: [
      { input: [[170, 45, 75, 90, 802, 24, 2, 66]], expected: [2, 24, 45, 66, 75, 90, 170, 802] },
      { input: [[-5, 3, -10, 0]], expected: [-10, -5, 0, 3] },
    ],
    tests: [
      { input: [[170, 45, 75, 90, 802, 24, 2, 66]], expected: [2, 24, 45, 66, 75, 90, 170, 802] },
      { input: [[-5, 3, -10, 0]], expected: [-10, -5, 0, 3] },
      { input: [[0]], expected: [0] },
      { input: [[5, 5, -5, -5]], expected: [-5, -5, 5, 5] },
      { input: [alternating(10000)], expected: expectedSortedAlternating(10000) },
    ],
    constraints: [
      "1 <= nums.length <= 10000",
      "-10^6 <= nums[i] <= 10^6",
      "Expected time: O(d(n + b)), where d is digit count and b is the base.",
    ],
    starterCode: "def radix_sort(nums):\n    # Support negative and non-negative integers\n    pass",
  },
  {
    id: "bucket-sort",
    title: "Bucket Sort",
    topic: "Sorting",
    difficulty: "Medium",
    functionName: "bucket_sort",
    inputNames: ["nums"],
    description:
      "Sort the given real numbers in ascending order using bucket sort. Values are in the inclusive range [0, 1].",
    examples: [
      { input: [[0.42, 0.32, 0.33, 0.52, 0.37, 0.47, 0.51]], expected: [0.32, 0.33, 0.37, 0.42, 0.47, 0.51, 0.52] },
      { input: [[0.5, 0.1, 0.9]], expected: [0.1, 0.5, 0.9] },
    ],
    tests: [
      { input: [[0.42, 0.32, 0.33, 0.52, 0.37, 0.47, 0.51]], expected: [0.32, 0.33, 0.37, 0.42, 0.47, 0.51, 0.52] },
      { input: [[0.5, 0.1, 0.9]], expected: [0.1, 0.5, 0.9] },
      { input: [[0.0, 1.0, 0.5]], expected: [0.0, 0.5, 1.0] },
      { input: [[0.25, 0.25, 0.25]], expected: [0.25, 0.25, 0.25] },
      { input: [range(1000).map((n) => n / 999)], expected: range(1000).map((n) => n / 999) },
    ],
    constraints: [
      "1 <= nums.length <= 1000",
      "0.0 <= nums[i] <= 1.0",
      "Expected average time: O(n + k) with a suitable distribution; extra space: O(n + k).",
    ],
    starterCode: "def bucket_sort(nums):\n    # Return a sorted list of floats\n    pass",
  },
  {
    id: "quick-select",
    title: "Quick Select",
    topic: "Arrays",
    difficulty: "Medium",
    functionName: "quick_select",
    inputNames: ["nums", "k"],
    description:
      "Return the kth smallest element in nums using quick select. k is 1-indexed. Do not fully sort the array unless needed for a fallback.",
    examples: [
      { input: [[3, 2, 1, 5, 6, 4], 2], expected: 2 },
      { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 3 },
    ],
    tests: [
      { input: [[3, 2, 1, 5, 6, 4], 2], expected: 2 },
      { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 3 },
      { input: [[1], 1], expected: 1 },
      { input: [[-5, -1, -10, 0], 2], expected: -5 },
      { input: [alternating(10000), 5000], expected: expectedSortedAlternating(10000)[4999] },
    ],
    constraints: [
      "1 <= k <= nums.length <= 10000",
      "Expected average time: O(n); worst case: O(n^2).",
      "Duplicates are allowed.",
    ],
    starterCode: "def quick_select(nums, k):\n    # Return the kth smallest value (k is 1-indexed)\n    pass",
  },

  // ---------------------------------------------------------------------------
  // ARRAY TECHNIQUES
  // ---------------------------------------------------------------------------
  {
    id: "prefix-sum",
    title: "Prefix Sum",
    topic: "Arrays",
    difficulty: "Easy",
    functionName: "prefix_sum",
    inputNames: ["nums"],
    description:
      "Return an array where each position i contains the sum of nums from index 0 through i.",
    examples: [
      { input: [[1, 2, 3, 4]], expected: [1, 3, 6, 10] },
      { input: [[2, 4, 6]], expected: [2, 6, 12] },
    ],
    tests: [
      { input: [[1, 2, 3, 4]], expected: [1, 3, 6, 10] },
      { input: [[2, 4, 6]], expected: [2, 6, 12] },
      { input: [[-1, 5, -2]], expected: [-1, 4, 2] },
      { input: [[0]], expected: [0] },
      { input: [range(100000, 1)], expected: range(100000, 1).map((n) => (n * (n + 1)) / 2) },
    ],
    constraints: [
      "1 <= nums.length <= 100000",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def prefix_sum(nums):\n    # Return cumulative sums\n    pass",
  },
  {
    id: "suffix-sum",
    title: "Suffix Sum",
    topic: "Arrays",
    difficulty: "Easy",
    functionName: "suffix_sum",
    inputNames: ["nums"],
    description:
      "Return an array where each position i contains the sum of nums from index i through the last element.",
    examples: [
      { input: [[1, 2, 3, 4]], expected: [10, 9, 7, 4] },
      { input: [[2, 4, 6]], expected: [12, 10, 6] },
    ],
    tests: [
      { input: [[1, 2, 3, 4]], expected: [10, 9, 7, 4] },
      { input: [[2, 4, 6]], expected: [12, 10, 6] },
      { input: [[-1, 5, -2]], expected: [2, 7, -2] },
      { input: [[0]], expected: [0] },
      { input: [range(100000, 1)], expected: range(100000, 1).map((_, i, arr) => ((arr.length - i) * (arr.length - i + 1)) / 2) },
    ],
    constraints: [
      "1 <= nums.length <= 100000",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def suffix_sum(nums):\n    # Return cumulative sums from right to left\n    pass",
  },
  {
    id: "difference-array",
    title: "Difference Array",
    topic: "Arrays",
    difficulty: "Medium",
    functionName: "apply_range_updates",
    inputNames: ["nums", "updates"],
    description:
      "Each update is [left, right, delta] and adds delta to every element in the inclusive index range [left, right]. Apply all updates efficiently using a difference array and return the final array.",
    examples: [
      { input: [[0, 0, 0, 0, 0], [[1, 3, 2], [2, 4, 3], [0, 2, -2]]], expected: [-2, 0, 3, 5, 3] },
    ],
    tests: [
      { input: [[0, 0, 0, 0, 0], [[1, 3, 2], [2, 4, 3], [0, 2, -2]]], expected: [-2, 0, 3, 5, 3] },
      { input: [[1, 2, 3], []], expected: [1, 2, 3] },
      { input: [[0, 0, 0], [[0, 2, 5]]], expected: [5, 5, 5] },
      { input: [[0, 0, 0, 0], [[1, 1, 7], [2, 3, -1]]], expected: [0, 7, -1, -1] },
    ],
    constraints: [
      "1 <= nums.length <= 100000",
      "0 <= updates.length <= 100000",
      "Each update satisfies 0 <= left <= right < nums.length.",
      "Expected time: O(n + q); extra space: O(n), where q is the number of updates.",
    ],
    starterCode: "def apply_range_updates(nums, updates):\n    # Each update is [left, right, delta]\n    pass",
  },
  {
    id: "maximum-subarray",
    title: "Maximum Subarray",
    topic: "Dynamic Programming",
    difficulty: "Medium",
    functionName: "max_subarray",
    inputNames: ["nums"],
    description:
      "Return the largest possible sum of a non-empty contiguous subarray.",
    examples: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
    ],
    tests: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
      { input: [[-1, -2, -3, -4]], expected: -1 },
      { input: [[-2, -1]], expected: -1 },
      { input: [[0, 0, 0]], expected: 0 },
      { input: [Array(100000).fill(1)], expected: 100000 },
    ],
    constraints: [
      "1 <= nums.length <= 100000",
      "-10000 <= nums[i] <= 10000",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def max_subarray(nums):\n    # Use Kadane's algorithm\n    pass",
  },
  {
    id: "dutch-national-flag",
    title: "Dutch National Flag",
    topic: "Arrays",
    difficulty: "Medium",
    functionName: "sort_colors",
    inputNames: ["nums"],
    description:
      "Sort an array containing only 0, 1, and 2 in-place using a three-way partition. Return the sorted array.",
    examples: [
      { input: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { input: [[2, 0, 1]], expected: [0, 1, 2] },
    ],
    tests: [
      { input: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { input: [[2, 0, 1]], expected: [0, 1, 2] },
      { input: [[0]], expected: [0] },
      { input: [[2, 2, 2]], expected: [2, 2, 2] },
      { input: [Array.from({ length: 10000 }, (_, i) => i % 3).reverse()], expected: Array.from({ length: 10000 }, (_, i) => i % 3).sort((a, b) => a - b) },
    ],
    constraints: [
      "1 <= nums.length <= 10000",
      "nums[i] is 0, 1, or 2.",
      "Expected time: O(n); extra space: O(1) for in-place partitioning.",
    ],
    starterCode: "def sort_colors(nums):\n    # Return nums sorted using three pointers\n    pass",
  },
  {
    id: "majority-element",
    title: "Boyer-Moore Majority Vote",
    topic: "Arrays",
    difficulty: "Easy",
    functionName: "majority_element",
    inputNames: ["nums"],
    description:
      "Given an array in which a majority element is guaranteed to exist, return the element appearing more than floor(n / 2) times. Use Boyer-Moore majority vote.",
    examples: [
      { input: [[3, 2, 3]], expected: 3 },
      { input: [[2, 2, 1, 1, 1, 2, 2]], expected: 2 },
    ],
    tests: [
      { input: [[3, 2, 3]], expected: 3 },
      { input: [[2, 2, 1, 1, 1, 2, 2]], expected: 2 },
      { input: [[1]], expected: 1 },
      { input: [[-1, -1, 2, -1]], expected: -1 },
      { input: [Array(10000).fill(7).concat(range(5000))], expected: 7 },
    ],
    constraints: [
      "1 <= nums.length <= 15000",
      "A majority element is guaranteed to exist.",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def majority_element(nums):\n    # Use Boyer-Moore majority vote\n    pass",
  },
  {
    id: "two-pointers",
    title: "Two Pointer Technique",
    topic: "Two Pointers",
    difficulty: "Easy",
    functionName: "two_sum_sorted",
    inputNames: ["nums", "target"],
    description:
      "Given a sorted array of integers, return the 0-based indices of two distinct values whose sum equals target. Exactly one solution exists. Use two pointers.",
    examples: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[1, 2, 3, 4, 6], 6], expected: [1, 3] },
    ],
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[1, 2, 3, 4, 6], 6], expected: [1, 3] },
      { input: [[-5, -2, 0, 3, 8], 1], expected: [1, 3] },
      { input: [[1, 1], 2], expected: [0, 1] },
      { input: [range(100000), 199997], expected: [99998, 99999] },
    ],
    constraints: [
      "2 <= nums.length <= 100000",
      "nums is sorted in non-decreasing order.",
      "Exactly one solution exists.",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def two_sum_sorted(nums, target):\n    # Return the two 0-based indices\n    pass",
  },

  // ---------------------------------------------------------------------------
  // LINKED-LIST-STYLE EXERCISES
  // These use Python lists because that is the current platform interface.
  // ---------------------------------------------------------------------------
  {
    id: "reverse-linked-list",
    title: "Reverse Linked List",
    topic: "Linked List",
    difficulty: "Easy",
    functionName: "reverse_list",
    inputNames: ["head"],
    description:
      "For this browser exercise, a linked list is represented as a Python list. Return its values in reverse order. Try an iterative solution.",
    examples: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { input: [[1, 2]], expected: [2, 1] },
    ],
    tests: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { input: [[1, 2]], expected: [2, 1] },
      { input: [[1]], expected: [1] },
      { input: [[]], expected: [] },
      { input: [[1, 2, 3]], expected: [3, 2, 1] },
      { input: [range(5000)], expected: reversedRange(5000).map((n) => n - 1) },
    ],
    constraints: [
      "0 <= head.length <= 5000",
      "For this exercise, the input and output are Python lists.",
      "Expected time: O(n); extra space: O(1) for in-place reversal or O(n) for a copy.",
    ],
    starterCode: "def reverse_list(head):\n    # Return the values in reverse order\n    pass",
  },
  {
    id: "find-middle",
    title: "Find Middle of List",
    topic: "Linked List",
    difficulty: "Easy",
    functionName: "middle_value",
    inputNames: ["head"],
    description:
      "Given a non-empty Python list representing linked-list values, return the middle value. If there are two middle values, return the second one.",
    examples: [
      { input: [[1, 2, 3, 4, 5]], expected: 3 },
      { input: [[1, 2, 3, 4]], expected: 3 },
    ],
    tests: [
      { input: [[1, 2, 3, 4, 5]], expected: 3 },
      { input: [[1, 2, 3, 4]], expected: 3 },
      { input: [[9]], expected: 9 },
      { input: [[1, 2]], expected: 2 },
      { input: [range(10000)], expected: 5000 },
    ],
    constraints: [
      "1 <= head.length <= 10000",
      "Return the second middle for an even-length list.",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def middle_value(head):\n    # Return the middle value (second middle if even)\n    pass",
  },
  {
    id: "merge-sorted-lists",
    title: "Merge Sorted Lists",
    topic: "Linked List",
    difficulty: "Easy",
    functionName: "merge_sorted_lists",
    inputNames: ["list1", "list2"],
    description:
      "Given two sorted lists, return a single sorted list containing all values from both lists.",
    examples: [
      { input: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { input: [[], [0]], expected: [0] },
    ],
    tests: [
      { input: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { input: [[], [0]], expected: [0] },
      { input: [[], []], expected: [] },
      { input: [[-3, 0, 9], [-2, 1, 8]], expected: [-3, -2, 0, 1, 8, 9] },
      { input: [range(5000, 0), range(5000, 0)], expected: range(5000, 0).concat(range(5000, 0)).sort((a, b) => a - b) },
    ],
    constraints: [
      "0 <= list1.length, list2.length <= 5000",
      "Both input lists are sorted in ascending order.",
      "Expected time: O(n + m); extra space: O(n + m) for a new list.",
    ],
    starterCode: "def merge_sorted_lists(list1, list2):\n    # Return one sorted list\n    pass",
  },
  {
    id: "fast-slow-pointer",
    title: "Fast & Slow Pointer",
    topic: "Linked List",
    difficulty: "Easy",
    functionName: "has_duplicate",
    inputNames: ["nums"],
    description:
      "Given a list of integers, return True if any value appears at least twice, otherwise False. Solve this array-based warm-up using a fast lookup structure. The classic fast/slow linked-list pointer pattern is covered separately by cycle detection.",
    examples: [
      { input: [[1, 2, 3, 1]], expected: true },
      { input: [[1, 2, 3, 4]], expected: false },
    ],
    tests: [
      { input: [[1, 2, 3, 1]], expected: true },
      { input: [[1, 2, 3, 4]], expected: false },
      { input: [[1, 1]], expected: true },
      { input: [[]], expected: false },
      { input: [range(10000).concat([9999])], expected: true },
    ],
    constraints: [
      "0 <= nums.length <= 10000",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def has_duplicate(nums):\n    # Return True if any value is repeated\n    pass",
  },

  // ---------------------------------------------------------------------------
  // STACKS AND QUEUES
  // ---------------------------------------------------------------------------
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    topic: "Stack & Queue",
    difficulty: "Easy",
    functionName: "is_valid",
    inputNames: ["s"],
    description:
      "Determine whether the string of brackets (), [], and {} is valid. Every opener must be closed by the same bracket type in the correct order.",
    examples: [
      { input: ["()"], expected: true },
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
    ],
    tests: [
      { input: ["()"], expected: true },
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["([)]"], expected: false },
      { input: ["{[]}"], expected: true },
      { input: ["("], expected: false },
      { input: [")"], expected: false },
      { input: ["(" .repeat(5000) + ")".repeat(5000)], expected: true },
    ],
    constraints: [
      "1 <= s.length <= 10000",
      "s contains only the characters ()[]{}.",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def is_valid(s):\n    # Use a stack\n    pass",
  },
  {
    id: "infix-to-postfix",
    title: "Infix to Postfix",
    topic: "Stack & Queue",
    difficulty: "Medium",
    functionName: "infix_to_postfix",
    inputNames: ["expression"],
    description:
      "Convert an infix expression to postfix (Reverse Polish Notation). Tokens are non-negative integers and operators +, -, *, /, ^, with parentheses and spaces optional. Separate output tokens with one space. ^ is right-associative; multiplication and division have higher precedence than addition and subtraction.",
    examples: [
      { input: ["3 + 4 * 2"], expected: "3 4 2 * +" },
      { input: ["(1 + 2) * 3"], expected: "1 2 + 3 *" },
    ],
    tests: [
      { input: ["3 + 4 * 2"], expected: "3 4 2 * +" },
      { input: ["(1 + 2) * 3"], expected: "1 2 + 3 *" },
      { input: ["10 + 2 * 6"], expected: "10 2 6 * +" },
      { input: ["2 ^ 3 ^ 2"], expected: "2 3 2 ^ ^" },
      { input: ["(8 / 4) - 1"], expected: "8 4 / 1 -" },
    ],
    constraints: [
      "Expression length <= 10000 characters.",
      "Input is a valid infix expression with binary operators.",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def infix_to_postfix(expression):\n    # Return postfix tokens separated by spaces\n    pass",
  },
  {
    id: "postfix-evaluation",
    title: "Postfix Evaluation",
    topic: "Stack & Queue",
    difficulty: "Medium",
    functionName: "eval_postfix",
    inputNames: ["tokens"],
    description:
      "Evaluate a valid postfix expression. Tokens are integers or operators +, -, *, /. Division truncates toward zero. Return the integer result.",
    examples: [
      { input: [["2", "1", "+", "3", "*"]], expected: 9 },
      { input: [["4", "13", "5", "/", "+"]], expected: 6 },
    ],
    tests: [
      { input: [["2", "1", "+", "3", "*"]], expected: 9 },
      { input: [["4", "13", "5", "/", "+"]], expected: 6 },
      { input: [["10", "3", "-"]], expected: 7 },
      { input: [["-7", "2", "/"]], expected: -3 },
      { input: [["100", "2", "/", "5", "*"]], expected: 250 },
    ],
    constraints: [
      "1 <= tokens.length <= 10000",
      "The expression is valid and division by zero does not occur.",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def eval_postfix(tokens):\n    # Evaluate using a stack\n    pass",
  },
  {
    id: "next-greater-element",
    title: "Next Greater Element",
    topic: "Stack & Queue",
    difficulty: "Medium",
    functionName: "next_greater_elements",
    inputNames: ["nums"],
    description:
      "For each element, return the first greater element to its right, or -1 if no such element exists. Use a monotonic stack.",
    examples: [
      { input: [[4, 5, 2, 25]], expected: [5, 25, 25, -1] },
      { input: [[13, 7, 6, 12]], expected: [-1, 12, 12, -1] },
    ],
    tests: [
      { input: [[4, 5, 2, 25]], expected: [5, 25, 25, -1] },
      { input: [[13, 7, 6, 12]], expected: [-1, 12, 12, -1] },
      { input: [[1, 2, 3]], expected: [2, 3, -1] },
      { input: [[3, 2, 1]], expected: [-1, -1, -1] },
      { input: [[2, 2, 3, 1]], expected: [3, 3, -1, -1] },
      { input: [range(10000)], expected: range(10000).map((n) => (n === 9999 ? -1 : n + 1)) },
    ],
    constraints: [
      "1 <= nums.length <= 10000",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def next_greater_elements(nums):\n    # Use a monotonic stack\n    pass",
  },
  {
    id: "circular-queue",
    title: "Circular Queue",
    topic: "Stack & Queue",
    difficulty: "Medium",
    functionName: "circular_queue",
    inputNames: ["capacity", "operations"],
    description:
      "Implement a fixed-capacity circular queue. Each operation is ['enqueue', value], ['dequeue'], ['front'], or ['is_empty']. Return one result for each operation: enqueue/dequeue return True on success and False on failure; front returns the front value or -1; is_empty returns a boolean.",
    examples: [
      {
        input: [3, [["enqueue", 1], ["enqueue", 2], ["front"], ["dequeue"], ["is_empty"]]],
        expected: [true, true, 1, true, false],
      },
    ],
    tests: [
      {
        input: [3, [["enqueue", 1], ["enqueue", 2], ["front"], ["dequeue"], ["is_empty"]]],
        expected: [true, true, 1, true, false],
      },
      {
        input: [1, [["dequeue"], ["front"], ["enqueue", 9], ["enqueue", 8], ["front"], ["dequeue"], ["dequeue"]]],
        expected: [false, -1, true, false, 9, true, false],
      },
      { input: [2, [["enqueue", 1], ["dequeue"], ["enqueue", 2], ["enqueue", 3], ["front"]]], expected: [true, true, true, true, 2] },
    ],
    constraints: [
      "1 <= capacity <= 1000",
      "0 <= operations.length <= 10000",
      "Expected time: O(1) per operation; extra space: O(capacity).",
    ],
    starterCode: "def circular_queue(capacity, operations):\n    # Return a list of operation results\n    pass",
  },
  {
    id: "monotonic-stack",
    title: "Monotonic Stack",
    topic: "Stack & Queue",
    difficulty: "Medium",
    functionName: "daily_temperatures",
    inputNames: ["temperatures"],
    description:
      "For each day's temperature, return how many days must pass until a warmer temperature. Return 0 if no warmer day exists. Use a monotonic decreasing stack of indices.",
    examples: [
      { input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
    ],
    tests: [
      { input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
      { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { input: [[90, 80, 70]], expected: [0, 0, 0] },
      { input: [[50]], expected: [0] },
      { input: [range(10000)], expected: range(10000).map((n) => (n === 9999 ? 0 : 1)) },
    ],
    constraints: [
      "1 <= temperatures.length <= 10000",
      "Expected time: O(n); extra space: O(n).",
    ],
    starterCode: "def daily_temperatures(temperatures):\n    # Return wait days for each position\n    pass",
  },
  {
    id: "monotonic-queue",
    title: "Sliding Window Maximum",
    topic: "Sliding Window",
    difficulty: "Hard",
    functionName: "max_sliding_window",
    inputNames: ["nums", "k"],
    description:
      "Return the maximum value in every contiguous window of size k. Use a deque-based monotonic queue for linear time.",
    examples: [
      { input: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { input: [[1], 1], expected: [1] },
    ],
    tests: [
      { input: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7] },
      { input: [[1], 1], expected: [1] },
      { input: [[9, 8, 7, 6], 2], expected: [9, 8, 7] },
      { input: [[4, 4, 4, 4], 2], expected: [4, 4, 4] },
      { input: [range(10000), 100], expected: range(10000 - 100 + 1, 99).map((n) => n + 99) },
    ],
    constraints: [
      "1 <= k <= nums.length <= 10000",
      "Expected time: O(n); extra space: O(k).",
    ],
    starterCode: "def max_sliding_window(nums, k):\n    # Use a deque-backed monotonic queue\n    pass",
  },
  {
    id: "fixed-sliding-window",
    title: "Fixed Sliding Window",
    topic: "Sliding Window",
    difficulty: "Easy",
    functionName: "max_sum_subarray",
    inputNames: ["nums", "k"],
    description:
      "Given an integer array and a valid window size k, return the maximum sum among all contiguous subarrays of exactly k elements.",
    examples: [
      { input: [[2, 1, 5, 1, 3, 2], 3], expected: 9 },
      { input: [[2, 3, 4, 1, 5], 2], expected: 7 },
    ],
    tests: [
      { input: [[2, 1, 5, 1, 3, 2], 3], expected: 9 },
      { input: [[2, 3, 4, 1, 5], 2], expected: 7 },
      { input: [[-5, -2, -3], 2], expected: -5 },
      { input: [[7], 1], expected: 7 },
      { input: [Array(100000).fill(1), 1000], expected: 1000 },
    ],
    constraints: [
      "1 <= k <= nums.length <= 100000",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def max_sum_subarray(nums, k):\n    # Maintain a rolling sum\n    pass",
  },
  {
    id: "variable-sliding-window",
    title: "Variable Sliding Window",
    topic: "Sliding Window",
    difficulty: "Medium",
    functionName: "min_subarray_len",
    inputNames: ["target", "nums"],
    description:
      "Given positive integers nums and a positive target, return the minimum length of a contiguous subarray whose sum is at least target. Return 0 if no such subarray exists.",
    examples: [
      { input: [7, [2, 3, 1, 2, 4, 3]], expected: 2 },
      { input: [4, [1, 4, 4]], expected: 1 },
    ],
    tests: [
      { input: [7, [2, 3, 1, 2, 4, 3]], expected: 2 },
      { input: [4, [1, 4, 4]], expected: 1 },
      { input: [11, [1, 1, 1, 1]], expected: 0 },
      { input: [15, [1, 2, 3, 4, 5]], expected: 5 },
      { input: [100000, Array(100000).fill(1)], expected: 100000 },
    ],
    constraints: [
      "1 <= target <= 10^9",
      "1 <= nums.length <= 100000",
      "1 <= nums[i] <= 10000",
      "Expected time: O(n); extra space: O(1).",
    ],
    starterCode: "def min_subarray_len(target, nums):\n    # Expand right and shrink left while valid\n    pass",
  },
];
