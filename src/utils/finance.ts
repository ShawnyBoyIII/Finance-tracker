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

export interface RecurringBill {
  name: string;
  category: string;
  institution?: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  averageAmount: number;
  lastAmount: number;
  occurrences: number;
  lastDate: string;
  nextExpectedDate: string;
}

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeDescription = (description: string) =>
  description
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getDateDifferenceInDays = (firstDate: string, secondDate: string) => {
  const first = new Date(`${firstDate}T00:00:00`);
  const second = new Date(`${secondDate}T00:00:00`);
  return Math.round((second.getTime() - first.getTime()) / DAY_IN_MS);
};

const addDaysToIsoDate = (date: string, days: number) => {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

const getCadenceForIntervals = (intervals: number[]) => {
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  if (averageInterval >= 6 && averageInterval <= 8) {
    return { cadence: 'weekly' as const, intervalDays: 7 };
  }

  if (averageInterval >= 12 && averageInterval <= 16) {
    return { cadence: 'biweekly' as const, intervalDays: 14 };
  }

  if (averageInterval >= 25 && averageInterval <= 35) {
    return { cadence: 'monthly' as const, intervalDays: 30 };
  }

  return null;
};

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

export const detectRecurringBills = (
  transactions: Transaction[],
  referenceDate = new Date()
): RecurringBill[] => {
  const expenseTransactions = transactions.filter((transaction) => {
    if (transaction.type !== 'expense') {
      return false;
    }

    if (transaction.amount <= 0) {
      return false;
    }

    return normalizeDescription(transaction.description).length > 0;
  });

  const groupedTransactions = new Map<string, Transaction[]>();

  expenseTransactions.forEach((transaction) => {
    const normalizedDescription = normalizeDescription(transaction.description);
    const key = [normalizedDescription, transaction.category.toLowerCase(), transaction.institution?.toLowerCase() || '']
      .join('|');

    if (!groupedTransactions.has(key)) {
      groupedTransactions.set(key, []);
    }

    groupedTransactions.get(key)?.push(transaction);
  });

  const recurringBills: RecurringBill[] = [];

  groupedTransactions.forEach((group) => {
    if (group.length < 2) {
      return;
    }

    const sortedGroup = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const intervals = sortedGroup.slice(1).map((transaction, index) =>
      getDateDifferenceInDays(sortedGroup[index].date, transaction.date)
    );
    const cadenceMatch = getCadenceForIntervals(intervals);

    if (!cadenceMatch) {
      return;
    }

    const lastTransaction = sortedGroup[sortedGroup.length - 1];
    const nextExpectedDate = addDaysToIsoDate(lastTransaction.date, cadenceMatch.intervalDays);
    const daysUntilNext = getDateDifferenceInDays(referenceDate.toISOString().slice(0, 10), nextExpectedDate);

    if (daysUntilNext < -7) {
      return;
    }

    const totalAmount = sortedGroup.reduce((sum, transaction) => sum + transaction.amount, 0);
    recurringBills.push({
      name: lastTransaction.description,
      category: lastTransaction.category,
      institution: lastTransaction.institution,
      cadence: cadenceMatch.cadence,
      averageAmount: totalAmount / sortedGroup.length,
      lastAmount: lastTransaction.amount,
      occurrences: sortedGroup.length,
      lastDate: lastTransaction.date,
      nextExpectedDate,
    });
  });

  return recurringBills.sort((a, b) => a.nextExpectedDate.localeCompare(b.nextExpectedDate));
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
