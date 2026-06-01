# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - Minor Fixes & Improvements

### Fixed
- Fixed PDF OCR parsing for negative payments (correctly parsing typographic dashes like en-dash and em-dash).
- Various minor UI improvements and bug fixes.

## [1.0.0] - First Official Release

### Added
- **Dashboard:**
  - Summary Cards for Total Balance, Total Income, and Total Expenses.
  - Income vs Expenses bar chart visualization.
  - Expenses by Category pie chart visualization.
- **Transactions:**
  - Manual entry of transactions (Income/Expenses).
  - Ability to edit and delete individual transactions.
  - CSV Import feature for bulk adding data (must match headers: `Date, Amount, Description, Category`).
  - CSV Export feature for data backup.
- **Budgets:**
  - Ability to set monthly spending limits per category.
  - Progress bars tracking spending against set budget limits.
  - Visual alerts (red progress bar) when budget limits are exceeded.
- **Data Persistence:**
  - Fully local data storage using browser `localStorage` ensuring 100% privacy.
