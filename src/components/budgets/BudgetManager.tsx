'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Trash2, AlertCircle } from 'lucide-react';
import { COMMON_INPUT_CLASS } from '@/utils/constants';

export default function BudgetManager() {
  const { budgets, updateBudget, deleteBudget, transactions } = useFinance();
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory || !newAmount) return;
    updateBudget(newCategory, parseFloat(newAmount));
    setNewCategory('');
    setNewAmount('');
  };

  // ⚡ Bolt: Calculate spending against budgets
  // Optimized from O(M*N) nested loops to O(N+M) using a hash map for lookups
  // This significantly improves performance when the transactions array grows large.
  const budgetProgress = useMemo(() => {
    // 1. Pre-calculate total expenses by category (O(N) operation)
    const categorySpentMap: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === 'expense') {
        const categoryKey = t.category.toLowerCase();
        categorySpentMap[categoryKey] = (categorySpentMap[categoryKey] || 0) + t.amount;
      }
    }

    // 2. Map budgets to their progress (O(M) operation)
    return budgets.map((budget) => {
      const spent = categorySpentMap[budget.category.toLowerCase()] || 0;

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const isOverBudget = spent > budget.amount;

      return {
        ...budget,
        spent,
        percentage: Math.min(percentage, 100), // Cap at 100% for progress bar
        realPercentage: percentage,
        isOverBudget,
      };
    });
  }, [budgets, transactions]);

  return (
    <div className="space-y-6">
      {/* Add new budget form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Set a Budget</h3>
        <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Category Name</label>
            <input
              type="text"
              required
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="e.g. Groceries"
              className={COMMON_INPUT_CLASS}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Monthly Limit ($)</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="0.00"
              className={COMMON_INPUT_CLASS}
            />
          </div>
          <button
            type="submit"
            className="mb-0.5 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Save Budget
          </button>
        </form>
      </div>

      {/* Budget Progress List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Budget Progress</h3>

        {budgetProgress.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No budgets set yet. Create one above to start tracking!</p>
        ) : (
          <div className="space-y-6">
            {budgetProgress.map((budget) => (
              <div key={budget.category} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{budget.category}</span>
                    {budget.isOverBudget && (
                      <div title="Over budget!">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${budget.isOverBudget ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      ${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => deleteBudget(budget.category)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${budget.isOverBudget ? 'bg-red-500' : 'bg-indigo-600'}`}
                    style={{ width: `${budget.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {budget.realPercentage.toFixed(0)}% used
                  {budget.isOverBudget && ` (${(budget.spent - budget.amount).toFixed(2)} over limit)`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
