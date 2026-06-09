'use client';

import React, { useMemo, useState } from 'react';
import { BellRing, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS, formatISODate } from '@/utils/constants';
import { formatCurrency, getDueSoonBills } from '@/utils/finance';

const statusTone: Record<string, string> = {
  upcoming: 'border-amber-200 bg-amber-50 text-amber-900',
  overdue: 'border-rose-200 bg-rose-50 text-rose-900',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

export default function BillPlanner() {
  const { bills, accounts, transactions, addBill, updateBill, deleteBill } = useFinance();
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [autopay, setAutopay] = useState(false);

  const dueSoonBills = useMemo(() => getDueSoonBills(bills, transactions), [bills, transactions]);
  const accountOptions = accounts.filter((account) => account.type === 'cash' || account.type === 'bank' || account.type === 'credit_card');
  const categories = Array.from(new Set(transactions.map((transaction) => transaction.category))).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const resetForm = () => {
    setEditingBillId(null);
    setName('');
    setDueDay('');
    setAmount('');
    setCategory('');
    setAutopay(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !dueDay) return;

    const billPayload = {
      name: name.trim(),
      dueDay: Number(dueDay),
      amount: amount ? Number(amount) : undefined,
      category: category || undefined,
      accountId: accountId || undefined,
      autopay,
    };

    if (editingBillId) {
      const existingBill = bills.find((bill) => bill.id === editingBillId);
      updateBill(editingBillId, {
        ...billPayload,
        manualStatus: existingBill?.manualStatus,
        manualStatusMonth: existingBill?.manualStatusMonth,
        manualPaidDate: existingBill?.manualPaidDate,
      });
    } else {
      addBill(billPayload);
    }

    resetForm();
  };

  const startEditing = (billId: string) => {
    const bill = bills.find((existingBill) => existingBill.id === billId);
    if (!bill) return;

    setEditingBillId(bill.id);
    setName(bill.name);
    setDueDay(String(bill.dueDay));
    setAmount(bill.amount ? String(bill.amount) : '');
    setCategory(bill.category || '');
    setAccountId(bill.accountId || accounts[0]?.id || '');
    setAutopay(Boolean(bill.autopay));
  };

  const setBillManualStatus = (billId: string, manualStatus: 'paid' | 'unpaid') => {
    const bill = bills.find((existingBill) => existingBill.id === billId);
    if (!bill) return;

    updateBill(billId, {
      name: bill.name,
      dueDay: bill.dueDay,
      amount: bill.amount,
      category: bill.category,
      accountId: bill.accountId,
      autopay: bill.autopay,
      manualStatus,
      manualStatusMonth: currentMonthKey,
      manualPaidDate: manualStatus === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
    });
  };

  return (
    <section className="cockpit-panel rounded-[28px] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-cyan-300" />
            <h3 className="text-lg font-medium text-white">Bills & Due Dates</h3>
          </div>
          <p className="text-sm cockpit-muted mt-1">
            Track monthly bills, assign them to cards, and see which ones are due or overdue.
          </p>
        </div>
        <div className="text-sm cockpit-muted">{bills.length} bills tracked</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-5">
        <form onSubmit={handleSubmit} className="rounded-[24px] border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">Bill name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Internet bill" className={COMMON_INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Due day</label>
              <input type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} placeholder="15" className={COMMON_INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Expected amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className={COMMON_INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Category</label>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={COMMON_INPUT_CLASS}>
                <option value="">Any category</option>
                {categories.map((existingCategory) => (
                  <option key={existingCategory} value={existingCategory}>
                    {existingCategory}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">Account</label>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={COMMON_INPUT_CLASS}>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200 mt-6">
              <input type="checkbox" checked={autopay} onChange={(event) => setAutopay(event.target.checked)} />
              Autopay enabled
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400">
              <Plus className="h-4 w-4" />
              {editingBillId ? 'Save bill' : 'Add bill'}
            </button>
            {editingBillId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="space-y-3">
          {dueSoonBills.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-5 text-sm cockpit-muted">
              Add bills above to start tracking what is due soon and what still needs attention this month.
            </div>
          ) : (
            dueSoonBills.slice(0, 6).map((bill) => (
              <div key={bill.billId} className={`rounded-[24px] border p-4 ${statusTone[bill.status]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{bill.name}</p>
                    <p className="text-xs mt-1 opacity-80">
                      Due {formatISODate(bill.dueDate)}
                      {bill.accountId ? ` • ${accountMap.get(bill.accountId)?.name || 'Account'}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide">{bill.status}</p>
                    <p className="text-base font-bold mt-1">{bill.amount ? formatCurrency(bill.amount) : 'Amount not set'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-xs opacity-80">
                  <span>
                    {bill.status === 'paid'
                      ? `Paid ${bill.matchedTransactionDate ? formatISODate(bill.matchedTransactionDate) : 'this cycle'}`
                      : bill.daysUntilDue < 0
                        ? `${Math.abs(bill.daysUntilDue)} day(s) overdue`
                        : `${bill.daysUntilDue} day(s) until due`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBillManualStatus(bill.billId, bill.status === 'paid' ? 'unpaid' : 'paid')}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-black/5"
                    >
                      {bill.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(bill.billId)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-black/5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this bill?')) {
                          deleteBill(bill.billId);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-black/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
