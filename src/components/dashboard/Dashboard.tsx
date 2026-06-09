'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, ArrowUpRight, CalendarClock, Radar, ShieldCheck, Tv, WalletCards } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useFinance } from '@/context/FinanceContext';
import SalaryPlanner from './SalaryPlanner';
import BillPlanner from './BillPlanner';
import { detectRecurringBills, formatCurrency, summarizeMonthlyTransactions, summarizeTransactions } from '@/utils/finance';
import { getProjectedIncomeFromSources, getUpcomingIncomeSourcesPaychecks } from '@/utils/salary';
import { formatISODate } from '@/utils/constants';

const CATEGORY_COLORS = ['#ff6384', '#ffc947', '#44d3ff', '#907aff', '#54d69f', '#ff8c5a', '#9bd2ff'];

const cadenceTone: Record<string, string> = {
  weekly: 'text-cyan-200 bg-cyan-400/10 border-cyan-400/20',
  biweekly: 'text-violet-200 bg-violet-400/10 border-violet-400/20',
  monthly: 'text-amber-200 bg-amber-400/10 border-amber-400/20',
};

export default function Dashboard() {
  const { transactions, incomeSources, accounts } = useFinance();

  const { totalIncome, totalExpense, balance, expensesByCategory } = useMemo(
    () => summarizeTransactions(transactions),
    [transactions]
  );

  const monthlySummary = useMemo(
    () => summarizeMonthlyTransactions(transactions),
    [transactions]
  );

  const projectedIncome30Days = useMemo(
    () => getProjectedIncomeFromSources(incomeSources, 30),
    [incomeSources]
  );

  const recurringBills = useMemo(() => detectRecurringBills(transactions), [transactions]);
  const upcomingPaychecks = useMemo(() => getUpcomingIncomeSourcesPaychecks(incomeSources, 4), [incomeSources]);
  const recentTransactions = useMemo(() => [...transactions].sort((a, b) => b.date < a.date ? -1 : b.date > a.date ? 1 : 0).slice(0, 5), [transactions]);
  const focusCategories = useMemo(() => monthlySummary.expensesByCategory.slice(0, 5), [monthlySummary.expensesByCategory]);
  const cardSummaries = useMemo(() => {
    return accounts
      .filter((account) => account.type === 'credit_card')
      .map((account) => {
        const accountTransactions = transactions.filter((transaction) => transaction.accountId === account.id);
        const monthlyTransactions = accountTransactions.filter((transaction) => transaction.date.slice(0, 7) === new Date().toISOString().slice(0, 7));
        const charges = monthlyTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const payments = monthlyTransactions
          .filter((transaction) => transaction.type === 'cc_payment')
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        const recurringCount = recurringBills.filter((bill) => bill.institution === account.issuer || bill.institution === account.name).length;

        return {
          id: account.id,
          name: account.name,
          issuer: account.issuer,
          last4: account.last4,
          charges,
          payments,
          openItems: Math.max(charges - payments, 0),
          recurringCount,
        };
      })
      .sort((a, b) => b.openItems - a.openItems);
  }, [accounts, transactions, recurringBills]);
  const subscriptionWatchlist = useMemo(() => {
    const subscriptionPattern = /subscription|spotify|netflix|hulu|youtube|apple|icloud|gym|membership|prime|adobe|software|streaming/i;

    return recurringBills
      .filter((bill) => bill.cadence === 'monthly')
      .filter((bill) => subscriptionPattern.test(`${bill.name} ${bill.category} ${bill.institution || ''}`) || bill.averageAmount <= 100)
      .sort((a, b) => a.averageAmount - b.averageAmount)
      .slice(0, 5);
  }, [recurringBills]);

  const safeToSpend = balance + projectedIncome30Days;
  const monthlyNet = monthlySummary.totalIncome - monthlySummary.totalExpense;
  const monthlySafeToSpend = monthlyNet + projectedIncome30Days;
  const recurringBillTotal = recurringBills.reduce((sum, bill) => sum + bill.averageAmount, 0);
  const monthlyExpenseBase = Math.max(monthlySummary.totalExpense, 1);

  return (
    <div className="space-y-6">
      <section className="cockpit-panel rounded-[28px] p-6 lg:p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(68,211,255,0.18),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,99,132,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Finance Cockpit</p>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white mt-2">Know what is coming before it hits.</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base cockpit-muted">
                Your household command center for cash flow, recurring bills, card activity, and monthly pressure points.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard title="Total Balance" value={formatCurrency(balance)} tone={balance >= 0 ? 'neutral' : 'danger'} />
              <MetricCard title="Safe to Spend" value={formatCurrency(safeToSpend)} tone={safeToSpend >= 0 ? 'success' : 'danger'} />
              <MetricCard title="Total Income" value={formatCurrency(totalIncome)} tone="success" />
              <MetricCard title="Total Expenses" value={formatCurrency(totalExpense)} tone="danger" />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] gap-5">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/20 p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-lg font-medium text-white">Monthly Cash Flow</h3>
                  <p className="text-sm cockpit-muted mt-1">{monthlySummary.monthLabel} at a glance.</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
                  monthlyNet >= 0
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                    : 'border-rose-400/20 bg-rose-400/10 text-rose-200'
                }`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {monthlyNet >= 0 ? 'On track this month' : 'Spending ahead of income'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SignalCard title="Income this month" value={formatCurrency(monthlySummary.totalIncome)} accent="emerald" subtitle="confirmed inflow" />
                <SignalCard title="Expenses this month" value={formatCurrency(monthlySummary.totalExpense)} accent="rose" subtitle="tracked outflow" />
                <SignalCard title="Net cash flow" value={formatCurrency(monthlyNet)} accent={monthlyNet >= 0 ? 'slate' : 'rose'} subtitle="income minus expenses" />
                <SignalCard title="Monthly safe to spend" value={formatCurrency(monthlySafeToSpend)} accent="cyan" subtitle="net plus projected paychecks" />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <CompactInsight
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Recurring bills queued"
                  value={formatCurrency(recurringBillTotal)}
                  helper={recurringBills.length === 0 ? 'none detected yet' : `${recurringBills.length} bills detected`}
                />
                <CompactInsight
                  icon={<WalletCards className="h-4 w-4" />}
                  label="Next paycheck"
                  value={upcomingPaychecks[0] ? formatCurrency(upcomingPaychecks[0].amount) : '$0.00'}
                  helper={upcomingPaychecks[0] ? `${upcomingPaychecks[0].sourceName} • ${upcomingPaychecks[0].label}` : 'add income sources to forecast'}
                />
                <CompactInsight
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Largest expense lane"
                  value={focusCategories[0]?.name || 'None yet'}
                  helper={focusCategories[0] ? formatCurrency(focusCategories[0].value) : 'no monthly expenses yet'}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/25 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="sr-only">Upcoming Recurring Bills</p>
                  <h3 className="text-lg font-medium text-white">Money Radar</h3>
                  <p className="text-sm cockpit-muted mt-1">Immediate signals, due soon items, and live movement.</p>
                </div>
                <Radar className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-5 space-y-3">
                {recurringBills.slice(0, 3).map((bill) => (
                  <div key={`${bill.name}-${bill.nextExpectedDate}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{bill.name}</p>
                        <p className="text-xs cockpit-muted mt-1">
                          {bill.category}
                          {bill.institution ? ` • ${bill.institution}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${cadenceTone[bill.cadence] || cadenceTone.monthly}`}>
                        {bill.cadence}
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs cockpit-muted">Expected next</p>
                        <p className="text-sm font-semibold text-white mt-1">{formatISODate(bill.nextExpectedDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs cockpit-muted">Estimated charge</p>
                        <p className="text-lg font-bold text-white mt-1">{formatCurrency(bill.averageAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {recurringBills.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
                    Add at least two similar bill payments to start detecting recurring expenses.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-5">
        <div className="cockpit-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-medium text-white">Card Summary</h3>
              <p className="text-sm cockpit-muted mt-1">See which cards are carrying the most spending pressure this month.</p>
            </div>
            <WalletCards className="h-5 w-5 text-cyan-300" />
          </div>

          {cardSummaries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cardSummaries.map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{card.name}</p>
                      <p className="text-xs cockpit-muted mt-1">
                        {card.issuer || 'Credit card'}
                        {card.last4 ? ` • •••• ${card.last4}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-cyan-200">
                      {card.recurringCount} recurring
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs cockpit-muted">Charges</p>
                      <p className="text-sm font-semibold text-white mt-1">{formatCurrency(card.charges)}</p>
                    </div>
                    <div>
                      <p className="text-xs cockpit-muted">Payments</p>
                      <p className="text-sm font-semibold text-emerald-300 mt-1">{formatCurrency(card.payments)}</p>
                    </div>
                    <div>
                      <p className="text-xs cockpit-muted">Open</p>
                      <p className="text-sm font-semibold text-rose-300 mt-1">{formatCurrency(card.openItems)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
              Add credit card accounts and assign transactions to them to unlock card-level summaries.
            </div>
          )}
        </div>

        <div className="cockpit-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-medium text-white">Subscription Watchlist</h3>
              <p className="text-sm cockpit-muted mt-1">Small monthly charges that quietly stack up over time.</p>
            </div>
            <Tv className="h-5 w-5 text-violet-300" />
          </div>

          {subscriptionWatchlist.length > 0 ? (
            <div className="space-y-3">
              {subscriptionWatchlist.map((bill) => (
                <div key={`${bill.name}-${bill.nextExpectedDate}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{bill.name}</p>
                    <p className="text-xs cockpit-muted mt-1">
                      {bill.institution || bill.category} • next {formatISODate(bill.nextExpectedDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white">{formatCurrency(bill.averageAmount)}</p>
                    <p className="text-xs text-violet-200 mt-1 uppercase tracking-wide">{bill.cadence}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
              No subscription-style recurring charges detected yet.
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5">
        <div className="cockpit-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-medium text-white">Spending Systems</h3>
              <p className="text-sm cockpit-muted mt-1">The categories applying the most pressure this month.</p>
            </div>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Monthly focus</span>
          </div>

          {focusCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {focusCategories.map((category, index) => {
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                const share = Math.min((category.value / monthlyExpenseBase) * 100, 100);
                return (
                  <div key={category.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{category.name}</p>
                        <p className="text-xs cockpit-muted mt-1">{share.toFixed(0)}% of current month expenses</p>
                      </div>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    </div>
                    <p className="text-2xl font-bold text-white mt-4">{formatCurrency(category.value)}</p>
                    <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
              No monthly categories yet. Add some transactions to see your main spending systems.
            </div>
          )}
        </div>

        <div className="cockpit-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-medium text-white">Recent Activity</h3>
              <p className="text-sm cockpit-muted mt-1">What just moved in or out of the household.</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{transaction.description || transaction.category}</p>
                    <p className="text-xs cockpit-muted mt-1">
                      {transaction.category} • {formatISODate(transaction.date)}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${
                    transaction.type === 'income' || transaction.type === 'cc_payment'
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                  }`}>
                    {transaction.type === 'income' || transaction.type === 'cc_payment' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
                No recent transactions yet. Import data or add a transaction to start your activity feed.
              </div>
            )}
          </div>
        </div>
      </section>

      <SalaryPlanner />

      <BillPlanner />

      <section className="cockpit-panel rounded-[28px] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-medium text-white">Expenses by Category</h3>
            <p className="text-sm cockpit-muted mt-1">Visual breakdown of the current pressure mix across spending categories.</p>
          </div>
          <div className="text-sm cockpit-muted">
            {expensesByCategory.length} categories visualized
          </div>
        </div>

        {expensesByCategory.length > 0 ? (
          <div className="h-96 w-full rounded-[24px] border border-white/10 bg-slate-950/20 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={118}
                  innerRadius={64}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm cockpit-muted">
            No expense data available. Add some transactions to see charts.
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-300'
        : 'text-white';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <h3 className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{title}</h3>
      <p className={`text-2xl font-bold mt-3 ${tone === 'danger' ? 'text-red-600' : toneClass}`}>{value}</p>
    </div>
  );
}

function SignalCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: 'emerald' | 'rose' | 'cyan' | 'slate';
}) {
  const accentStyles = {
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
    slate: 'border-white/10 bg-white/5 text-white',
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${accentStyles[accent]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold mt-3">{value}</p>
      <p className="text-xs mt-2 opacity-75">{subtitle}</p>
    </div>
  );
}

function CompactInsight({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-cyan-200">
        {icon}
        <p className="text-xs uppercase tracking-[0.24em]">{label}</p>
      </div>
      <p className="text-lg font-semibold text-white mt-3">{value}</p>
      <p className="text-xs cockpit-muted mt-2">{helper}</p>
    </div>
  );
}
