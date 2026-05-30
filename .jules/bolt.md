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
