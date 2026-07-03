# Burnrate-Inspired Feature Roadmap

This document captures the most useful ideas from `ShawnyBoyIII/burnrate` and adapts them to the current `Finance-tracker` product direction.

The goal is not to turn this app into a backend-heavy clone. The goal is to borrow the parts that improve everyday trust, statement handling, and overspending awareness while keeping the current local-first household planner approach.

## What Burnrate Does Well

After comparing both repos, Burnrate is strongest in these areas:

1. Statements are first-class records, not just one-time import files.
2. Credit-card and bank-account data are separated clearly.
3. Payment reminders are treated as a product feature, not just a side effect of recurring detection.
4. Subscription and merchant views are built on top of normalized imported data.
5. Users can browse, re-check, and manage prior imports instead of losing that context after transactions are created.

## What Fits This App Best

These are the highest-value ideas to bring into `Finance-tracker`.

### 1. Statements Hub

This is the most important feature to borrow.

Right now, imports create transactions, but the statement itself is not a durable object with its own identity and history. A Statements Hub would let users:

- see every imported PDF and CSV
- know which account/card each statement belongs to
- see statement period, due date, and parsed totals
- re-open an import review later
- re-parse a statement after parser improvements
- delete a statement without losing all UI context

Why it matters:

- Users think in statements, not just transactions.
- It creates trust after imports.
- It gives us a home for payment reminders and statement validation.

### 2. Source-Aware Tracking

Burnrate separates credit-card and bank-account sources cleanly. We should bring that idea over, but in our own simpler structure.

Add a `sourceType` concept to imported records and statement metadata:

- `credit_card`
- `bank_account`
- `manual`

Why it matters:

- avoids mixing bill payments with actual spend
- makes import review clearer
- helps build better dashboard filters later

### 3. Payment Reminder Center

We already have bill tracking, but there is still a gap between:

- recurring bills
- credit-card statement due dates
- imported statement balances

We should add a reminder layer that shows:

- card due date
- minimum due
- statement balance
- whether payment appears made
- days remaining

Why it matters:

- this is one of the biggest “save me from myself” features
- it turns imported statements into action, not just records

### 4. Subscription Watchlist 2.0

We already discussed this direction, and Burnrate reinforces that it is the right one.

Upgrade the current recurring/subscription experience so users can see:

- normalized merchant name
- likely subscription cadence
- current monthly cost
- annualized cost
- which card/account the subscription is on
- whether price increased versus prior charges

Why it matters:

- small recurring charges are where many users quietly leak money
- this is one of the clearest “behavior change” surfaces for overspending users

### 5. Import History and Re-Review

Imports should become recoverable workflows.

For each imported statement or CSV batch, keep:

- source file name
- imported date
- linked account
- parser profile used
- row count
- duplicate count
- low-confidence row count
- whether the user manually edited rows before saving

Why it matters:

- users can revisit questionable imports
- parser improvements become useful retroactively
- support/debugging becomes much easier

### 6. Better Merchant and Category Operations

Burnrate invests in categorization and downstream analysis. We should continue in that direction with a cleaner user-first setup.

Good follow-ups:

- merchant rules: `contains "TARGET" -> Shopping`
- category rules by merchant
- transaction tags
- batch recategorization for similar merchants

Why it matters:

- import quality compounds over time
- recurring detection gets stronger
- dashboard insights become much more trustworthy

## What We Should Not Copy Right Now

These ideas are interesting, but they do not fit the current product stage yet:

### 1. Backend-first architecture

Burnrate uses FastAPI, SQLite, and a richer service layer. That makes sense for its statement-processing and multi-surface goals.

For `Finance-tracker`, we should stay local-first in-browser for now and only add heavier persistence when the product truly needs cross-device sync or background jobs.

### 2. Gmail autosync

This adds OAuth, credential storage, and more trust/security work than the current app needs.

It is not the right next move.

### 3. LLM insights

This is lower priority than import trust, due dates, and overspending warnings.

If the imported data is wrong, AI analysis only makes wrong data feel smarter.

### 4. Offers and milestone systems

Interesting, but they are more “power user credit card optimization” than “keep household finances under control.”

Not the right next investment for this app.

## Recommended Build Order

This is the suggested implementation order for the next major phases.

### Phase A: Statement Foundation

1. Add a `Statement` entity to storage.
2. Save metadata for each PDF/CSV import.
3. Link imported transactions back to their statement.
4. Build a basic Statements page with list and filters.

Success outcome:

- users can browse prior statement imports
- each transaction can be traced back to its source

### Phase B: Statement Trust Layer

1. Store parser profile, duplicate counts, confidence counts.
2. Add statement-level validation summary.
3. Add re-review / re-parse entry point.
4. Add imported-total vs parsed-total comparison.

Success outcome:

- imports feel auditable
- parser improvements become reusable

### Phase C: Payment Reminder Center

1. Extend bill planner with card statement due-date data.
2. Show minimum due, statement balance, and payment status.
3. Add dashboard reminder strip for due-soon items.
4. Let users manually confirm payment when auto-detection misses it.

Success outcome:

- the app becomes proactive, not just reflective

### Phase D: Subscription Watchlist 2.0

1. Use normalized merchants from PDF/CSV imports.
2. Group recurring charges by merchant + account.
3. Show monthly and annualized totals.
4. Flag price increases and duplicate subscriptions across cards.

Success outcome:

- overspending users get one of the clearest “cut this now” views in the app

### Phase E: Cleanup and Rules

1. Merchant renaming rules.
2. Category automation rules.
3. Batch fix queue for uncategorized imports.
4. Optional tags for flexible spending review.

Success outcome:

- imported data gets better every month instead of staying noisy

## Recommended First Concrete Feature

If we choose only one major feature to start from this roadmap, it should be:

**Statements Hub with stored import metadata**

That is the best bridge between:

- the import/parser work we already did
- the bills and reminder system
- the upcoming subscription watchlist
- future bank-specific parser upgrades

It is the feature most likely to make the app feel more mature immediately.

## Consumer POV Summary

For a user who spends too much and gets surprised by statements, the app still needs to answer these questions more directly:

- Which statement just came in?
- What is due next?
- Did I already pay it?
- Which subscriptions are quietly draining me?
- Which imported rows should I distrust?

Burnrate is a strong reference because it handles those workflow questions well.

Our best path is to borrow that workflow structure while keeping `Finance-tracker` focused on:

- local-first privacy
- household planning
- card-level control
- clear overspending guardrails
