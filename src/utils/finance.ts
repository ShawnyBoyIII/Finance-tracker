import { Bill, Transaction } from '@/types';

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

export interface BillStatus {
  billId: string;
  name: string;
  dueDate: string;
  amount?: number;
  category?: string;
  accountId?: string;
  autopay?: boolean;
  status: 'paid' | 'upcoming' | 'overdue';
  matchedTransactionDate?: string;
  matchedTransactionAmount?: number;
  daysUntilDue: number;
}

export interface PotentialDuplicateMatch {
  importedTransactionId: string;
  existingTransactionIds: string[];
  duplicateFingerprint: string;
}

const MERCHANT_NORMALIZATION_RULES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /spotify/i, canonical: 'Spotify' },
  { pattern: /netflix/i, canonical: 'Netflix' },
  { pattern: /hulu/i, canonical: 'Hulu' },
  { pattern: /youtube|google youtube/i, canonical: 'YouTube' },
  { pattern: /apple|icloud|app store/i, canonical: 'Apple' },
  { pattern: /amazon|amzn/i, canonical: 'Amazon' },
  { pattern: /target/i, canonical: 'Target' },
  { pattern: /walmart/i, canonical: 'Walmart' },
  { pattern: /whole ?fds|whole foods/i, canonical: 'Whole Foods' },
  { pattern: /publix/i, canonical: 'Publix' },
  { pattern: /tello/i, canonical: 'Tello' },
  { pattern: /adobe/i, canonical: 'Adobe' },
  { pattern: /planet fitness|fitness|gym/i, canonical: 'Gym Membership' },
];

const normalizeMerchantKey = (description: string) =>
  description
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeMerchantName = (description: string) => {
  const trimmedDescription = description.trim();

  if (!trimmedDescription) {
    return '';
  }

  const knownRule = MERCHANT_NORMALIZATION_RULES.find((rule) => rule.pattern.test(trimmedDescription));
  if (knownRule) {
    return knownRule.canonical;
  }

  const normalizedKey = normalizeMerchantKey(trimmedDescription);
  if (!normalizedKey) {
    return trimmedDescription;
  }

  return normalizedKey
    .split(' ')
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeDescription = normalizeMerchantKey;

const buildDuplicateFingerprint = (transaction: Pick<Transaction, 'date' | 'amount' | 'description' | 'accountId'>) =>
  [
    transaction.accountId || '',
    transaction.date,
    Math.abs(transaction.amount).toFixed(2),
    normalizeDescription(transaction.description),
  ].join('|');

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

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const getDaysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const buildDueDate = (referenceDate: Date, dueDay: number) => {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const dueDate = new Date(year, monthIndex, Math.min(dueDay, getDaysInMonth(year, monthIndex)));
  return toIsoDate(dueDate);
};

const buildNextMonthDueDate = (referenceDate: Date, dueDay: number) => {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth() + 1;
  const nextDueDate = new Date(year, monthIndex, Math.min(dueDay, getDaysInMonth(year, monthIndex)));
  return toIsoDate(nextDueDate);
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
      name: normalizeMerchantName(lastTransaction.description),
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

export const getBillStatuses = (
  bills: Bill[],
  transactions: Transaction[],
  referenceDate = new Date()
): BillStatus[] => {
  const todayIso = toIsoDate(referenceDate);

  return bills
    .map((bill) => {
      const currentMonthDueDate = buildDueDate(referenceDate, bill.dueDay);
      const monthKey = currentMonthDueDate.slice(0, 7);
      const matchingTransactions = transactions
        .filter((transaction) => {
          if (transaction.type !== 'expense') return false;
          if (bill.accountId && transaction.accountId !== bill.accountId) return false;
          if (bill.category && transaction.category !== bill.category) return false;
          if (transaction.date.slice(0, 7) !== monthKey) return false;

          const normalizedBillName = normalizeDescription(bill.name);
          const normalizedTransactionName = normalizeDescription(transaction.description || transaction.category);
          return normalizedTransactionName.includes(normalizedBillName) || normalizedBillName.includes(normalizedTransactionName);
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      const matchedTransaction = matchingTransactions[0];
      const manualOverrideApplies = bill.manualStatusMonth === monthKey && bill.manualStatus;
      const isPaid = manualOverrideApplies
        ? bill.manualStatus === 'paid'
        : Boolean(matchedTransaction && matchedTransaction.date <= currentMonthDueDate);
      const dueDate = isPaid ? buildNextMonthDueDate(referenceDate, bill.dueDay) : currentMonthDueDate;
      const daysUntilDue = getDateDifferenceInDays(todayIso, dueDate);
      const status: BillStatus['status'] = isPaid ? 'paid' : daysUntilDue < 0 ? 'overdue' : 'upcoming';

      return {
        billId: bill.id,
        name: bill.name,
        dueDate,
        amount: bill.amount,
        category: bill.category,
        accountId: bill.accountId,
        autopay: bill.autopay,
        status,
        matchedTransactionDate: manualOverrideApplies && bill.manualStatus === 'paid'
          ? bill.manualPaidDate || todayIso
          : matchedTransaction?.date,
        matchedTransactionAmount: matchedTransaction?.amount,
        daysUntilDue,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const getDueSoonBills = (
  bills: Bill[],
  transactions: Transaction[],
  referenceDate = new Date(),
  daysAhead = 14
) =>
  getBillStatuses(bills, transactions, referenceDate).filter(
    (bill) => bill.status !== 'paid' || bill.daysUntilDue <= daysAhead
  );

export const getSuggestedCategory = (
  description: string,
  transactions: Transaction[],
  fallbackCategory = 'Uncategorized'
) => {
  const normalizedDescription = normalizeMerchantName(description);

  if (!normalizedDescription) {
    return fallbackCategory;
  }

  const categoryCounts = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (transaction.category === fallbackCategory) {
      return;
    }

    if (normalizeMerchantName(transaction.description) !== normalizedDescription) {
      return;
    }

    categoryCounts.set(transaction.category, (categoryCounts.get(transaction.category) || 0) + 1);
  });

  const [bestMatch] = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);
  return bestMatch?.[0] || fallbackCategory;
};

export const findPotentialTransactionDuplicates = (
  importedTransactions: Transaction[],
  existingTransactions: Transaction[]
): PotentialDuplicateMatch[] => {
  const existingFingerprints = new Map<string, string[]>();

  existingTransactions.forEach((transaction) => {
    const fingerprint = buildDuplicateFingerprint(transaction);
    const matches = existingFingerprints.get(fingerprint) || [];
    matches.push(transaction.id);
    existingFingerprints.set(fingerprint, matches);
  });

  return importedTransactions
    .map((transaction) => {
      const fingerprint = buildDuplicateFingerprint(transaction);
      return {
        importedTransactionId: transaction.id,
        existingTransactionIds: existingFingerprints.get(fingerprint) || [],
        duplicateFingerprint: fingerprint,
      };
    })
    .filter((match) => match.existingTransactionIds.length > 0);
};

export const findBatchDuplicates = (transactions: Transaction[]) => {
  const groupedIds = new Map<string, string[]>();

  transactions.forEach((transaction) => {
    const fingerprint = buildDuplicateFingerprint(transaction);
    const matches = groupedIds.get(fingerprint) || [];
    matches.push(transaction.id);
    groupedIds.set(fingerprint, matches);
  });

  return new Map(
    Array.from(groupedIds.entries()).filter(([, ids]) => ids.length > 1)
  );
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
