'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2, Wallet } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS } from '@/utils/constants';
import { formatCurrency } from '@/utils/finance';
import { getProjectedIncomeFromSources, getUpcomingIncomeSourcesPaychecks } from '@/utils/salary';

const DEFAULT_NEXT_PAY_DATE = format(addDays(new Date(), 7), 'yyyy-MM-dd');

export default function SalaryPlanner() {
  const { incomeSources, addIncomeSource, deleteIncomeSource } = useFinance();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [nextPayDate, setNextPayDate] = useState(DEFAULT_NEXT_PAY_DATE);

  const upcomingPaychecks = useMemo(
    () => getUpcomingIncomeSourcesPaychecks(incomeSources, 8),
    [incomeSources]
  );
  const projectedIncome30Days = useMemo(
    () => getProjectedIncomeFromSources(incomeSources, 30),
    [incomeSources]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !amount || Number.isNaN(Number(amount))) return;

    addIncomeSource({
      name: name.trim(),
      amount: Number(amount),
      nextPayDate,
    });

    setName('');
    setAmount('');
    setNextPayDate(DEFAULT_NEXT_PAY_DATE);
  };

  return (
    <section className="cockpit-panel rounded-3xl p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-cyan-300" />
            <h3 className="text-lg font-medium text-white">Household income planner</h3>
          </div>
          <p className="text-sm cockpit-muted mt-1">
            Add each paycheck source so the app can project income for single or dual-income households.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 min-w-[180px]">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-200">Projected income</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(projectedIncome30Days)}</p>
          <p className="text-xs text-cyan-100/80 mt-1">next 30 days</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">Income source</label>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Partner A"
            className={COMMON_INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">Bi-weekly amount</label>
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
          <label className="block text-sm font-medium text-slate-200">Next payday</label>
          <input
            type="date"
            required
            value={nextPayDate}
            onChange={(event) => setNextPayDate(event.target.value)}
            className={COMMON_INPUT_CLASS}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-medium text-slate-950 hover:from-cyan-300 hover:to-indigo-400"
          >
            <Plus className="w-4 h-4" />
            Add income
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-white/10 p-4 bg-slate-950/20">
          <h4 className="text-sm font-semibold text-white mb-3">Income sources</h4>
          {incomeSources.length === 0 ? (
            <p className="text-sm cockpit-muted">
              Add at least one paycheck source to start forecasting household income.
            </p>
          ) : (
            <div className="space-y-3">
              {incomeSources.map((incomeSource) => (
                <div key={incomeSource.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{incomeSource.name}</p>
                    <p className="text-sm cockpit-muted mt-1">
                      {formatCurrency(incomeSource.amount)} every two weeks
                    </p>
                    <p className="text-xs cockpit-muted mt-1">Next payday: {format(new Date(`${incomeSource.nextPayDate}T00:00:00`), 'EEE, MMM d')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteIncomeSource(incomeSource.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/15"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 p-4 bg-slate-950/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Upcoming paydays</h4>
            <span className="text-xs cockpit-muted inline-flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              household view
            </span>
          </div>

          {upcomingPaychecks.length === 0 ? (
            <p className="text-sm cockpit-muted">
              Add income sources above to see the combined paycheck calendar.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcomingPaychecks.map((paycheck, index) => (
                <div key={`${paycheck.sourceName}-${paycheck.isoDate}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs font-medium cockpit-muted uppercase tracking-wide">
                    {paycheck.sourceName || `Paycheck ${index + 1}`}
                  </p>
                  <p className="text-sm font-semibold text-white mt-1">{paycheck.label}</p>
                  <p className="text-base font-bold text-emerald-300 mt-2">
                    {formatCurrency(paycheck.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
