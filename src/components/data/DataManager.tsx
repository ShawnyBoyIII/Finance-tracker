'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { AppData } from '@/types';

const getBackupFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `finance-tracker-backup-${date}.json`;
};

const isValidBackup = (value: unknown): value is AppData => {
  if (!value || typeof value !== 'object') return false;

  const backup = value as Partial<AppData>;
  return (
    Array.isArray(backup.transactions) &&
    Array.isArray(backup.budgets) &&
    Array.isArray(backup.accounts) &&
    !!backup.metadata &&
    typeof backup.metadata.schemaVersion === 'number'
  );
};

const readFileAsText = (file: File) => {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read backup file.'));
    reader.readAsText(file);
  });
};

export default function DataManager() {
  const { transactions, budgets, accounts, statements, bills, incomeSources, getBackupData, restoreBackupData } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    const backup = getBackupData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getBackupFilename();
    link.click();

    URL.revokeObjectURL(url);
    setError(null);
    setStatus('Backup exported.');
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const parsedBackup = JSON.parse(await readFileAsText(file));

      if (!isValidBackup(parsedBackup)) {
        throw new Error('This file does not look like a valid Finance Tracker backup.');
      }

      if (!window.confirm('Restore this backup? This will replace the data currently stored in this browser.')) {
        return;
      }

      restoreBackupData(parsedBackup);
      setError(null);
      setStatus(`Restored ${parsedBackup.transactions.length} transactions from ${file.name}.`);
    } catch (restoreError) {
      setStatus(null);
      setError(restoreError instanceof Error ? restoreError.message : 'Failed to restore backup.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Storage control</p>
        <h1 className="text-3xl font-semibold text-white mt-2">Data Management</h1>
        <p className="text-sm cockpit-muted mt-1">Export and restore your local finance data.</p>
      </div>

      <div className="cockpit-panel rounded-[28px] p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Transactions</p>
            <p className="text-2xl font-bold text-white mt-2">{transactions.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Accounts</p>
            <p className="text-2xl font-bold text-white mt-2">{accounts.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Budgets</p>
            <p className="text-2xl font-bold text-white mt-2">{budgets.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Statements</p>
            <p className="text-2xl font-bold text-white mt-2">{statements.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Bills</p>
            <p className="text-2xl font-bold text-white mt-2">{bills.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide cockpit-muted">Income Sources</p>
            <p className="text-2xl font-bold text-white mt-2">{incomeSources.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="cockpit-panel rounded-[28px] p-6">
          <h2 className="text-lg font-semibold text-white">Export Backup</h2>
          <p className="text-sm cockpit-muted mt-2">Download a JSON backup that includes transactions, accounts, budgets, and income source data.</p>
          <button
            type="button"
            onClick={handleExport}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-medium text-slate-950 hover:from-cyan-300 hover:to-indigo-400"
          >
            <Download className="h-4 w-4" />
            Export backup
          </button>
        </section>

        <section className="cockpit-panel rounded-[28px] p-6">
          <h2 className="text-lg font-semibold text-white">Restore Backup</h2>
          <p className="text-sm cockpit-muted mt-2">Choose a Finance Tracker backup file to replace the data stored in this browser.</p>
          <input
            ref={fileInputRef}
            aria-label="Restore backup file"
            type="file"
            accept="application/json,.json"
            onChange={handleRestore}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            <Upload className="h-4 w-4" />
            Restore backup
          </button>
        </section>
      </div>

      {status && <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{status}</p>}
      {error && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    </div>
  );
}
