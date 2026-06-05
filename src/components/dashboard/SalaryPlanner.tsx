'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Save, Trash2, Wallet } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS } from '@/utils/constants';
import { formatCurrency } from '@/utils/finance';
import { getProjectedIncome, getUpcomingPaychecks } from '@/utils/salary';

const DEFAULT_NEXT_PAY_DATE = format(addDays(new Date(), 7), 'yyyy-MM-dd');

export default function SalaryPlanner() {
  const { salarySchedule, setSalarySchedule } = useFinance();
  const [amount, setAmount] = useState('');
  const [nextPayDate, setNextPayDate] = useState(DEFAULT_NEXT_PAY_DATE);

  useEffect(() => {
    if (salarySchedule) {
      setAmount(String(salarySchedule.amount));
      setNextPayDate(salarySchedule.nextPayDate);
      return;
    }

    setAmount('');
    setNextPayDate(DEFAULT_NEXT_PAY_DATE);
  }, [salarySchedule]);

  const upcomingPaychecks = useMemo(() => getUpcomingPaychecks(salarySchedule, 6), [salarySchedule]);
  const projectedIncome30Days = useMemo(() => getProjectedIncome(salarySchedule, 30), [salarySchedule]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!amount || Number.isNaN(Number(amount))) return;

    setSalarySchedule({
      amount: Number(amount),
      nextPayDate,
    });
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your salary schedule?')) {
      setSalarySchedule(null);
    }
  };

  return (
    <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">Paycheck calendar</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Set your bi-weekly salary so the app can project income and keep the spending guardrails honest.
          </p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-md px-4 py-3 min-w-[180px]">
          <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Projected income</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{formatCurrency(projectedIncome30Days)}</p>
          <p className="text-xs text-indigo-700 mt-1">next 30 days</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Bi-weekly salary</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className={COMMON_INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Next payday</label>
          <input
            type="date"
            required
            value={nextPayDate}
            onChange={(event) => setNextPayDate(event.target.value)}
            className={COMMON_INPUT_CLASS}
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            Save schedule
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Upcoming paydays</h4>
            <span className="text-xs text-gray-500 inline-flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              bi-weekly
            </span>
          </div>

          {upcomingPaychecks.length === 0 ? (
            <p className="text-sm text-gray-500">
              Add your salary above to see the calendar and projected income.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {upcomingPaychecks.map((paycheck, index) => (
                <div key={paycheck.isoDate} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Paycheck {index + 1}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{paycheck.label}</p>
                  <p className="text-base font-bold text-green-600 mt-2">
                    {formatCurrency(paycheck.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">What this gives you</h4>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              You can see the next paycheck before it lands, which makes the rest of the month feel a lot
              less foggy.
            </p>
            <p>
              The dashboard uses this schedule to calculate projected income, which helps separate actual
              spendable cash from the number that just happens to be sitting in the account right now.
            </p>
          </div>
          <div className="mt-4 rounded-md bg-white border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next paycheck</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {upcomingPaychecks[0]?.label ?? 'Not set yet'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {upcomingPaychecks[0] ? formatCurrency(upcomingPaychecks[0].amount) : 'Add a salary to project income.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
