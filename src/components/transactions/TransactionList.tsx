'use client';

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { TransactionType } from '@/types';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const INPUT_CLASS_NAME =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border';

export default function TransactionList() {
  const { transactions, addTransaction, deleteTransaction } = useFinance();
  const [isAdding, setIsAdding] = useState(false);

  // ⚡ Bolt: Memoize sorted transactions to prevent expensive O(N log N) sorting
  // on every render (e.g., when typing in form inputs).
  // Optimization: ISO date strings (YYYY-MM-DD) can be sorted directly via string comparison,
  // completely avoiding expensive new Date() instantiations inside the sort loop (~10x faster).
  // Spread [...transactions] prevents mutating the original context state.
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0)
    );
  }, [transactions]);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    addTransaction({
      date,
      amount: parseFloat(amount),
      type,
      category,
      description,
    });

    // Reset
    setAmount('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          {isAdding ? 'Cancel' : 'Add Manual Transaction'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className={INPUT_CLASS_NAME}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as TransactionType)}
              className={INPUT_CLASS_NAME}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={INPUT_CLASS_NAME}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              required
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Groceries"
              className={INPUT_CLASS_NAME}
            />
          </div>
          <div className="sm:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional"
                className={INPUT_CLASS_NAME}
              />
            </div>
            <button type="submit" className="mb-0.5 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No transactions yet. Add some or import a CSV!
                </td>
              </tr>
            ) : (
              sortedTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(t.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => deleteTransaction(t.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
