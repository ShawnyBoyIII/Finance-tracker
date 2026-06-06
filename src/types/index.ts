export type TransactionType = 'income' | 'expense' | 'cc_payment';
export type FinancialAccountType = 'cash' | 'bank' | 'credit_card';

export interface FinancialAccount {
  id: string;
  name: string;
  type: FinancialAccountType;
  issuer?: string;
  last4?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  accountId?: string;
  institution?: string;
}

export interface Budget {
  category: string;
  amount: number;
}

export interface SalarySchedule {
  amount: number;
  nextPayDate: string;
}

export interface AppMetadata {
  schemaVersion: number;
  lastSavedAt?: string;
  lastBackupAt?: string;
}

export interface AppData {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: FinancialAccount[];
  salarySchedule: SalarySchedule | null;
  metadata: AppMetadata;
}
