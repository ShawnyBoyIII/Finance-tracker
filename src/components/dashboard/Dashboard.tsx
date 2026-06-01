'use client';

import React, { useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { transactions } = useFinance();

  const { totalIncome, totalExpense, balance, expensesByCategory } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categories: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'cc_payment') {
        // Balance increases because debt is reduced/paid off, handle amount gracefully
        income += Math.abs(t.amount);
      } else {
        expense += t.amount;
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      }
    });

    const expensesByCategoryData = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      expensesByCategory: expensesByCategoryData,
    };
  }, [transactions]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Balance</h3>
          <p className={`text-3xl font-bold mt-2 ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">
            ${totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
          <p className="text-3xl font-bold mt-2 text-red-600">
            ${totalExpense.toFixed(2)}
          </p>
        </div>
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
