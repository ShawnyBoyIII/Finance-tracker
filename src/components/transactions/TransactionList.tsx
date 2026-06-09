'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { TransactionType, Transaction } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';
import { COMMON_INPUT_CLASS, formatISODate } from '@/utils/constants';
import { formatCurrency, getSuggestedCategory } from '@/utils/finance';

const PAGE_SIZE = 50;

function AddTransactionForm({
  addTransaction,
  onClose,
  accountOptions,
  defaultAccountId,
  categoryOptions,
  transactions,
}: {
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void,
  onClose: () => void,
  accountOptions: { id: string; name: string }[],
  defaultAccountId: string,
  categoryOptions: string[],
  transactions: Transaction[],
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(defaultAccountId);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);

    if (category) {
      return;
    }

    const suggestedCategory = getSuggestedCategory(value, transactions, '');
    if (suggestedCategory) {
      setCategory(suggestedCategory);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    addTransaction({
      date,
      amount: parseFloat(amount),
      type,
      category,
      description,
      accountId,
    });

    onClose();
  };

  return (
    <form onSubmit={handleAdd} className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-700">Date<span className="text-red-500 ml-1" aria-hidden="true">*</span></label>
        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={COMMON_INPUT_CLASS} />
      </div>
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select value={type} onChange={e => setType(e.target.value as TransactionType)} className={COMMON_INPUT_CLASS}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="cc_payment">CC Payment</option>
        </select>
      </div>
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-700">Amount<span className="text-red-500 ml-1" aria-hidden="true">*</span></label>
        <input type="number" required step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={COMMON_INPUT_CLASS} />
      </div>
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-700">Category<span className="text-red-500 ml-1" aria-hidden="true">*</span></label>
        <input
          type="text"
          required
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="e.g. Groceries"
          list="manual-transaction-categories"
          className={COMMON_INPUT_CLASS}
        />
        <datalist id="manual-transaction-categories">
          {categoryOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <div className="sm:col-span-1">
        <label className="block text-sm font-medium text-gray-700">Account</label>
        <select value={accountId} onChange={e => setAccountId(e.target.value)} className={COMMON_INPUT_CLASS}>
          {accountOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-1 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input type="text" value={description} onChange={e => handleDescriptionChange(e.target.value)} placeholder="Optional" className={COMMON_INPUT_CLASS} />
        </div>
        <button type="submit" className="mb-0.5 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500">
          Save
        </button>
      </div>
    </form>
  );
}

export default function TransactionList() {
  const { transactions, accounts, addAccount, addTransaction, deleteTransaction, updateTransactionCategory } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [newCardName, setNewCardName] = useState('');
  const [newCardIssuer, setNewCardIssuer] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
    );
  }, [transactions]);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );

  const visibleAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'cash' || account.type === 'bank' || account.type === 'credit_card'),
    [accounts]
  );

  const selectedAccount = selectedAccountId === 'all' ? null : accountMap.get(selectedAccountId);

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    for (let i = 0; i < transactions.length; i++) {
      if (transactions[i].category) {
        uniqueCategories.add(transactions[i].category);
      }
    }
    return Array.from(uniqueCategories).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  }, [transactions]);

  const handleCategoryChange = (transactionId: string, category: string) => {
    updateTransactionCategory(transactionId, category);
  };

  const startCategoryEdit = (transactionId: string) => {
    setEditingCategoryId(transactionId);
  };

  const stopCategoryEdit = () => {
    setEditingCategoryId(null);
  };

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedTransactions.filter((transaction) => {
      if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) {
        return false;
      }

      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && transaction.category !== categoryFilter) {
        return false;
      }

      if (startDate && transaction.date < startDate) {
        return false;
      }

      if (endDate && transaction.date > endDate) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        transaction.description,
        transaction.category,
        transaction.institution,
        transaction.type,
        accountMap.get(transaction.accountId || '')?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [sortedTransactions, selectedAccountId, typeFilter, categoryFilter, startDate, endDate, searchQuery, accountMap]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filteredTransactions.length]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, page]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const selectedAccountSpend = useMemo(() => {
    if (selectedAccountId === 'all') return null;

    const accountTransactions = sortedTransactions.filter((transaction) => transaction.accountId === selectedAccountId);
    const charges = accountTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const payments = accountTransactions
      .filter((transaction) => transaction.type === 'cc_payment')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    return {
      charges,
      payments,
      transactionCount: accountTransactions.length,
    };
  }, [selectedAccountId, sortedTransactions]);

  const handleAddCard = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newCardName.trim()) return;

    const accountId = addAccount({
      name: newCardName.trim(),
      type: 'credit_card',
      issuer: newCardIssuer.trim() || undefined,
      last4: newCardLast4.trim() || undefined,
    });

    setSelectedAccountId(accountId);
    setNewCardName('');
    setNewCardIssuer('');
    setNewCardLast4('');
  };

  const defaultManualAccountId = selectedAccountId === 'all'
    ? visibleAccounts[0]?.id || ''
    : selectedAccountId;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Transactions</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
        >
          {isAdding ? 'Cancel' : 'Add Manual Transaction'}
        </button>
      </div>

      {isAdding && (
        <AddTransactionForm
          addTransaction={addTransaction}
          onClose={() => setIsAdding(false)}
          accountOptions={visibleAccounts.map((account) => ({ id: account.id, name: account.name }))}
          defaultAccountId={defaultManualAccountId}
          categoryOptions={categories}
          transactions={transactions}
        />
      )}

      <div className="p-6 border-b border-gray-100 bg-white space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Accounts</h4>
          <p className="text-sm text-gray-500 mt-1">Switch between your shared household view and individual card tabs.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedAccountId('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium border ${
              selectedAccountId === 'all'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Accounts
          </button>
          {visibleAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => setSelectedAccountId(account.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border ${
                selectedAccountId === account.id
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {account.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              {selectedAccount ? `${selectedAccount.name} snapshot` : 'All-account snapshot'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedAccount
                ? 'Use this tab to isolate one card\'s spending, payments, and recurring charges.'
                : 'See every transaction together, then drop into a single card when you want a cleaner bill view.'}
            </p>
            {selectedAccount && selectedAccountSpend ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Charges</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(selectedAccountSpend.charges)}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Payments</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(selectedAccountSpend.payments)}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Transactions</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{selectedAccountSpend.transactionCount}</p>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleAddCard} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Add a credit card tab</p>
              <p className="text-sm text-gray-500 mt-1">Create a reusable card/account so transactions can be tracked individually.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newCardName}
                onChange={(event) => setNewCardName(event.target.value)}
                placeholder="Card name"
                className={COMMON_INPUT_CLASS}
              />
              <input
                type="text"
                value={newCardIssuer}
                onChange={(event) => setNewCardIssuer(event.target.value)}
                placeholder="Issuer"
                className={COMMON_INPUT_CLASS}
              />
              <input
                type="text"
                value={newCardLast4}
                onChange={(event) => setNewCardLast4(event.target.value)}
                placeholder="Last 4"
                maxLength={4}
                className={COMMON_INPUT_CLASS}
              />
            </div>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Add card tab
            </button>
          </form>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Find transactions fast</h4>
              <p className="text-sm text-gray-500 mt-1">
                Search merchants, categories, institutions, and filter down by type or date range.
              </p>
              <p className="text-sm text-indigo-600 mt-2">
                Need to fix a category? Use the `Edit` button in the Category column.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {sortedTransactions.length} transactions
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label htmlFor="transaction-search" className="block text-sm font-medium text-gray-700">Search</label>
              <input
                id="transaction-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search description, category, institution..."
                className={COMMON_INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="transaction-type-filter" className="block text-sm font-medium text-gray-700">Type</label>
              <select id="transaction-type-filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TransactionType)} className={COMMON_INPUT_CLASS}>
                <option value="all">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="cc_payment">CC Payment</option>
              </select>
            </div>
            <div>
              <label htmlFor="transaction-category-filter" className="block text-sm font-medium text-gray-700">Category</label>
              <select id="transaction-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={COMMON_INPUT_CLASS}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="transaction-start-date" className="block text-sm font-medium text-gray-700">Start date</label>
              <input id="transaction-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={COMMON_INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="transaction-end-date" className="block text-sm font-medium text-gray-700">End date</label>
              <input id="transaction-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={COMMON_INPUT_CLASS} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <datalist id="transaction-category-options">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  {sortedTransactions.length === 0
                    ? 'No transactions yet. Add some or import a CSV!'
                    : 'No transactions match your current filters.'}
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatISODate(t.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.institution || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{accountMap.get(t.accountId || '')?.name || 'Unassigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingCategoryId === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={t.category}
                          onChange={(event) => handleCategoryChange(t.id, event.target.value)}
                          onBlur={stopCategoryEdit}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === 'Escape') {
                              stopCategoryEdit();
                            }
                          }}
                          autoFocus
                          list="transaction-category-options"
                          aria-label={`Category for ${t.description}`}
                          className="w-36 rounded-md border border-indigo-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={stopCategoryEdit}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {t.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => startCategoryEdit(t.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          aria-label={`Edit category for ${t.description}`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      t.type === 'income' || (t.type === 'cc_payment' && t.amount > 0) ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {t.type === 'cc_payment' && t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(2)}` : `${t.type === 'income' || t.type === 'cc_payment' ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this transaction?')) {
                          deleteTransaction(t.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Delete transaction"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-white">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
