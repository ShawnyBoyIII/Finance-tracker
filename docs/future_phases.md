# Future Roadmap

## Phase 1: PDF OCR Integration
To implement bank statement parsing from PDFs directly in the browser (keeping data private and free), we will build the following pipeline:

1. **PDF Rendering (`pdf.js`)**: Users upload a PDF. We use `pdf.js` to parse the document and render each page to an invisible HTML `<canvas>`.
2. **Image Extraction**: Extract high-quality images from the canvases.
3. **Web Worker OCR (`tesseract.js`)**: Send the images to a background Web Worker running `tesseract.js`. This extracts raw text from the images without freezing the UI.
4. **Regex & Bank Profiles**: Use regular expressions to find patterns (Dates, Descriptions, Amounts). Since formats vary wildly, we will create profiles for major banks (e.g., Chase, BoA) to guide the regex.
5. **Review Staging Area**: Present the parsed data in a "Review" UI where users can correct OCR mistakes before committing transactions to their ledger.

## Phase 2: Enhanced Financial Metrics & Dashboard
To make the dashboard more insightful, we will add advanced metrics that give a better picture of financial health, rather than just raw totals.

1. **Savings Rate Metric**:
   * **What it is**: The percentage of your income that you save `((Income - Expenses) / Income) * 100`.
   * **Visualization**: A prominent gauge or circular progress chart showing the current month's savings rate against a target goal (e.g., 20%).
2. **Cash Flow Trend (6-Month View)**:
   * **What it is**: Moving beyond the current month, a line or area chart showing how Balance, Income, and Expenses trend over time.
   * **Visualization**: A Recharts `AreaChart` with overlapping layers for Income and Expense, helping visualize months of surplus vs deficit.
3. **"Runway" or Emergency Fund Tracker**:
   * **What it is**: Calculating how many months the user could survive on their current savings based on their *average monthly expenses*.
   * **Visualization**: A simple bold metric: "Your current balance covers **3.2 months** of average expenses."
4. **Top Spending Movers**:
   * **What it is**: Identifying which categories have increased the most compared to the previous month.
   * **Visualization**: A "Watchlist" card showing categories with high growth (e.g., "Dining Out: +$150 from last month 📈").
5. **Net Worth Tracking**:
   * **What it is**: Allowing users to manually input or link static assets (Home value, 401k) and liabilities (Mortgage, Car loan) to see their overall Net Worth, not just cash flow.
