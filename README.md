# Finance Tracker

Private household finance tracking in the browser with no required backend.

The app is built with Next.js and stores data locally on the user's device. It is designed for people who want a practical day-to-day money tool without handing their financial history to a third-party service.

## Current Status

The project is beyond a basic budget tracker now. The current app includes:

- monthly cash-flow dashboard
- transaction search and filtering
- recurring bill detection
- tracked bills and due dates
- multiple income sources for household planning
- account and credit-card tabs
- CSV and PDF statement import
- local backup and restore tools

## Key Features

### Dashboard

- Lifetime balance, income, and expense totals
- Monthly cash-flow view for the current month
- Household income planner for multiple paycheck sources
- Recurring bill detection from prior transactions
- Bill due-date tracking with paid, upcoming, and overdue states
- Recent activity and category breakdown visuals

### Transactions

- Manual transaction entry
- Search by description, category, institution, type, and date range
- Account-aware transaction tabs for household and individual credit cards
- CSV import into a selected account
- PDF statement parsing and review before import

### Accounts and Cards

- First-class account support
- Separate credit-card tabs
- Card-specific transaction views
- Card assignment during import and manual entry

### Bills and Planning

- Monthly budget tracking
- Tracked bills with due-day settings
- Manual paid/unpaid overrides for the current bill cycle
- Multi-income household paycheck planning

### Data and Durability

- Unified versioned app-data storage
- Legacy storage migration
- JSON backup export
- JSON restore flow with replacement warning

## Getting Started

### Requirements

- Node.js
- npm

### Local Development

```bash
cd "/path/to/Finance-tracker"
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Verification

```bash
npm test -- --runInBand
npm run lint
npx next build --webpack
```

`npx next build --webpack` is the current recommended production-build check for this repo.

## Project Structure

- `src/app` - Next.js app routes
- `src/components` - UI components and feature sections
- `src/context` - shared finance state and persistence wiring
- `src/utils` - finance logic, salary logic, OCR parsing, and storage helpers
- `docs` - roadmap and storage durability planning

## Data Model Notes

The app currently stores:

- transactions
- budgets
- accounts
- bills
- income sources
- app metadata

All of that is persisted locally in a unified app-data record and can be exported as a backup file.

## Project Docs

- Roadmap: [docs/future_phases.md](./docs/future_phases.md)
- Storage durability plan: [docs/data_durability_roadmap.md](./docs/data_durability_roadmap.md)

## Privacy

This app is designed to run locally in the browser. Finance data stays on the device unless the user explicitly exports a backup.

## Known Limitations

- PDF statement parsing is heuristic-based and works best with cleaner statement formats
- Bill detection and recurring-subscription logic are inference-based, so manual review is still important
- The app is local-first and does not yet support multi-device sync

## Next Product Priorities

The strongest product gaps right now are:

- better bill editing and trust controls
- dedicated credit-card summary views on the dashboard
- subscription watchlist surfacing parsed recurring subscriptions
- stronger import review and duplicate detection
- longer-term sync and durability improvements
