import { Transaction } from '@/types';

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expensesByCategory: { name: string; value: number }[];
}

export interface MonthlyFinancialSummary extends FinancialSummary {
  monthLabel: string;
  savings: number;
}

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

export const isTransactionInMonth = (transaction: Transaction, referenceDate = new Date()) =>
  transaction.date.slice(0, 7) === getMonthKey(referenceDate);

export const summarizeTransactions = (transactions: Transaction[]): FinancialSummary => {
  let income = 0;
  let expense = 0;
  const categories: Record<string, number> = Object.create(null);

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

export const summarizeMonthlyTransactions = (
  transactions: Transaction[],
  referenceDate = new Date()
): MonthlyFinancialSummary => {
  const monthlyTransactions = transactions.filter((transaction) =>
    isTransactionInMonth(transaction, referenceDate)
  );
  const summary = summarizeTransactions(monthlyTransactions);

  return {
    ...summary,
    monthLabel: getMonthLabel(referenceDate),
    savings: summary.totalIncome - summary.totalExpense,
  };
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
