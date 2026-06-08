## 2023-10-27 - Icon-only Delete Buttons Accessibility
**Learning:** The application uses icon-only (`<Trash2 />`) buttons for deleting transactions and budgets across multiple components (`TransactionList.tsx`, `PDFImport.tsx`, `BudgetManager.tsx`). These were missing ARIA labels and focus states, making them inaccessible to screen readers and keyboard navigation.
**Action:** Always add `aria-label`, `title` (for mouse tooltips), and `focus-visible` styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded`) when implementing icon-only action buttons.

## 2023-10-27 - Confirmation Dialogs for Destructive Actions
**Learning:** Destructive actions, such as deleting transactions or budgets, were executing immediately upon clicking the delete icon button. This could lead to accidental data loss, creating a poor user experience, especially since there is no "undo" functionality.
**Action:** Always wrap destructive actions (like deletions) with a confirmation dialog (`window.confirm`) to ensure the user intentionally meant to perform the action.

## 2023-10-27 - File Input Accessibility
**Learning:** File upload inputs (`<input type="file" />`) lacking associated labels or ARIA attributes can be confusing for screen reader users, who might not understand what to upload. Additionally, native file inputs often lack visible focus states when styled with utility classes like Tailwind.
**Action:** Always add descriptive `aria-label`s to file inputs that aren't explicitly bound to an `<label>`. Also, ensure custom-styled file inputs include explicit keyboard focus states (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded`) for accessible keyboard navigation.

## 2023-10-27 - Dynamic Active Navigation States
**Learning:** For Next.js navigation menus, active routes were statically set, causing confusion about the current page, and missing the `aria-current="page"` attribute for screen readers.
**Action:** Always dynamically determine active routes using `usePathname` from `next/navigation`, and apply `aria-current="page"` along with active visual styles to the active link element to ensure accessibility and clear UX.

## 2024-06-07 - Form Label Association and Placeholder-only Inputs Accessibility
**Learning:** Some form inputs (like in `TransactionList.tsx`) lacked explicit association with their `<label>` elements via `htmlFor` and `id` attributes, relying instead on DOM proximity which isn't robust for screen readers. Furthermore, some inputs (like the "Add a credit card tab" inputs) relied entirely on visual placeholders without any `<label>` or `aria-label`, making them completely inaccessible.
**Action:** Always explicitly associate `<label>` elements with their inputs using `htmlFor` and `id`. For inputs without a visual label (relying solely on placeholders), always add an explicit `aria-label` attribute to ensure accessibility for screen readers.
