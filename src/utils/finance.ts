import { Transaction } from '@/types';

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expensesByCategory: { name: string; value: number }[];
}

export const summarizeTransactions = (transactions: Transaction[]): FinancialSummary => {
  let income = 0;
  let expense = 0;
  const categories: Record<string, number> = {};

  transactions.forEach((transaction) => {
    if (transaction.type === 'income') {
      income += transaction.amount;
      return;
    }

    if (transaction.type === 'cc_payment') {
      income += Math.abs(transaction.amount);
      return;
    }

    expense += transaction.amount;
    categories[transaction.category] = (categories[transaction.category] || 0) + transaction.amount;
  });

  const expensesByCategory = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    totalIncome: income,
    totalExpense: expense,
    balance: income - expense,
    expensesByCategory,
  };
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
