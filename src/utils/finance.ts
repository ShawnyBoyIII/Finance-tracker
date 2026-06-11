import { Bill, ImportedStatement, Transaction } from '@/types';

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

export interface StatementSummary {
  transactionCount: number;
  expenseTotal: number;
  incomeTotal: number;
  paymentTotal: number;
}

export interface StatementValidationSummary {
  health: 'healthy' | 'needs_review' | 'high_risk';
  excludedCount: number;
  flaggedCount: number;
  warnings: string[];
}

export interface ElectricityMonthlyDatum {
  monthKey: string;
  monthLabel: string;
  amount: number;
  isCurrentMonth: boolean;
}

export interface ElectricityMetrics {
  currentMonthSpend: number;
  lastBillAmount: number;
  threeMonthAverage: number;
  vsLastMonthAmount: number;
  latestChargeAmount: number;
  latestChargeDate: string | null;
}

export interface ElectricityHealthSummary {
  status: 'healthy' | 'watch' | 'urgent';
  title: string;
  detail: string;
}

export interface ElectricityInsightSummary {
  title: string;
  detail: string;
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

const getShortMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);

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

export const summarizeStatementTransactions = (
  statement: ImportedStatement,
  transactions: Transaction[]
): StatementSummary => {
  const linkedTransactions = transactions.filter((transaction) => transaction.statementId === statement.id);

  return linkedTransactions.reduce<StatementSummary>(
    (summary, transaction) => {
      summary.transactionCount += 1;

      if (transaction.type === 'income') {
        summary.incomeTotal += transaction.amount;
      } else if (transaction.type === 'cc_payment') {
        summary.paymentTotal += Math.abs(transaction.amount);
      } else {
        summary.expenseTotal += Math.abs(transaction.amount);
      }

      return summary;
    },
    {
      transactionCount: 0,
      expenseTotal: 0,
      incomeTotal: 0,
      paymentTotal: 0,
    }
  );
};

export const getStatementTransactions = (
  statement: ImportedStatement,
  transactions: Transaction[]
) => transactions.filter((transaction) => transaction.statementId === statement.id);

export const getStatementValidationSummary = (
  statement: ImportedStatement,
  transactions: Transaction[]
): StatementValidationSummary => {
  const linkedTransactions = getStatementTransactions(statement, transactions);
  const reviewedCount = statement.reviewedTransactionCount || statement.transactionCount;
  const excludedCount = Math.max(reviewedCount - linkedTransactions.length, 0);
  const duplicateCount = statement.duplicateCandidateCount || 0;
  const reviewFlagCount = statement.reviewFlagCount || 0;
  const lowConfidenceCount = statement.lowConfidenceCount || 0;
  const mediumConfidenceCount = statement.mediumConfidenceCount || 0;
  const flaggedCount =
    duplicateCount + lowConfidenceCount + Math.max(reviewFlagCount - duplicateCount, 0);

  const warnings: string[] = [];

  if (excludedCount > 0) {
    warnings.push(`${excludedCount} row${excludedCount === 1 ? '' : 's'} were excluded during review.`);
  }

  if (duplicateCount > 0) {
    warnings.push(`${duplicateCount} potential duplicate${duplicateCount === 1 ? '' : 's'} were flagged.`);
  }

  if (lowConfidenceCount > 0) {
    warnings.push(
      `${lowConfidenceCount} low-confidence row${lowConfidenceCount === 1 ? '' : 's'} ${lowConfidenceCount === 1 ? 'needs' : 'need'} extra review.`
    );
  }

  if (mediumConfidenceCount > 0) {
    warnings.push(
      `${mediumConfidenceCount} medium-confidence row${mediumConfidenceCount === 1 ? '' : 's'} ${mediumConfidenceCount === 1 ? 'was' : 'were'} imported.`
    );
  }

  if (reviewFlagCount > 0 && lowConfidenceCount === 0 && duplicateCount === 0) {
    warnings.push(`${reviewFlagCount} parser or cleanup flag${reviewFlagCount === 1 ? '' : 's'} were recorded during import.`);
  }

  if (linkedTransactions.length === 0) {
    warnings.push('No linked transactions are currently attached to this statement.');
  }

  let health: StatementValidationSummary['health'] = 'healthy';

  if (lowConfidenceCount > 0 || duplicateCount >= 2 || linkedTransactions.length === 0) {
    health = 'high_risk';
  } else if (excludedCount > 0 || mediumConfidenceCount > 0 || reviewFlagCount > 0) {
    health = 'needs_review';
  }

  return {
    health,
    excludedCount,
    flaggedCount,
    warnings,
  };
};

