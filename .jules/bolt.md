## 2024-05-25 - React Context Mutation during Render
**Learning:** Found a critical anti-pattern in `TransactionList.tsx`. The code was doing `transactions.sort(...)` directly inside the JSX. Since `Array.prototype.sort()` mutates the array in-place, and `transactions` was coming directly from `useFinance()` context, the component was secretly mutating global state during every render cycle.
**Action:** Always spread arrays from context or state before sorting them (`[...array].sort()`), and memoize the result to prevent expensive re-calculations on unrelated state changes (like form keystrokes).

## 2024-05-26 - O(M*N) Nested Loops in Render Cycles
**Learning:** Found an $O(M \times N)$ nested loop inside a `useMemo` hook in `BudgetManager.tsx`. Filtering a large array (`transactions`) for every item in another array (`budgets`) blocks the main thread during render cycles as data grows.
**Action:** Replace nested array filtering in renders with $O(N+M)$ Hash Map pre-aggregation to ensure performance remains stable as local datasets scale.
