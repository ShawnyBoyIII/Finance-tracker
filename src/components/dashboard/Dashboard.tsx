'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import SalaryPlanner from './SalaryPlanner';
import { summarizeTransactions, summarizeMonthlyTransactions, detectRecurringBills, formatCurrency } from '@/utils/finance';
import { getProjectedIncome } from '@/utils/salary';
import { formatISODate } from '@/utils/constants';

export default function Dashboard() {
  const { transactions, salarySchedule } = useFinance();

  const { totalIncome, totalExpense, balance, expensesByCategory } = useMemo(
    () => summarizeTransactions(transactions),
    [transactions]
  );

  const monthlySummary = useMemo(
    () => summarizeMonthlyTransactions(transactions),
    [transactions]
  );

  const projectedIncome30Days = useMemo(
    () => getProjectedIncome(salarySchedule, 30),
    [salarySchedule]
  );
  const recurringBills = useMemo(() => detectRecurringBills(transactions), [transactions]);

  const safeToSpend = balance + projectedIncome30Days;
  const monthlyNet = monthlySummary.totalIncome - monthlySummary.totalExpense;
  const monthlySafeToSpend = monthlyNet + projectedIncome30Days;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Balance</h3>
          <p className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Safe to Spend</h3>
          <p className={`text-3xl font-bold mt-2 ${safeToSpend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(safeToSpend)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Includes the next 30 days of paychecks, if you set one.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-3xl font-bold mt-2 text-red-600">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Monthly Cash Flow</h3>
            <p className="text-sm text-gray-500 mt-1">{monthlySummary.monthLabel} at a glance.</p>
          </div>
          <div className={`text-sm font-medium ${monthlyNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {monthlyNet >= 0 ? 'On track this month' : 'Spending is ahead of income this month'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">Income this month</p>
            <p className="text-2xl font-bold text-emerald-900 mt-2">{formatCurrency(monthlySummary.totalIncome)}</p>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-800">Expenses this month</p>
            <p className="text-2xl font-bold text-rose-900 mt-2">{formatCurrency(monthlySummary.totalExpense)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Net cash flow</p>
            <p className={`text-2xl font-bold mt-2 ${monthlyNet >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              {formatCurrency(monthlyNet)}
            </p>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-800">Monthly safe to spend</p>
            <p className={`text-2xl font-bold mt-2 ${monthlySafeToSpend >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
              {formatCurrency(monthlySafeToSpend)}
            </p>
            <p className="text-xs text-indigo-700 mt-2">Current month net plus projected paychecks in the next 30 days.</p>
          </div>
        </div>
      </div>

      <SalaryPlanner />

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Upcoming Recurring Bills</h3>
            <p className="text-sm text-gray-500 mt-1">
              Detected from repeat expense patterns in your transaction history.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {recurringBills.length} recurring {recurringBills.length === 1 ? 'bill' : 'bills'} detected
          </div>
        </div>

        {recurringBills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Add at least two similar bill payments to start detecting recurring expenses.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recurringBills.slice(0, 6).map((bill) => (
              <div key={`${bill.name}-${bill.nextExpectedDate}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{bill.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {bill.category}
                      {bill.institution ? ` • ${bill.institution}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(bill.averageAmount)}</p>
                    <p className="text-xs uppercase tracking-wide text-indigo-600 font-medium mt-1">{bill.cadence}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-white border border-gray-200 p-3">
                    <p className="text-gray-500">Expected next</p>
                    <p className="font-semibold text-gray-900 mt-1">{formatISODate(bill.nextExpectedDate)}</p>
                  </div>
                  <div className="rounded-md bg-white border border-gray-200 p-3">
                    <p className="text-gray-500">Last charge</p>
                    <p className="font-semibold text-gray-900 mt-1">{formatCurrency(bill.lastAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatISODate(bill.lastDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
        {expensesByCategory.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No expense data available. Add some transactions to see charts.
          </div>
        )}
      </div>
    </div>
  );
}