export const getElectricityMonthlySeries = (
  transactions: Transaction[],
  months = 12,
  referenceDate = new Date()
): ElectricityMonthlyDatum[] => {
  const entries: ElectricityMonthlyDatum[] = [];
  const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  for (let index = months - 1; index >= 0; index -= 1) {
    const monthDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
    const monthKey = getMonthKey(monthDate);
    const amount = transactions
      .filter((transaction) => transaction.date.slice(0, 7) === monthKey)
      .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);

    entries.push({
      monthKey,
      monthLabel: getShortMonthLabel(monthDate),
      amount,
      isCurrentMonth: monthKey === getMonthKey(referenceDate),
    });
  }

  return entries;
};

export const getElectricityMetrics = (
  transactions: Transaction[],
  referenceDate = new Date()
): ElectricityMetrics => {
  const monthlySeries = getElectricityMonthlySeries(transactions, 3, referenceDate);
  const currentMonthSpend = monthlySeries[2]?.amount || 0;
  const previousMonthSpend = monthlySeries[1]?.amount || 0;
  const nonZeroMonths = monthlySeries.filter((entry) => entry.amount > 0);
  const threeMonthAverage =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((total, entry) => total + entry.amount, 0) / nonZeroMonths.length
      : 0;
  const latestCharge = [...transactions].sort((left, right) => right.date.localeCompare(left.date))[0];

  return {
    currentMonthSpend,
    lastBillAmount: previousMonthSpend,
    threeMonthAverage,
    vsLastMonthAmount: currentMonthSpend - previousMonthSpend,
    latestChargeAmount: latestCharge ? Math.abs(latestCharge.amount) : 0,
    latestChargeDate: latestCharge?.date || null,
  };
};

export const getElectricityHealth = (
  billStatuses: BillStatus[],
  accountMap: Map<string, { name: string }>
): ElectricityHealthSummary => {
  const nextDue = billStatuses[0];

  if (!nextDue) {
    return {
      status: 'watch',
      title: 'No bill tracked yet',
      detail: 'Add your electricity bill so this page can track due dates and payment status.',
    };
  }

  if (nextDue.status === 'overdue') {
    return {
      status: 'urgent',
      title: 'Electric bill overdue',
      detail: `${nextDue.name} is overdue${nextDue.accountId ? ` on ${accountMap.get(nextDue.accountId)?.name || 'its account'}` : ''}.`,
    };
  }

  if (nextDue.status === 'upcoming' && nextDue.daysUntilDue <= 5) {
    return {
      status: 'watch',
      title: 'Due soon',
      detail: `${nextDue.name} is due in ${nextDue.daysUntilDue} day(s).`,
    };
  }

  return {
    status: 'healthy',
    title: 'Electric bill on track',
    detail: `${nextDue.name} is currently marked ${nextDue.status}.`,
  };
};

export const getElectricityInsight = (
  metrics: ElectricityMetrics,
  health: ElectricityHealthSummary,
  monthlyData: ElectricityMonthlyDatum[]
): ElectricityInsightSummary => {
  if (health.status === 'urgent') {
    return {
      title: 'Immediate attention needed',
      detail: health.detail,
    };
  }

  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];

  if (currentMonth && previousMonth && previousMonth.amount > 0 && currentMonth.amount > previousMonth.amount * 1.2) {
    return {
      title: 'Usage spike detected',
      detail: `Current month electricity spend is ${formatCurrency(currentMonth.amount - previousMonth.amount)} above last month so far.`,
    };
  }

  if (metrics.vsLastMonthAmount < 0) {
    return {
      title: 'Trending lower than last month',
      detail: `Electricity spend is down ${formatCurrency(Math.abs(metrics.vsLastMonthAmount))} compared with last month.`,
    };
  }

  return {
    title: 'Stable utility pattern',
    detail: metrics.threeMonthAverage > 0
      ? `Three-month average is ${formatCurrency(metrics.threeMonthAverage)} and the latest charge is ${formatCurrency(metrics.latestChargeAmount)}.`
      : 'Import more electricity activity to unlock stronger billing insights.',
  };
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
