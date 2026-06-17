'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Bolt, Pencil, Plus, ShieldAlert, Sparkles, TrendingUp, Trash2 } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS, formatISODate } from '@/utils/constants';
import { parseJacksonEmcElectricityBill } from '@/utils/electricityBillParser';
import {
  formatCurrency,
  getBillStatuses,
  getElectricityHealth,
  getElectricityInsight,
  getElectricityMetrics,
  getElectricityMonthlySeries,
} from '@/utils/finance';

const ELECTRICITY_KEYWORDS = /(electric|electricity|power|utility)/i;

const matchesElectricityBill = (name?: string, category?: string) =>
  ELECTRICITY_KEYWORDS.test(name || '') || ELECTRICITY_KEYWORDS.test(category || '');

const matchesElectricityTransaction = (description?: string, category?: string) =>
  ELECTRICITY_KEYWORDS.test(description || '') || ELECTRICITY_KEYWORDS.test(category || '');

const getHealthTone = (status: 'healthy' | 'watch' | 'urgent') => {
  if (status === 'urgent') {
    return 'border-rose-400/20 bg-rose-400/10 text-rose-100';
  }

  if (status === 'watch') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-100';
  }

  return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
};

const getDeltaLabel = (value: number, prefix = '$', suffix = '', decimals = 2) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${prefix}${Math.abs(value).toFixed(decimals)}${suffix}`;
};

const ChartShell = ({
  ready,
  hasData,
  emptyLabel,
  children,
  heightClass,
}: {
  ready: boolean;
  hasData: boolean;
  emptyLabel: string;
  children: React.ReactNode;
  heightClass: string;
}) => (
  <div className={`${heightClass} min-w-0`}>
    {ready ? (
      hasData ? (
        children
      ) : (
        <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] px-6 text-center text-sm cockpit-muted">
          {emptyLabel}
        </div>
      )
    ) : (
      <div className="h-full animate-pulse rounded-[22px] border border-white/8 bg-white/[0.04]" />
    )}
  </div>
);

export default function ElectricityTracker() {
  const {
    bills,
    accounts,
    transactions,
    electricityStatements,
    addBill,
    updateBill,
    deleteBill,
    importElectricityStatement,
  } = useFinance();

  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [name, setName] = useState('Electricity Bill');
  const [dueDay, setDueDay] = useState('');
  const [amount, setAmount] = useState('');
  const [usageKwh, setUsageKwh] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [autopay, setAutopay] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [manualHistoryProvider, setManualHistoryProvider] = useState('Manual entry');
  const [manualHistoryAccountNumber, setManualHistoryAccountNumber] = useState('Historical');
  const [manualHistoryBillDate, setManualHistoryBillDate] = useState('');
  const [manualHistoryDueDate, setManualHistoryDueDate] = useState('');
  const [manualHistoryServiceStart, setManualHistoryServiceStart] = useState('');
  const [manualHistoryServiceEnd, setManualHistoryServiceEnd] = useState('');
  const [manualHistoryAmount, setManualHistoryAmount] = useState('');
  const [manualHistoryUsage, setManualHistoryUsage] = useState('');
  const [manualHistoryRatePlan, setManualHistoryRatePlan] = useState('');
  const [manualHistorySuccess, setManualHistorySuccess] = useState<string | null>(null);
  const [manualHistoryError, setManualHistoryError] = useState<string | null>(null);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const electricityBills = useMemo(
    () => bills.filter((bill) => matchesElectricityBill(bill.name, bill.category)),
    [bills]
  );
  const electricityBillStatuses = useMemo(() => {
    const billStatuses = getBillStatuses(electricityBills, transactions);
    return billStatuses.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [electricityBills, transactions]);
  const electricityTransactions = useMemo(
    () =>
      transactions
        .filter(
          (transaction) =>
            transaction.type === 'expense' &&
            matchesElectricityTransaction(transaction.description, transaction.category)
        )
        .sort((left, right) => right.date.localeCompare(left.date)),
    [transactions]
  );

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const recentStatements = useMemo(
    () => [...electricityStatements].sort((left, right) => right.billDate.localeCompare(left.billDate)),
    [electricityStatements]
  );
  const statementTrend = useMemo(
    () =>
      recentStatements.map((statement) => {
        const usageBase = statement.billedConsumptionKwh || statement.totalConsumptionKwh || 0;
        const costPerKwh = usageBase > 0 ? statement.totalDue / usageBase : null;

        return {
          ...statement,
          usageBase,
          costPerKwh,
        };
      }),
    [recentStatements]
  );
  const monthlyData = useMemo(
    () => getElectricityMonthlySeries(electricityTransactions, 12, new Date()),
    [electricityTransactions]
  );
  const metrics = useMemo(
    () => getElectricityMetrics(electricityTransactions, new Date()),
    [electricityTransactions]
  );
  const health = useMemo(
    () => getElectricityHealth(electricityBillStatuses, accountMap),
    [electricityBillStatuses, accountMap]
  );
  const insight = useMemo(
    () => getElectricityInsight(metrics, health, monthlyData),
    [metrics, health, monthlyData]
  );
  const sparklineData = useMemo(
    () =>
      electricityTransactions
        .slice(0, 6)
        .reverse()
        .map((transaction, index) => ({
          index,
          amount: Math.abs(transaction.amount),
        })),
    [electricityTransactions]
  );
  const hasMonthlyChartData = useMemo(
    () => monthlyData.some((entry) => entry.amount > 0),
    [monthlyData]
  );
  const hasSparklineData = sparklineData.length > 1;

  const latestUsageKwh = electricityBills[0]?.usageKwh;
  const averageUsageKwh =
    electricityBills
      .filter((bill) => typeof bill.usageKwh === 'number')
      .reduce((total, bill, _index, billsWithUsage) => total + (bill.usageKwh || 0) / billsWithUsage.length, 0) || 0;
  const nextDueBill = electricityBillStatuses.find((status) => status.status !== 'paid') || electricityBillStatuses[0];
  const latestStatement = statementTrend[0];
  const previousStatement = statementTrend[1];
  const usageChange = latestStatement && previousStatement ? latestStatement.usageBase - previousStatement.usageBase : null;
  const billChange = latestStatement && previousStatement ? latestStatement.totalDue - previousStatement.totalDue : null;
  const costPerKwhChange =
    latestStatement?.costPerKwh != null && previousStatement?.costPerKwh != null
      ? latestStatement.costPerKwh - previousStatement.costPerKwh
      : null;
  const latestStatementUsage = latestStatement?.billedConsumptionKwh ?? latestStatement?.totalConsumptionKwh ?? null;
  const latestStatementRate =
    latestStatement?.costPerKwh != null ? `$${latestStatement.costPerKwh.toFixed(3)}/kWh` : 'Rate not available';

  const resetForm = () => {
    setEditingBillId(null);
    setName('Electricity Bill');
    setDueDay('');
    setAmount('');
    setUsageKwh('');
    setAutopay(false);
  };

  const resetManualHistoryForm = () => {
    setManualHistoryProvider('Manual entry');
    setManualHistoryAccountNumber('Historical');
    setManualHistoryBillDate('');
    setManualHistoryDueDate('');
    setManualHistoryServiceStart('');
    setManualHistoryServiceEnd('');
    setManualHistoryAmount('');
    setManualHistoryUsage('');
    setManualHistoryRatePlan('');
  };

  const handleElectricityPdfImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    try {
      const { extractTextFromPdf } = await import('@/utils/pdfOcr');
      const extraction = await extractTextFromPdf(file);
      const parsedStatement = parseJacksonEmcElectricityBill(extraction.text, file.name);

      if (!parsedStatement) {
        setImportError('This PDF did not match the current Jackson EMC electricity bill format.');
        return;
      }

      importElectricityStatement(parsedStatement);
      setName('Electricity Bill');
      setDueDay(String(Number(parsedStatement.dueDate.slice(8, 10))));
      setAmount(String(parsedStatement.totalDue));
      setUsageKwh(
        parsedStatement.billedConsumptionKwh
          ? String(parsedStatement.billedConsumptionKwh)
          : parsedStatement.totalConsumptionKwh
            ? String(parsedStatement.totalConsumptionKwh)
            : ''
      );
      setImportSuccess(
        `Imported ${parsedStatement.provider} bill dated ${formatISODate(parsedStatement.billDate)} and prefilled the tracker.`
      );
    } catch (error) {
      console.error(error);
      setImportError('Failed to read the electricity PDF.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleManualHistorySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setManualHistoryError(null);
    setManualHistorySuccess(null);

    if (
      !manualHistoryBillDate ||
      !manualHistoryDueDate ||
      !manualHistoryServiceStart ||
      !manualHistoryServiceEnd ||
      !manualHistoryAmount
    ) {
      setManualHistoryError('Add bill date, due date, service dates, and total amount to save a past bill.');
      return;
    }

    if (manualHistoryServiceEnd < manualHistoryServiceStart) {
      setManualHistoryError('Service end date cannot be earlier than the service start date.');
      return;
    }

    importElectricityStatement({
      provider: manualHistoryProvider.trim() || 'Manual entry',
      accountNumber: manualHistoryAccountNumber.trim() || 'Historical',
      billDate: manualHistoryBillDate,
      dueDate: manualHistoryDueDate,
      servicePeriodStart: manualHistoryServiceStart,
      servicePeriodEnd: manualHistoryServiceEnd,
      ratePlan: manualHistoryRatePlan.trim() || undefined,
      totalDue: Number(manualHistoryAmount),
      billedConsumptionKwh: manualHistoryUsage ? Number(manualHistoryUsage) : undefined,
      totalConsumptionKwh: manualHistoryUsage ? Number(manualHistoryUsage) : undefined,
      sourceFileName: 'Manual electricity history entry',
    });

    setManualHistorySuccess(
      `Saved historical bill for ${formatISODate(manualHistoryBillDate)}. It now counts toward your electricity history and trends.`
    );
    resetManualHistoryForm();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !dueDay) {
      return;
    }

    const payload = {
      name: name.trim(),
      dueDay: Number(dueDay),
      amount: amount ? Number(amount) : undefined,
      usageKwh: usageKwh ? Number(usageKwh) : undefined,
      category: 'Utilities',
      accountId: accountId || undefined,
      autopay,
    };

    if (editingBillId) {
      const existingBill = bills.find((bill) => bill.id === editingBillId);
      updateBill(editingBillId, {
        ...payload,
        manualStatus: existingBill?.manualStatus,
        manualStatusMonth: existingBill?.manualStatusMonth,
        manualPaidDate: existingBill?.manualPaidDate,
      });
    } else {
      addBill(payload);
    }

    resetForm();
  };

  const handleEdit = (billId: string) => {
    const bill = bills.find((item) => item.id === billId);
    if (!bill) return;

    setEditingBillId(bill.id);
    setName(bill.name);
    setDueDay(String(bill.dueDay));
    setAmount(bill.amount ? String(bill.amount) : '');
    setUsageKwh(bill.usageKwh ? String(bill.usageKwh) : '');
    setAccountId(bill.accountId || accounts[0]?.id || '');
    setAutopay(Boolean(bill.autopay));
  };

  const kpiCards = [
    {
      title: 'Next due',
      value: nextDueBill ? formatISODate(nextDueBill.dueDate) : 'Not set',
      helper: nextDueBill ? `${nextDueBill.name} • ${nextDueBill.status}` : 'Add a tracked electricity bill',
    },
    {
      title: 'Current month spend',
      value: formatCurrency(metrics.currentMonthSpend),
      helper: 'Derived from utility/electric/power matched charges',
    },
    {
      title: 'Last bill',
      value: formatCurrency(metrics.lastBillAmount),
      helper:
        previousStatement && billChange !== null
          ? `${formatISODate(previousStatement.billDate)} • ${billChange > 0 ? '+' : ''}${formatCurrency(billChange)} vs prior`
          : 'Need prior month history',
    },
    {
      title: '3-month average',
      value: formatCurrency(metrics.threeMonthAverage),
      helper: 'Rolling electricity spend baseline',
    },
    {
      title: 'Vs last month',
      value:
        metrics.vsLastMonthAmount === 0
          ? formatCurrency(0)
          : `${metrics.vsLastMonthAmount > 0 ? '+' : '-'}${formatCurrency(Math.abs(metrics.vsLastMonthAmount))}`,
      helper:
        usageChange === null
          ? metrics.vsLastMonthAmount >= 0 ? 'Higher than last month' : 'Lower than last month'
          : `${usageChange > 0 ? '+' : ''}${usageChange.toFixed(0)} kWh vs last month`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="cockpit-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bolt className="h-5 w-5 text-amber-300" />
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200/90">Utility control</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Electricity Bill Tracking</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Keep one dedicated place for your power bill. Track due dates, spend, statement history,
              and usage trends without digging through the full ledger.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Latest statement</div>
                <div className="mt-1 text-sm font-medium text-white">
                  {latestStatement ? formatCurrency(latestStatement.totalDue) : 'Import your first utility PDF'}
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  {latestStatement && latestStatementUsage != null
                    ? `${latestStatementUsage.toLocaleString()} kWh • ${latestStatementRate}`
                    : 'Jackson EMC parser is ready for recurring statement imports'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Watch item</div>
                <div className="mt-1 text-sm font-medium text-white">{health.title}</div>
                <div className="mt-1 text-xs text-slate-300">{health.detail}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-100/80">Tracked electricity bills</div>
            <div className="mt-1 text-2xl font-semibold text-white">{electricityBills.length}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <div key={card.title} className="cockpit-panel rounded-[24px] p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{card.title}</div>
            <div className="mt-2 min-h-[3.5rem] text-2xl font-semibold leading-tight text-white xl:text-[2rem]">
              {card.value}
            </div>
            <p className="mt-2 text-sm cockpit-muted">{card.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <section className="cockpit-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-white">12-Month Cost Trend</h2>
              <p className="mt-1 text-sm cockpit-muted">
                Monthly electricity charges with the current month highlighted and a rolling average line.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1">
              Current month: {formatCurrency(metrics.currentMonthSpend)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
              Average line: {formatCurrency(metrics.threeMonthAverage)}
            </span>
          </div>

          <ChartShell
            ready={chartsReady}
            hasData={hasMonthlyChartData}
            emptyLabel="Import bills or tag utility transactions to build your 12-month cost trend."
            heightClass="mt-6 h-[280px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="monthLabel" stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value || 0)), 'Cost']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.96)',
                    border: '1px solid rgba(148,163,184,0.3)',
                    borderRadius: '14px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
                <ReferenceLine
                  y={metrics.threeMonthAverage}
                  stroke="rgba(255,255,255,0.45)"
                  strokeDasharray="4 4"
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={34}>
                  {monthlyData.map((entry) => (
                    <Cell
                      key={entry.monthKey}
                      fill={entry.isCurrentMonth ? '#fbbf24' : '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
        </section>

        <div className="space-y-5">
          <div className="cockpit-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-cyan-300" />
              <h2 className="text-lg font-medium text-white">Bill Health</h2>
            </div>
            <div className={`mt-4 rounded-[22px] border p-4 ${getHealthTone(health.status)}`}>
              <div className="text-sm font-semibold">{health.title}</div>
              <p className="mt-2 text-sm opacity-90">{health.detail}</p>
            </div>
          </div>

          <div className="cockpit-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-300" />
              <h2 className="text-lg font-medium text-white">Anomaly Insight</h2>
            </div>
            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">{insight.title}</div>
              <p className="mt-2 text-sm cockpit-muted">{insight.detail}</p>
            </div>
          </div>

          <div className="cockpit-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-300" />
              <h2 className="text-lg font-medium text-white">Recent Charges</h2>
            </div>
            <div className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <ChartShell
                ready={chartsReady}
                hasData={hasSparklineData}
                emptyLabel="Recent electricity charges will start drawing a pattern once matched transactions come in."
                heightClass="h-[110px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData} margin={{ top: 12, right: 4, left: 4, bottom: 4 }}>
                    <Line type="monotone" dataKey="amount" stroke="#fbbf24" strokeWidth={3} dot={false} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value || 0)), 'Charge']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.96)',
                        border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: '14px',
                        color: '#fff',
                      }}
                      labelStyle={{ color: '#cbd5e1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
              <p className="mt-3 text-sm cockpit-muted">
                {metrics.latestChargeDate
                  ? `Latest charge ${formatCurrency(metrics.latestChargeAmount)} on ${formatISODate(metrics.latestChargeDate)}.`
                  : 'No electricity charges matched yet.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="cockpit-panel rounded-[28px] p-6">
          <h2 className="text-lg font-medium text-white">Recent electricity charges</h2>
          <p className="mt-1 text-sm cockpit-muted">
            Detected from transactions with electricity, power, or utility-related labels.
          </p>

          <div className="mt-4 space-y-3">
            {electricityTransactions.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-4 text-sm cockpit-muted">
                No electricity-related charges found yet. Imported utility transactions will show up here automatically.
              </div>
            ) : (
              electricityTransactions.slice(0, 6).map((transaction) => (
                <div key={transaction.id} className="flex items-start justify-between gap-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="text-base font-medium text-white">{transaction.description}</div>
                    <div className="mt-1 text-sm cockpit-muted">
                      {formatISODate(transaction.date)} • {transaction.category}
                      {transaction.accountId ? ` • ${accountMap.get(transaction.accountId)?.name || 'Account'}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{formatCurrency(Math.abs(transaction.amount))}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="cockpit-panel rounded-[28px] p-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Lower-priority setup</div>
              <h2 className="mt-2 text-lg font-medium text-white">
                {editingBillId ? 'Edit electricity bill' : 'Bill setup'}
              </h2>
              <p className="mt-1 text-sm cockpit-muted">
                Keep this lightweight. Most people will import the PDF first, then make small edits here.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">Bill name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Electricity Bill" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Due day</label>
                <input type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="18" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Expected amount</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="150.00" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Usage consumed (kWh)</label>
                <input type="number" min="0" step="0.01" value={usageKwh} onChange={(event) => setUsageKwh(event.target.value)} placeholder="825" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Pay from account</label>
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={COMMON_INPUT_CLASS}>
                  {accounts
                    .filter((account) => account.type === 'cash' || account.type === 'bank' || account.type === 'credit_card')
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={autopay} onChange={(event) => setAutopay(event.target.checked)} />
              Autopay enabled
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300">
                <Plus className="h-4 w-4" />
                {editingBillId ? 'Save electricity bill' : 'Save bill setup'}
              </button>
              {editingBillId && (
                <button type="button" onClick={resetForm} className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <section className="cockpit-panel rounded-[28px] p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Import parser</div>
                <h2 className="mt-2 text-lg font-medium text-white">Import electricity statement PDF</h2>
                <p className="mt-1 text-sm cockpit-muted">
                  Jackson EMC bills now have a dedicated parser. Importing a PDF stores the statement details
                  and prefills the setup form with amount, due day, and usage.
                </p>
              </div>
              <div className="text-sm cockpit-muted">{recentStatements.length} statement(s) stored</div>
            </div>

            <div className="mt-4">
              <input
                type="file"
                accept=".pdf"
                onChange={handleElectricityPdfImport}
                aria-label="Upload electricity statement PDF"
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-800 hover:file:bg-amber-100"
              />
              {isImporting && <p className="mt-3 text-sm cockpit-muted">Reading electricity statement...</p>}
              {importError && <p className="mt-3 text-sm text-rose-300">{importError}</p>}
              {importSuccess && <p className="mt-3 text-sm text-emerald-300">{importSuccess}</p>}
            </div>
          </section>

          <form onSubmit={handleManualHistorySubmit} className="cockpit-panel rounded-[28px] p-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Historical bills</div>
              <h2 className="mt-2 text-lg font-medium text-white">Add a past bill manually</h2>
              <p className="mt-1 text-sm cockpit-muted">
                Use this for older electricity bills when you want the history and trend line without changing the live due-date tracker.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">Provider</label>
                <input value={manualHistoryProvider} onChange={(event) => setManualHistoryProvider(event.target.value)} placeholder="Jackson EMC" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Account label / number</label>
                <input value={manualHistoryAccountNumber} onChange={(event) => setManualHistoryAccountNumber(event.target.value)} placeholder="123456789" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Bill date</label>
                <input type="date" value={manualHistoryBillDate} onChange={(event) => setManualHistoryBillDate(event.target.value)} className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Due date</label>
                <input type="date" value={manualHistoryDueDate} onChange={(event) => setManualHistoryDueDate(event.target.value)} className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Service start</label>
                <input type="date" value={manualHistoryServiceStart} onChange={(event) => setManualHistoryServiceStart(event.target.value)} className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Service end</label>
                <input type="date" value={manualHistoryServiceEnd} onChange={(event) => setManualHistoryServiceEnd(event.target.value)} className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Total bill amount</label>
                <input type="number" min="0" step="0.01" value={manualHistoryAmount} onChange={(event) => setManualHistoryAmount(event.target.value)} placeholder="164.22" className={COMMON_INPUT_CLASS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200">Usage (kWh)</label>
                <input type="number" min="0" step="0.01" value={manualHistoryUsage} onChange={(event) => setManualHistoryUsage(event.target.value)} placeholder="921" className={COMMON_INPUT_CLASS} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-200">Rate plan (optional)</label>
                <input value={manualHistoryRatePlan} onChange={(event) => setManualHistoryRatePlan(event.target.value)} placeholder="Residential" className={COMMON_INPUT_CLASS} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300">
                <Plus className="h-4 w-4" />
                Save past bill
              </button>
              <button type="button" onClick={resetManualHistoryForm} className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
                Clear
              </button>
            </div>

            {manualHistoryError && <p className="text-sm text-rose-300">{manualHistoryError}</p>}
            {manualHistorySuccess && <p className="text-sm text-emerald-300">{manualHistorySuccess}</p>}
          </form>
        </div>
      </section>

      <section className="cockpit-panel rounded-[28px] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-white">Tracked electricity bills</h2>
            <p className="mt-1 text-sm cockpit-muted">Due-date status and quick actions.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {electricityBillStatuses.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-4 text-sm cockpit-muted">
              No electricity bill is tracked yet. Add one in the setup form above so this page can watch the due date.
            </div>
          ) : (
            electricityBillStatuses.map((bill) => (
              <div key={bill.billId} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-medium text-white">{bill.name}</div>
                    <div className="mt-1 text-sm cockpit-muted">
                      Due {formatISODate(bill.dueDate)}
                      {bill.accountId ? ` • ${accountMap.get(bill.accountId)?.name || 'Account'}` : ''}
                    </div>
                    {typeof electricityBills.find((item) => item.id === bill.billId)?.usageKwh === 'number' && (
                      <div className="mt-1 text-sm cockpit-muted">
                        Usage: {electricityBills.find((item) => item.id === bill.billId)?.usageKwh?.toLocaleString()} kWh
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{bill.status}</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {bill.amount ? formatCurrency(bill.amount) : 'Amount not set'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm cockpit-muted">
                    {bill.status === 'paid'
                      ? `Paid ${bill.matchedTransactionDate ? formatISODate(bill.matchedTransactionDate) : 'this cycle'}`
                      : bill.daysUntilDue < 0
                        ? `${Math.abs(bill.daysUntilDue)} day(s) overdue`
                        : `${bill.daysUntilDue} day(s) until due`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEdit(bill.billId)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-white hover:bg-white/5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button type="button" onClick={() => {
                      if (window.confirm('Are you sure you want to delete this electricity bill?')) {
                        deleteBill(bill.billId);
                      }
                    }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-white hover:bg-white/5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="cockpit-panel rounded-[28px] p-6">
        <h2 className="text-lg font-medium text-white">Imported electricity statements</h2>
        <p className="mt-1 text-sm cockpit-muted">
          Parsed from the recurring Jackson EMC bill format you shared, plus any manual historical entries you add here.
        </p>

        <div className="mt-4 space-y-3">
          {statementTrend.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/15 bg-white/5 p-4 text-sm cockpit-muted">
              No electricity statements imported yet.
            </div>
          ) : (
            statementTrend.map((statement) => (
              <div key={statement.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-medium text-white">
                      {formatISODate(statement.servicePeriodStart)} - {formatISODate(statement.servicePeriodEnd)}
                    </div>
                    <div className="mt-1 text-sm cockpit-muted">
                      Bill date {formatISODate(statement.billDate)} • Due {formatISODate(statement.dueDate)}
                    </div>
                    <div className="mt-1 text-sm cockpit-muted">
                      Account {statement.accountNumber} • {statement.ratePlan || statement.provider}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{formatCurrency(statement.totalDue)}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-200">
                      {statement.billedConsumptionKwh ?? statement.totalConsumptionKwh ?? 0} kWh
                    </div>
                    {statement.costPerKwh != null && (
                      <div className="mt-1 text-xs text-slate-300">${statement.costPerKwh.toFixed(3)}/kWh</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <div>Total consumption: {statement.totalConsumptionKwh?.toLocaleString() || 'n/a'} kWh</div>
                  <div>Billed consumption: {statement.billedConsumptionKwh?.toLocaleString() || 'n/a'} kWh</div>
                  <div>Solar generation: {statement.solarGenerationKwh?.toLocaleString() || 'n/a'} kWh</div>
                  <div>Days of service: {statement.daysOfService || 'n/a'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="cockpit-panel rounded-[24px] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest tracked usage</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {typeof latestUsageKwh === 'number' ? `${latestUsageKwh.toLocaleString()} kWh` : 'Not set'}
          </div>
          <p className="mt-2 text-sm cockpit-muted">The most recent usage value saved with your electricity bill.</p>
        </div>
        <div className="cockpit-panel rounded-[24px] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Average tracked usage</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {averageUsageKwh > 0 ? `${averageUsageKwh.toFixed(0)} kWh` : 'Not enough data'}
          </div>
          <p className="mt-2 text-sm cockpit-muted">Average usage across saved electricity bill entries.</p>
        </div>
        <div className="cockpit-panel rounded-[24px] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest cost per kWh</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {latestStatement?.costPerKwh != null ? `$${latestStatement.costPerKwh.toFixed(3)}` : 'n/a'}
          </div>
          <p className="mt-2 text-sm cockpit-muted">
            {costPerKwhChange == null
              ? 'Import more statement history to compare rate pressure.'
              : `Vs last bill: ${getDeltaLabel(costPerKwhChange, '$', '/kWh', 3)}`}
          </p>
        </div>
      </section>
    </div>
  );
}
