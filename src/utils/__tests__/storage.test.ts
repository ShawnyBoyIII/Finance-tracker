import { APP_DATA_SCHEMA_VERSION, loadAppData, saveAppData } from '../storage';
import { AppData } from '@/types';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads legacy per-resource localStorage data', () => {
    localStorage.setItem(
      'finance_tracker_transactions',
      JSON.stringify([
        {
          id: 'tx-1',
          date: '2026-06-01',
          amount: 100,
          type: 'expense',
          category: 'Groceries',
          description: 'Market',
        },
      ])
    );
    localStorage.setItem('finance_tracker_budgets', JSON.stringify([{ category: 'Groceries', amount: 500 }]));
    localStorage.setItem('finance_tracker_salary_schedule', JSON.stringify({ amount: 2000, nextPayDate: '2026-06-12' }));

    const appData = loadAppData();

    expect(appData.transactions).toHaveLength(1);
    expect(appData.budgets).toEqual([{ category: 'Groceries', amount: 500 }]);
    expect(appData.salarySchedule).toEqual({ amount: 2000, nextPayDate: '2026-06-12' });
    expect(appData.incomeSources).toEqual([]);
  });

  it('saves and reloads the unified versioned app data record', () => {
    const appData: AppData = {
      transactions: [],
      budgets: [],
      accounts: [{ id: 'cash-1', name: 'Household Cash Flow', type: 'cash' }],
      salarySchedule: null,
      incomeSources: [{ id: 'income-1', name: 'Partner A', amount: 2500, nextPayDate: '2026-06-12' }],
      metadata: {
        schemaVersion: APP_DATA_SCHEMA_VERSION,
      },
    };

    saveAppData(appData);

    const loadedAppData = loadAppData();

    expect(loadedAppData.accounts).toEqual(appData.accounts);
    expect(loadedAppData.incomeSources).toEqual(appData.incomeSources);
    expect(loadedAppData.metadata?.schemaVersion).toBe(APP_DATA_SCHEMA_VERSION);
    expect(loadedAppData.metadata?.lastSavedAt).toEqual(expect.any(String));
  });

  it('removes legacy storage keys after saving unified app data', () => {
    localStorage.setItem('finance_tracker_transactions', JSON.stringify([{ id: 'tx-legacy' }]));
    localStorage.setItem('finance_tracker_budgets', JSON.stringify([{ category: 'Legacy', amount: 100 }]));
    localStorage.setItem('finance_tracker_accounts', JSON.stringify([{ id: 'acc-legacy' }]));
    localStorage.setItem('finance_tracker_salary_schedule', JSON.stringify({ amount: 500, nextPayDate: '2026-06-20' }));

    saveAppData({
      transactions: [],
      budgets: [],
      accounts: [],
      salarySchedule: null,
      incomeSources: [],
      metadata: {
        schemaVersion: APP_DATA_SCHEMA_VERSION,
      },
    });

    expect(localStorage.getItem('finance_tracker_transactions')).toBeNull();
    expect(localStorage.getItem('finance_tracker_budgets')).toBeNull();
    expect(localStorage.getItem('finance_tracker_accounts')).toBeNull();
    expect(localStorage.getItem('finance_tracker_salary_schedule')).toBeNull();
  });
});
