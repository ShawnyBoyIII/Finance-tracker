'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Trash2, AlertCircle } from 'lucide-react';
import { COMMON_INPUT_CLASS, DEFAULT_TRANSACTION_CATEGORIES } from '@/utils/constants';
import { formatCurrency, isTransactionInMonth } from '@/utils/finance';

export default function BudgetManager() {
  const { budgets, updateBudget, deleteBudget, transactions } = useFinance();
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set([
        ...DEFAULT_TRANSACTION_CATEGORIES,
        ...transactions.map((transaction) => transaction.category),
        ...budgets.map((budget) => budget.category),
      ]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [budgets, transactions]
  );

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
    // To avoid expensive string transformations (.toLowerCase()) on the main thread
    // during high-iteration list renders, we first aggregate by the raw key using a fast standard for loop.
    const rawCategorySpentMap: Record<string, number> = Object.create(null);
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (t.type === 'expense' && isTransactionInMonth(t)) {
        rawCategorySpentMap[t.category] = (rawCategorySpentMap[t.category] || 0) + t.amount;
      }
    }

    // Then, we apply .toLowerCase() only to the resulting much smaller set of unique keys.
    const categorySpentMap: Record<string, number> = Object.create(null);
    for (const [key, amount] of Object.entries(rawCategorySpentMap)) {
      const lowerKey = key.toLowerCase();
      categorySpentMap[lowerKey] = (categorySpentMap[lowerKey] || 0) + amount;
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
      <div className="cockpit-panel rounded-[28px] p-6">
        <h3 className="text-lg font-medium text-white mb-4">Set a Budget</h3>
        <form onSubmit={handleAddBudget} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="budget-category-name" className="block text-sm font-medium text-slate-200">Category Name<span className="text-red-500 ml-1" aria-hidden="true">*</span></label>
            <input
              id="budget-category-name"
              type="text"
              required
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="e.g. Groceries"
              list="budget-category-options"
              className={COMMON_INPUT_CLASS}
            />
            <datalist id="budget-category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="flex-1">
            <label htmlFor="budget-monthly-limit" className="block text-sm font-medium text-slate-200">Monthly Limit ($)<span className="text-red-500 ml-1" aria-hidden="true">*</span></label>
            <input
              id="budget-monthly-limit"
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
            className="mb-0.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-medium text-slate-950 hover:from-cyan-300 hover:to-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
          >
            Save Budget
          </button>
        </form>
      </div>

      {/* Budget Progress List */}
      <div className="cockpit-panel rounded-[28px] p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-medium text-white">Budget Progress</h3>
            <p className="text-sm cockpit-muted mt-1">Tracking spending for the current calendar month only.</p>
          </div>
        </div>

        {budgetProgress.length === 0 ? (
          <p className="cockpit-muted text-center py-4">No budgets set yet. Create one above to start tracking!</p>
        ) : (
          <div className="space-y-6">
            {budgetProgress.map((budget) => (
              <div key={budget.category} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{budget.category}</span>
                    {budget.isOverBudget && (
                      <div title="Over budget!">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${budget.isOverBudget ? 'text-red-400 font-medium' : 'text-slate-300'}`}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this budget?')) {
                          deleteBudget(budget.category);
                        }
                      }}
                      className="text-slate-500 hover:text-red-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Delete budget"
                      title="Delete budget"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${budget.isOverBudget ? 'bg-rose-400' : 'bg-cyan-400'}`}
                    style={{ width: `${budget.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs cockpit-muted mt-1">
                  {budget.realPercentage.toFixed(0)}% used
                  {budget.isOverBudget && ` (${formatCurrency(budget.spent - budget.amount)} over limit)`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
