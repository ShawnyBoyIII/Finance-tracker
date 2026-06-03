import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns';
import { SalarySchedule } from '@/types';

export const BIWEEKLY_PAY_PERIOD_DAYS = 14;

export interface PaycheckProjection {
  date: Date;
  isoDate: string;
  label: string;
  amount: number;
}

const safeParseDate = (dateStr: string) => {
  const parsed = parseISO(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getNextPayDate = (schedule: SalarySchedule | null, referenceDate = new Date()) => {
  if (!schedule) return null;

  const originalPayDate = safeParseDate(schedule.nextPayDate);
  if (!originalPayDate) return null;

  const referenceDay = startOfDay(referenceDate);
  let payDate = startOfDay(originalPayDate);

  while (isBefore(payDate, referenceDay)) {
    payDate = addDays(payDate, BIWEEKLY_PAY_PERIOD_DAYS);
  }

  return payDate;
};

export const getUpcomingPaychecks = (
  schedule: SalarySchedule | null,
  count = 6,
  referenceDate = new Date()
): PaycheckProjection[] => {
  const nextPayDate = getNextPayDate(schedule, referenceDate);

  if (!schedule || !nextPayDate) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const payDate = addDays(nextPayDate, index * BIWEEKLY_PAY_PERIOD_DAYS);

    return {
      date: payDate,
      isoDate: format(payDate, 'yyyy-MM-dd'),
      label: format(payDate, 'EEE, MMM d'),
      amount: schedule.amount,
    };
  });
};

export const getProjectedIncome = (
  schedule: SalarySchedule | null,
  daysAhead = 30,
  referenceDate = new Date()
) => {
  if (!schedule) return 0;

  const nextPayDate = getNextPayDate(schedule, referenceDate);
  if (!nextPayDate) return 0;

  const windowEnd = addDays(startOfDay(referenceDate), daysAhead);
  let total = 0;
  let payDate = nextPayDate;

  while (!isBefore(windowEnd, payDate)) {
    total += schedule.amount;
    payDate = addDays(payDate, BIWEEKLY_PAY_PERIOD_DAYS);
  }

  return total;
};
