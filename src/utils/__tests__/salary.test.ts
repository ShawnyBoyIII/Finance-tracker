import { getCurrentMonthIncomeFromSources, getNextPayDate, getProjectedIncome, getProjectedIncomeFromSources, getUpcomingIncomeSourcesPaychecks, getUpcomingPaychecks, migrateSalaryScheduleToIncomeSources } from '../salary';
import { detectRecurringBills, findBatchDuplicates, findPotentialTransactionDuplicates, getBillStatuses, getDueSoonBills, getStatementValidationSummary, getSuggestedCategory, normalizeMerchantName, summarizeMonthlyTransactions, summarizeStatementTransactions, summarizeTransactions } from '../finance';
import { ImportedStatement, Transaction } from '@/types';

describe('salary utilities', () => {
  it('projects bi-weekly paydays from the next payday anchor', () => {
    const schedule = {
      amount: 1500,
      nextPayDate: '2026-06-05',
    };

    const referenceDate = new Date('2026-06-02T12:00:00Z');

    expect(getNextPayDate(schedule, referenceDate)?.toISOString().slice(0, 10)).toBe('2026-06-05');

    const upcomingPaychecks = getUpcomingPaychecks(schedule, 3, referenceDate);

    expect(upcomingPaychecks).toHaveLength(3);
    expect(upcomingPaychecks[0]).toMatchObject({
      isoDate: '2026-06-05',
      amount: 1500,
    });
    expect(upcomingPaychecks[1]).toMatchObject({
      isoDate: '2026-06-19',
      amount: 1500,
    });
    expect(upcomingPaychecks[2]).toMatchObject({
      isoDate: '2026-07-03',
      amount: 1500,
    });

    expect(getProjectedIncome(schedule, 30, referenceDate)).toBe(3000);
  });

  it('combines multiple household income sources into one projection', () => {
    const incomeSources = [
      { id: 'income-1', name: 'Partner A', amount: 1500, nextPayDate: '2026-06-05' },
      { id: 'income-2', name: 'Partner B', amount: 1200, nextPayDate: '2026-06-12' },
    ];
    const referenceDate = new Date('2026-06-02T12:00:00Z');

    const upcomingPaychecks = getUpcomingIncomeSourcesPaychecks(incomeSources, 4, referenceDate);

    expect(upcomingPaychecks).toHaveLength(4);
    expect(upcomingPaychecks[0]).toMatchObject({ sourceName: 'Partner A', isoDate: '2026-06-05', amount: 1500 });
    expect(upcomingPaychecks[1]).toMatchObject({ sourceName: 'Partner B', isoDate: '2026-06-12', amount: 1200 });
    expect(getProjectedIncomeFromSources(incomeSources, 30, referenceDate)).toBe(5400);
  });

  it('totals scheduled income for the current month across all sources', () => {
    const incomeSources = [
      { id: 'income-1', name: 'Partner A', amount: 1500, nextPayDate: '2026-06-05' },
      { id: 'income-2', name: 'Partner B', amount: 1200, nextPayDate: '2026-06-12' },
    ];

    expect(getCurrentMonthIncomeFromSources(incomeSources, new Date('2026-06-15T12:00:00Z'))).toBe(5400);
  });

  it('migrates a legacy salary schedule into a named income source', () => {
    expect(
      migrateSalaryScheduleToIncomeSources({ amount: 2000, nextPayDate: '2026-06-12' })
    ).toEqual([
      {
        id: 'income-source-primary',
        name: 'Primary income',
        amount: 2000,
        nextPayDate: '2026-06-12',
      },
    ]);
  });

  it('summarizes transactions the same way the dashboard does', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 2000, type: 'income', category: 'Salary', date: '2026-06-01', description: 'Paycheck' },
      { id: '2', amount: 125, type: 'expense', category: 'Groceries', date: '2026-06-02', description: 'Groceries' },
      { id: '3', amount: 75, type: 'expense', category: 'Groceries', date: '2026-06-03', description: 'Dining' },
      { id: '4', amount: 300, type: 'cc_payment', category: 'Credit Card', date: '2026-06-04', description: 'Payment' },
    ];

    const summary = summarizeTransactions(transactions);

    expect(summary.totalIncome).toBe(2000);
    expect(summary.totalExpense).toBe(200);
    expect(summary.balance).toBe(1800);
    expect(summary.expensesByCategory).toEqual([{ name: 'Groceries', value: 200 }]);
  });

  it('summarizes only the current month for monthly cash flow', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 2500, type: 'income', category: 'Salary', date: '2026-06-01', description: 'Paycheck' },
      { id: '2', amount: 600, type: 'expense', category: 'Rent', date: '2026-06-02', description: 'Rent' },
      { id: '3', amount: 150, type: 'expense', category: 'Groceries', date: '2026-06-04', description: 'Groceries' },
      { id: '4', amount: 1800, type: 'income', category: 'Salary', date: '2026-05-28', description: 'Older paycheck' },
      { id: '5', amount: 90, type: 'expense', category: 'Dining', date: '2026-05-29', description: 'Older expense' },
    ];

    const summary = summarizeMonthlyTransactions(transactions, new Date('2026-06-15T12:00:00Z'));

    expect(summary.monthLabel).toBe('June 2026');
    expect(summary.totalIncome).toBe(2500);
    expect(summary.totalExpense).toBe(750);
    expect(summary.balance).toBe(1750);
    expect(summary.savings).toBe(1750);
    expect(summary.expensesByCategory).toEqual([
      { name: 'Rent', value: 600 },
      { name: 'Groceries', value: 150 },
    ]);
  });

  it('detects recurring bills from repeating expense patterns', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 1200, type: 'expense', category: 'Housing', date: '2026-04-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '2', amount: 1200, type: 'expense', category: 'Housing', date: '2026-05-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '3', amount: 1200, type: 'expense', category: 'Housing', date: '2026-06-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '4', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-05-10', description: 'Spotify', institution: 'Capital One' },
      { id: '5', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-06-10', description: 'Spotify', institution: 'Capital One' },
      { id: '6', amount: 70, type: 'expense', category: 'Food', date: '2026-06-12', description: 'Groceries', institution: 'Chase' },
    ];

    const recurringBills = detectRecurringBills(transactions, new Date('2026-06-15T12:00:00Z'));

    expect(recurringBills).toHaveLength(2);
    expect(recurringBills[0]).toMatchObject({
      name: 'Rent Payment',
      cadence: 'monthly',
      averageAmount: 1200,
      nextExpectedDate: '2026-07-03',
    });
    expect(recurringBills[1]).toMatchObject({
      name: 'Spotify',
      cadence: 'monthly',
      averageAmount: 18,
      nextExpectedDate: '2026-07-10',
    });
  });

  it('suggests a category from prior matching merchant descriptions', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 44, type: 'expense', category: 'Groceries', date: '2026-06-01', description: 'Trader Joe Store 123' },
      { id: '2', amount: 19, type: 'expense', category: 'Groceries', date: '2026-06-08', description: 'Trader Joe Store 987' },
      { id: '3', amount: 15, type: 'expense', category: 'Dining', date: '2026-06-09', description: 'Coffee Shop' },
    ];

    expect(getSuggestedCategory('Trader Joe Store 456', transactions)).toBe('Groceries');
    expect(getSuggestedCategory('Unknown Merchant', transactions)).toBe('Uncategorized');
  });

  it('finds imported transactions that already exist in the ledger', () => {
    const existing: Transaction[] = [
      { id: 'existing-1', amount: 15.85, type: 'expense', category: 'Phone', date: '2025-12-04', description: 'TELLO US 866-3770294 GA', accountId: 'card-1' },
      { id: 'existing-2', amount: 44, type: 'expense', category: 'Shopping', date: '2025-12-20', description: 'MENERALS LLC 775-684-9000 NV', accountId: 'card-1' },
    ];
    const imported: Transaction[] = [
      { id: 'import-1', amount: 15.85, type: 'expense', category: 'Uncategorized', date: '2025-12-04', description: 'TELLO US 866-3770294 GA', accountId: 'card-1' },
      { id: 'import-2', amount: 10, type: 'expense', category: 'Food', date: '2025-12-05', description: 'Coffee Shop', accountId: 'card-1' },
    ];

    expect(findPotentialTransactionDuplicates(imported, existing)).toEqual([
      expect.objectContaining({
        importedTransactionId: 'import-1',
        existingTransactionIds: ['existing-1'],
      }),
    ]);
  });

  it('finds duplicate rows inside the same import batch', () => {
    const imported: Transaction[] = [
      { id: 'import-1', amount: 15.85, type: 'expense', category: 'Uncategorized', date: '2025-12-04', description: 'TELLO US 866-3770294 GA', accountId: 'card-1' },
      { id: 'import-2', amount: 15.85, type: 'expense', category: 'Uncategorized', date: '2025-12-04', description: 'TELLO US 866-3770294 GA', accountId: 'card-1' },
      { id: 'import-3', amount: 44, type: 'expense', category: 'Uncategorized', date: '2025-12-20', description: 'MENERALS LLC 775-684-9000 NV', accountId: 'card-1' },
    ];

    expect(Array.from(findBatchDuplicates(imported).values())).toEqual([['import-1', 'import-2']]);
  });

  it('computes due-soon bill statuses from tracked bills and transactions', () => {
    const bills = [
      { id: 'bill-1', name: 'Internet', dueDay: 18, amount: 85, category: 'Utilities' },
      { id: 'bill-2', name: 'Rent Payment', dueDay: 10, amount: 1200, category: 'Housing' },
    ];
    const transactions: Transaction[] = [
      { id: 'tx-1', amount: 1200, type: 'expense', category: 'Housing', date: '2026-06-05', description: 'Rent Payment' },
    ];

    const statuses = getBillStatuses(bills, transactions, new Date('2026-06-15T12:00:00Z'));
    const dueSoon = getDueSoonBills(bills, transactions, new Date('2026-06-15T12:00:00Z'), 7);

    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ billId: 'bill-1', status: 'upcoming', dueDate: '2026-06-18' }),
        expect.objectContaining({ billId: 'bill-2', status: 'paid', matchedTransactionDate: '2026-06-05' }),
      ])
    );
    expect(dueSoon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ billId: 'bill-1', status: 'upcoming' }),
      ])
    );
  });

  it('normalizes common merchant strings into cleaner recurring names', () => {
    expect(normalizeMerchantName('SPOTIFY USA 12345 NEW YORK NY')).toBe('Spotify');
    expect(normalizeMerchantName('AMAZON.COM*MKTP US AMZN.COM/BILL WA')).toBe('Amazon');
    expect(normalizeMerchantName('WHOLEFDS SUGARLOAF GA')).toBe('Whole Foods');
  });

  it('summarizes transactions linked to an imported statement', () => {
    const statement: ImportedStatement = {
      id: 'statement-1',
      accountId: 'card-1',
      sourceType: 'credit_card',
      format: 'pdf',
      fileName: 'june-statement.pdf',
      importedAt: '2026-06-07T12:00:00.000Z',
      status: 'imported',
      parseVersion: 1,
      transactionCount: 3,
    };
    const transactions: Transaction[] = [
      { id: '1', amount: 120, type: 'expense', category: 'Groceries', date: '2026-06-01', description: 'Trader Joe', statementId: 'statement-1' },
      { id: '2', amount: 45, type: 'expense', category: 'Dining', date: '2026-06-02', description: 'Lunch', statementId: 'statement-1' },
      { id: '3', amount: 300, type: 'cc_payment', category: 'Credit Card', date: '2026-06-03', description: 'Payment', statementId: 'statement-1' },
      { id: '4', amount: 900, type: 'income', category: 'Salary', date: '2026-06-04', description: 'Paycheck', statementId: 'statement-2' },
    ];

    expect(summarizeStatementTransactions(statement, transactions)).toEqual({
      transactionCount: 3,
      expenseTotal: 165,
      incomeTotal: 0,
      paymentTotal: 300,
    });
  });

  it('classifies imported statement trust signals for later review', () => {
    const statement: ImportedStatement = {
      id: 'statement-risky',
      accountId: 'card-1',
      sourceType: 'credit_card',
      format: 'pdf',
      fileName: 'risky.pdf',
      importedAt: '2026-06-07T12:00:00.000Z',
      status: 'imported',
      parseVersion: 1,
      transactionCount: 2,
      reviewedTransactionCount: 4,
      duplicateCandidateCount: 2,
      reviewFlagCount: 4,
      mediumConfidenceCount: 1,
      lowConfidenceCount: 1,
    };
    const transactions: Transaction[] = [
      { id: '1', amount: 40, type: 'expense', category: 'Utilities', date: '2026-06-01', description: 'Utility Charge', statementId: 'statement-risky' },
      { id: '2', amount: 22, type: 'expense', category: 'Utilities', date: '2026-06-02', description: 'Power Charge', statementId: 'statement-risky' },
    ];

    expect(getStatementValidationSummary(statement, transactions)).toEqual({
      health: 'high_risk',
      excludedCount: 2,
      flaggedCount: 5,
      warnings: [
        '2 rows were excluded during review.',
        '2 potential duplicates were flagged.',
        '1 low-confidence row needs extra review.',
        '1 medium-confidence row was imported.',
      ],
    });
  });

  it('lets a manual bill override mark the current cycle as paid', () => {
    const bills = [
      {
        id: 'bill-1',
        name: 'Internet',
        dueDay: 18,
        amount: 85,
        category: 'Utilities',
        manualStatus: 'paid' as const,
        manualStatusMonth: '2026-06',
        manualPaidDate: '2026-06-14',
      },
    ];

    const statuses = getBillStatuses(bills, [], new Date('2026-06-15T12:00:00Z'));

    expect(statuses).toEqual([
      expect.objectContaining({
        billId: 'bill-1',
        status: 'paid',
        matchedTransactionDate: '2026-06-14',
        dueDate: '2026-07-18',
      }),
    ]);
  });
});
