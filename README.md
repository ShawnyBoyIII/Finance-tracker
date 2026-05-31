# 💰 Free Budget Tracker

Welcome to your free, private, and easy-to-use Free Budget Tracker!

This application runs directly in your browser. All your financial data is saved locally on your device (`localStorage`), meaning it is 100% private, highly secure, and costs nothing to host or maintain.

---

## 🚀 Getting Started

If you are running this locally on your machine, follow these steps:

1. **Open Terminal & Navigate to the Project:**
   Open the Terminal app on your Mac. You need to navigate to the folder where you downloaded the app using the `cd` (change directory) command.
   For example, if you downloaded and extracted it to your Downloads folder, run:
   ```bash
   cd ~/Downloads/free-budget-tracker
   ```
   *(Note: Replace `free-budget-tracker` with the actual name of the folder if it's different)*

2. **Install Dependencies:**
   Make sure you have [Node.js](https://nodejs.org/) installed. Then run:
   ```bash
   npm install
   ```

3. **Start the Application:**
   ```bash
   npm run dev
   ```

4. **Open the App:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## 📖 How to Use the App

The app is divided into three main sections, accessible via the top navigation bar.

### 1. Dashboard 📊
The Dashboard is your financial control center.
* **Summary Cards:** Quickly see your Total Balance, Total Income, and Total Expenses.
* **Income vs Expenses:** A bar chart comparing what you earned versus what you spent.
* **Expenses by Category:** A pie chart showing exactly where your money is going (e.g., Groceries, Rent, Entertainment).

### 2. Transactions 💳
This is where you log your financial activity.
* **Manual Entry:** Click "Add Manual Transaction" to record a single purchase or paycheck. You can edit or delete these at any time.
* **CSV Import:** Want to bulk-add data from your bank? Click the "Import CSV" button.
  * *Important:* Your CSV file **must** have headers matching these exact names: `Date, Amount, Description, Category`.
  * Positive amounts are treated as Income, and negative amounts are treated as Expenses.
* **PDF Import (Experimental):** You can also upload PDF bank statements.
  * The text will be extracted locally in your browser using OCR technology.
  * **Privacy Guarantee:** No data is sent to any external server during this process. Everything runs locally on your device!
* **Export CSV:** Need to back up your data or move to a new computer? Click "Export CSV" to download all your transactions securely.

### 3. Budgets 🎯
Set goals and track your spending limits.
* **Set a Budget:** Enter a Category (e.g., "Groceries") and a Monthly Limit ($).
* **Track Progress:** The app will automatically match your expense transactions to these categories. You'll see a progress bar filling up as you spend.
* **Alerts:** If you exceed your limit, the progress bar turns red to warn you.

---

## 💡 Pro Tips for Beginners
* **Backup Often:** Because your data lives in your browser, if you clear your browser history/cache completely, your data might be reset. Use the **Export CSV** button on the Transactions page regularly to keep safe backups on your computer.
* **Consistent Categories:** When adding transactions manually or via CSV, try to use the same category names (e.g., always use "Groceries" instead of mixing "Groceries", "Food", "Supermarket"). This makes your Dashboard charts much cleaner!

Happy tracking! 🎉
---

## 🛠️ Troubleshooting & Common Errors

If you are developing locally or adding new features (like the experimental PDF/OCR import), you might run into build errors. Here is how to solve the most common ones.

### 1. Module not found: Can't resolve 'pdfjs-dist' or 'tesseract.js'
If you add the experimental `PDFImport` component and see a module not found error during build, you need to install the missing dependencies.

**Solution:**
Run this in your terminal:
```bash
npm install pdfjs-dist tesseract.js
```

### 2. Error: `ssr: false` is not allowed with `next/dynamic` in Server Components
If you try to dynamically import a client-side component (like `PDFImport` which requires browser APIs) directly inside a Next.js Server Component (like `app/transactions/page.tsx`), the build will fail.

**Solution:**
You must wrap the dynamic import in a Client Component file.

1. Create a new file at `src/components/transactions/PDFImportWrapper.tsx`:
   ```tsx
   "use client";
   import dynamic from 'next/dynamic';

   const PDFImport = dynamic(() => import('@/components/transactions/PDFImport'), {
     ssr: false,
   });

   export default function PDFImportWrapper() {
     return <PDFImport />;
   }
   ```

2. Update your `src/app/transactions/page.tsx` to use the wrapper:
   ```tsx
   import React from 'react';
   import Navbar from '@/components/layout/Navbar';
   import CSVImport from '@/components/transactions/CSVImport';
   import TransactionList from '@/components/transactions/TransactionList';
   // Import the new wrapper instead!
   import PDFImportWrapper from '@/components/transactions/PDFImportWrapper';

   export default function TransactionsPage() {
     return (
       <div className="min-h-screen bg-gray-50">
         <Navbar />
         <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
           <div className="flex justify-between items-end mb-6">
             <h1 className="text-2xl font-bold text-gray-900">Manage Transactions</h1>
           </div>

           <PDFImportWrapper />
           <CSVImport />
           <TransactionList />
         </main>
       </div>
     );
   }
   ```
