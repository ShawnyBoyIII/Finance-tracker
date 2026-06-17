export type TransactionType = 'income' | 'expense' | 'cc_payment';
export type FinancialAccountType = 'cash' | 'bank' | 'credit_card';
export type StatementSourceType = 'bank' | 'credit_card';
export type StatementImportFormat = 'csv' | 'pdf';
export type ImportedStatementStatus = 'review' | 'imported' | 'failed';

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
  sourceType?: StatementSourceType;
  statementId?: string;
}

export interface ImportedStatement {
  id: string;
  accountId: string;
  sourceType: StatementSourceType;
  format: StatementImportFormat;
  fileName: string;
  institution?: string;
  parserProfile?: string;
  periodStart?: string;
  periodEnd?: string;
  importedAt: string;
  status: ImportedStatementStatus;
  parseVersion: number;
  transactionCount: number;
  reviewedTransactionCount?: number;
  duplicateCandidateCount?: number;
  reviewFlagCount?: number;
  mediumConfidenceCount?: number;
  lowConfidenceCount?: number;
}

export interface Budget {
  category: string;
  amount: number;
}

export interface Bill {
  id: string;
  name: string;
  dueDay: number;
  amount?: number;
  usageKwh?: number;
  category?: string;
  accountId?: string;
  autopay?: boolean;
  manualStatus?: 'paid' | 'unpaid';
  manualStatusMonth?: string;
  manualPaidDate?: string;
}

export interface ElectricityStatement {
  id: string;
  provider: string;
  accountNumber: string;
  billDate: string;
  dueDate: string;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  daysOfService?: number;
  ratePlan?: string;
  previousBalance?: number;
  paymentAmount?: number;
  totalDue: number;
  totalConsumptionKwh?: number;
  solarGenerationKwh?: number;
  billedConsumptionKwh?: number;
  sourceFileName: string;
  importedAt: string;
}

export interface SalarySchedule {
  amount: number;
  nextPayDate: string;
}

export interface IncomeSource extends SalarySchedule {
  id: string;
  name: string;
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
  statements?: ImportedStatement[];
  electricityStatements?: ElectricityStatement[];
  bills?: Bill[];
  salarySchedule: SalarySchedule | null;
  incomeSources?: IncomeSource[];
  metadata: AppMetadata;
}
