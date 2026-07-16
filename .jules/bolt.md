## 2024-05-25 - React Context Mutation during Render
**Learning:** Found a critical anti-pattern in `TransactionList.tsx`. The code was doing `transactions.sort(...)` directly inside the JSX. Since `Array.prototype.sort()` mutates the array in-place, and `transactions` was coming directly from `useFinance()` context, the component was secretly mutating global state during every render cycle.
**Action:** Always spread arrays from context or state before sorting them (`[...array].sort()`), and memoize the result to prevent expensive re-calculations on unrelated state changes (like form keystrokes).

## 2024-05-26 - O(M*N) Nested Loops in Render Cycles
**Learning:** Found an $O(M \times N)$ nested loop inside a `useMemo` hook in `BudgetManager.tsx`. Filtering a large array (`transactions`) for every item in another array (`budgets`) blocks the main thread during render cycles as data grows.
**Action:** Replace nested array filtering in renders with $O(N+M)$ Hash Map pre-aggregation to ensure performance remains stable as local datasets scale.

## 2024-05-27 - Date Parsing in Array Sort
**Learning:** Instantiating `new Date()` inside an `Array.prototype.sort()` comparator function is an expensive operation that runs $O(N \log N)$ times. When dates are already in ISO format (`YYYY-MM-DD` or full ISO string), string comparison is perfectly safe and over 10x faster.
**Action:** When sorting arrays of objects by an ISO date string, always use standard string comparison (`a < b ? -1 : a > b ? 1 : 0`) instead of converting them back to Date objects or using `localeCompare`.

## 2024-05-28 - Missing DOM Virtualization for Large Datasets
**Learning:** In Next.js client components without server-side pagination, dumping thousands of imported CSV records directly into a React table causes severe main thread blocking and laggy input interactions. Instantiating `new Date()` within thousands of list items exponentially worsens the re-render performance.
**Action:** Always implement pagination or virtualization when rendering unconstrained lists of transactions on the client, and slice the array BEFORE applying date formatting and creating DOM nodes.

## 2024-05-29 - Co-located State Thrashing in Data Tables
**Learning:** In `src/components/transactions/TransactionList.tsx`, component state for form inputs (`amount`, `category`, etc.) was co-located with a large list rendering component. Every keystroke triggered a full re-render of the parent component, meaning up to 50 table rows and 50 date parsing operations (`date-fns`) were unnecessarily executed per keystroke.
**Action:** Extract frequently updating state (like text inputs) into separate, smaller child components (e.g., `AddTransactionForm`) to isolate re-renders and prevent thrashing the main thread when large lists are present in the same view.
## 2024-05-30 - Date Sorting String Comparison
**Learning:** `String.prototype.localeCompare` has a significant overhead because it is built for locale-aware, alphabet-sensitive string comparisons, adding roughly 100% execution time overhead for arrays of 100k items. Since our application uniformly formats dates as strings like `YYYY-MM-DD`, locale-aware sorting rules are unnecessary.
**Action:** When sorting arrays by ISO date string formats, always use direct comparative operators (`a < b`, `a > b`) instead of `localeCompare` to speed up list operations with no loss of correctness.

