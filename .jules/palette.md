## 2023-10-27 - Icon-only Delete Buttons Accessibility
**Learning:** The application uses icon-only (`<Trash2 />`) buttons for deleting transactions and budgets across multiple components (`TransactionList.tsx`, `PDFImport.tsx`, `BudgetManager.tsx`). These were missing ARIA labels and focus states, making them inaccessible to screen readers and keyboard navigation.
**Action:** Always add `aria-label`, `title` (for mouse tooltips), and `focus-visible` styling (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded`) when implementing icon-only action buttons.
