'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CSVImport from './CSVImport';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS } from '@/utils/constants';

const PDFImport = dynamic(() => import('./PDFImport'), {
  ssr: false,
});

export type StatementType = 'bank' | 'credit_card';
export type FormatType = 'csv' | 'pdf';

export default function ImportSection() {
  const { accounts, statements } = useFinance();
  const [statementType, setStatementType] = useState<StatementType>('bank');
  const [format, setFormat] = useState<FormatType>('pdf');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const selectableAccounts = accounts.filter((account) => account.type === 'cash' || account.type === 'bank' || account.type === 'credit_card');

  useEffect(() => {
    if (!selectedAccountId && selectableAccounts[0]?.id) {
      setSelectedAccountId(selectableAccounts[0].id);
      return;
    }

    if (selectedAccountId && !selectableAccounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(selectableAccounts[0]?.id || '');
    }
  }, [selectableAccounts, selectedAccountId]);

  return (
    <div className="cockpit-panel rounded-[28px] p-6 mb-6">
      <h3 className="text-lg font-medium text-white mb-4">Import Transactions</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Statement Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={statementType === 'bank'}
                onChange={() => setStatementType('bank')}
              />
              <span className="text-sm text-slate-200">Bank Statement</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={statementType === 'credit_card'}
                onChange={() => setStatementType('credit_card')}
              />
              <span className="text-sm text-slate-200">Credit Card Statement</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Destination Account</label>
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className={COMMON_INPUT_CLASS}
          >
            {selectableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Format</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
              />
              <span className="text-sm text-slate-200">PDF</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <span className="text-sm text-slate-200">CSV</span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 mt-4">
        {format === 'pdf' ? (
          <PDFImport statementType={statementType} accountId={selectedAccountId} />
        ) : (
          <CSVImport statementType={statementType} accountId={selectedAccountId} />
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Recent Imported Statements</h4>
          <span className="text-xs text-slate-400">{statements.length} total</span>
        </div>
        {statements.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No imported statements yet. Reviewed imports will show here.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {statements.slice(0, 5).map((statement) => {
              const accountName = accounts.find((account) => account.id === statement.accountId)?.name || 'Unknown account';
              return (
                <div key={statement.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-white">{statement.fileName}</div>
                      <div className="text-xs text-slate-400">
                        {accountName} · {statement.sourceType === 'credit_card' ? 'Credit card' : 'Bank'} · {statement.format.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{statement.transactionCount} txns</div>
                      <div>{new Date(statement.importedAt).toLocaleDateString('en-US')}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                    {statement.institution && <span>Institution: {statement.institution}</span>}
                    {statement.parserProfile && <span>Parser: {statement.parserProfile}</span>}
                    {statement.periodStart && statement.periodEnd && <span>Period: {statement.periodStart} to {statement.periodEnd}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
