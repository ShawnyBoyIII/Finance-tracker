export type TransactionType = 'income' | 'expense' | 'cc_payment';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
}

export interface Budget {
  category: string;
  amount: number;
}
