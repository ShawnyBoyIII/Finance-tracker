# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- First-class account and credit-card support
- Account tabs on the transactions page
- Multi-income household planning with multiple income sources
- Bill tracking with due days
- Manual paid/unpaid bill overrides for the current cycle
- Local JSON backup and restore tools
- Data management page
- Transaction search and filtering
- Recurring bill detection

### Changed

- Upgraded storage to a unified versioned app-data model
- Migrated legacy browser-storage keys into the unified storage model
- Improved the dashboard to focus on monthly cash flow and household planning
- Made imports account-aware for CSV and PDF flows

### Fixed

- Repaired PDF/OCR parser issues that were blocking import reliability
- Improved storage migration hygiene by cleaning up legacy keys after save

## [1.0.1] - Minor Fixes & Improvements

### Fixed

- Fixed PDF OCR parsing for negative payments by correctly handling typographic dashes.
- Various minor UI improvements and bug fixes.

## [1.0.0] - First Official Release

### Added

- Dashboard summary cards for balance, income, and expenses
- Expense-by-category visualization
- Manual transaction entry
- CSV import and export
- Budget tracking by category
- Local browser storage persistence
