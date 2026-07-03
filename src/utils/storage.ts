import { AppData } from '@/types';

export const APP_DATA_SCHEMA_VERSION = 2;

const APP_DATA_KEY = 'finance_tracker_app_data';
const LEGACY_TRANSACTIONS_KEY = 'finance_tracker_transactions';
const LEGACY_BUDGETS_KEY = 'finance_tracker_budgets';
const LEGACY_SALARY_KEY = 'finance_tracker_salary_schedule';
const LEGACY_ACCOUNTS_KEY = 'finance_tracker_accounts';
const LEGACY_STORAGE_KEYS = [
  LEGACY_TRANSACTIONS_KEY,
  LEGACY_BUDGETS_KEY,
  LEGACY_SALARY_KEY,
  LEGACY_ACCOUNTS_KEY,
] as const;

export type StoredAppData = Partial<AppData>;

const parseStoredJson = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse stored finance data', error);
    return null;
  }
};

export const createEmptyAppData = (): AppData => ({
  transactions: [],
  budgets: [],
  accounts: [],
  statements: [],
  electricityStatements: [],
  bills: [],
  salarySchedule: null,
  incomeSources: [],
  metadata: {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
  },
});

export const loadAppData = (): StoredAppData => {
  if (typeof window === 'undefined') {
    return createEmptyAppData();
  }

  const storedAppData = parseStoredJson<AppData>(localStorage.getItem(APP_DATA_KEY));
  if (storedAppData) {
    return {
      ...createEmptyAppData(),
      ...storedAppData,
      metadata: {
        ...storedAppData.metadata,
        schemaVersion: APP_DATA_SCHEMA_VERSION,
      },
    };
  }

  return {
    transactions: parseStoredJson(localStorage.getItem(LEGACY_TRANSACTIONS_KEY)) || [],
    budgets: parseStoredJson(localStorage.getItem(LEGACY_BUDGETS_KEY)) || [],
    accounts: parseStoredJson(localStorage.getItem(LEGACY_ACCOUNTS_KEY)) || [],
    statements: [],
    electricityStatements: [],
    bills: [],
    salarySchedule: parseStoredJson(localStorage.getItem(LEGACY_SALARY_KEY)),
    incomeSources: [],
  };
};

export const saveAppData = (appData: AppData) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({
      ...appData,
      metadata: {
        ...appData.metadata,
        schemaVersion: APP_DATA_SCHEMA_VERSION,
        lastSavedAt: new Date().toISOString(),
      },
    })
  );

  LEGACY_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const exportAppData = (appData: AppData) => ({
  ...appData,
  metadata: {
    ...appData.metadata,
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    lastBackupAt: new Date().toISOString(),
  },
});
