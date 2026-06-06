# Data Durability Roadmap

The app is still in feature-testing mode, but finance data should be modeled so it can move to stronger storage without a rewrite.

## Phase 1: Storage Adapter and Versioned App Data
- Use one `AppData` shape for transactions, budgets, accounts, salary schedules, and metadata.
- Save through a storage adapter instead of writing directly to browser storage from components or context.
- Keep backward compatibility with legacy per-resource `localStorage` keys.

## Phase 2: Backup and Restore
- Add a data/settings view with export and restore actions.
- Include schema version, backup timestamp, and all user data in each backup file.
- Show a clear warning before restore replaces current local data.

## Phase 3: IndexedDB
- Move the storage adapter from `localStorage` to IndexedDB.
- Migrate existing unified `AppData` from `localStorage` on first launch.
- Keep the adapter API stable so app code does not need to change.

## Phase 4: Encrypted Backups
- Add optional password-based encryption for backup files.
- Store encryption metadata in the backup file, not in app state.
- Keep plain JSON export available for development and troubleshooting.

## Phase 5: Installable and Desktop Options
- Add PWA install support for web-first usage.
- Reevaluate Tauri packaging after core workflows and backup/restore are stable.
- Use the same `AppData` contract for any future desktop storage layer.