## 2024-05-31 - Extreme Overhead of new Date() in Tight Loops
**Learning:** Instantiating `new Date()` and calling heavy formatting libraries like `date-fns` inside render loops for lists (`.map`) introduces severe performance penalties. For simple ISO date strings (`YYYY-MM-DD`), extracting the string parts directly runs ~18x faster than parsing to a Date and formatting. Furthermore, calling `new Date()` inside a fallback inside an array mapping (`results.data.map(...)`) for large data sets like CSV imports adds unnecessary execution time compared to hoisting the fallback calculation outside the loop.
**Action:** Never instantiate `new Date()` inside loops (like `Array.prototype.map` or React render `.map` functions) when working with large data sets. If formatting a standard string like `YYYY-MM-DD`, prefer manual string manipulation instead of fully parsing it to a `Date`. When a `Date` instance is needed as a default or fallback across many items, hoist it outside the loop.
## 2024-06-01 - Extreme Overhead of new Date() in Tight Loops (Re-applied)
**Learning:** Instantiating `new Date()` inside loops parsing potentially hundreds of lines (like in `parseTransactionsFromText` for OCR) creates severe execution time overhead. For simple ISO date strings (`YYYY-MM-DD`) from MM/DD/YYYY inputs, executing a fast string parse (`split`, `padStart`) takes ~34ms for 100k iterations compared to ~154ms for `new Date()`. Additionally, repeating dynamic logic like `new Date().getFullYear()` in every loop iteration is wasteful.
**Action:** Replace `new Date(dateStr)` object instantiation inside tight parsing loops with fast string parsing where standard string formats (`YYYY-MM-DD`) are required. Hoist single-calculation constants (like `currentYear`) outside the loop.
## 2024-06-03 - String Transformations in High-Iteration Render Loops
**Learning:** Calling string transformation methods like `.toLowerCase()` inside high-iteration loops (e.g., iterating through a large `transactions` array during a React render cycle in `useMemo`) adds measurable execution time overhead that can block the main thread. Specifically, applying `.toLowerCase()` on potentially hundreds of thousands of items is wasteful when the unique output keys are relatively few.
**Action:** When pre-aggregating data in render cycles, do not call string transformation methods in the high-iteration loop. First, aggregate by the raw, case-sensitive keys (ideally using a standard `for` loop for speed), and apply transformations like `.toLowerCase()` only to the resulting, much smaller set of unique keys in a secondary loop.
## 2024-06-04 - toLowerCase().includes() Memory Allocation in Loops
**Learning:** Using `toLowerCase().includes('string')` inside high-iteration loops (like parsing OCR output or iterating over thousands of CSV rows) creates unnecessary memory allocations by returning a new string on every iteration, leading to GC pressure and increased execution time.
**Action:** Replace `string.toLowerCase().includes('pattern')` with a case-insensitive regular expression (`/pattern/i`) that is compiled and hoisted *outside* the loop, and use `regex.test(string)` for fast, allocation-free evaluation.
## 2024-06-05 - Intl Object Instantiation Overhead
**Learning:** Instantiating `new Intl.DateTimeFormat` or `new Intl.NumberFormat` inside formatting functions that are called frequently (e.g., inside `.map` loops or render cycles) incurs severe performance penalties (up to 160x slower) because object instantiation for these formatters is expensive.
**Action:** To prevent significant overhead during render cycles or high-frequency loops, cache and reuse `Intl.NumberFormat` and `Intl.DateTimeFormat` instances at the module level instead of repeatedly instantiating them inside frequently called formatting functions.

## 2026-07-04 - Array Sort to Single Pass Optimization
**Learning:** In utility functions, sorting an entire array or map in (N \log N)$ time solely to find a single maximum value (e.g. `[...array].sort()[0]` or `Array.from(map).sort()[0]`) introduces significant execution time overhead and unnecessary memory allocations. A stable max value can be found much faster using a single-pass (N)$ loop.
**Action:** Always replace `[...array].sort(...)[0]` with a standard `for` loop maintaining a running maximum value when searching for max/min values, ensuring correct TypeScript types (e.g. `undefined` fallback) are preserved.
## 2024-06-06 - Render Loop Date Instantiation Overhead
**Learning:** Found that invoking `new Date().toISOString().slice(0, 7)` directly inside an inner array filter (`.filter`) that itself is inside a `.map()` mapping over accounts causes exponentially expensive Date instantiation overhead during a React render cycle.
**Action:** When working with nested array loops inside `useMemo` hooks, always hoist invariant `new Date()` calculations (like current month string prefixes) to the top of the `useMemo` block to ensure $O(1)$ calculation time.
