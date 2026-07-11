'use client';

import React, { useMemo, useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { COMMON_INPUT_CLASS } from '@/utils/constants';
import {
  formatCurrency,
  getStatementTransactions,
  getStatementValidationSummary,
  summarizeStatementTransactions,
} from '@/utils/finance';

const getSourceLabel = (sourceType: 'bank' | 'credit_card') =>
  sourceType === 'credit_card' ? 'Credit card' : 'Bank account';

const getStatusTone = (status: 'review' | 'imported' | 'failed') => {
  if (status === 'failed') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-100';
  }

  if (status === 'review') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  }

  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
};

const getValidationTone = (health: 'healthy' | 'needs_review' | 'high_risk') => {
  if (health === 'high_risk') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-100';
  }

  if (health === 'needs_review') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  }

  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
};

const getValidationLabel = (health: 'healthy' | 'needs_review' | 'high_risk') => {
  if (health === 'high_risk') return 'High risk import';
  if (health === 'needs_review') return 'Needs review';
  return 'Healthy import';
};

export default function StatementsHub() {
  const { statements, accounts, transactions } = useFinance();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'bank' | 'credit_card'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'csv' | 'pdf'>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');
  const [expandedStatementId, setExpandedStatementId] = useState<string | null>(null);

  const statementCards = useMemo(
    () =>
      statements.map((statement) => {
        const account = accounts.find((item) => item.id === statement.accountId);
        const summary = summarizeStatementTransactions(statement, transactions);
        const validation = getStatementValidationSummary(statement, transactions);
        const statementTransactions = getStatementTransactions(statement, transactions)
          .sort((left, right) => right.date.localeCompare(left.date));

        return {
          statement,
          accountName: account?.name || 'Unknown account',
          summary,
          validation,
          statementTransactions,
        };
      }),
    [accounts, statements, transactions]
  );

  const filteredStatements = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return statementCards.filter(({ statement, accountName }) => {
      if (sourceFilter !== 'all' && statement.sourceType !== sourceFilter) {
        return false;
      }

      if (formatFilter !== 'all' && statement.format !== formatFilter) {
        return false;
      }

      if (accountFilter !== 'all' && statement.accountId !== accountFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [
        statement.fileName,
        statement.institution || '',
        statement.parserProfile || '',
        accountName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchValue);
    });
  }, [accountFilter, formatFilter, search, sourceFilter, statementCards]);

  const totalImportedTransactions = statements.reduce(
    (total, statement) => total + statement.transactionCount,
    0
  );
  const totalDuplicateCandidates = statements.reduce(
    (total, statement) => total + (statement.duplicateCandidateCount || 0),
    0
  );
  const totalLowConfidence = statements.reduce(
    (total, statement) => total + (statement.lowConfidenceCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="cockpit-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Statement control</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Statements Hub</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Browse imported statements as durable records. This gives imports a home, so you can trace
              where transactions came from, review parser health, and keep cards and bank uploads
              separated.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Statements</div>
              <div className="mt-2 text-2xl font-semibold text-white">{statements.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Imported rows</div>
              <div className="mt-2 text-2xl font-semibold text-white">{totalImportedTransactions}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Flagged rows</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {totalDuplicateCandidates + totalLowConfidence}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cockpit-panel rounded-[28px] p-6">
        <div className="mb-5 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <label htmlFor="statement-search" className="mb-2 block text-sm font-medium text-slate-200">Search statements</label>
            <input
              id="statement-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file, institution, parser, account..."
              className={COMMON_INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="statement-source" className="mb-2 block text-sm font-medium text-slate-200">Source</label>
            <select
              id="statement-source"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as 'all' | 'bank' | 'credit_card')}
              className={COMMON_INPUT_CLASS}
            >
              <option value="all">All sources</option>
              <option value="credit_card">Credit card</option>
              <option value="bank">Bank account</option>
            </select>
          </div>
          <div>
            <label htmlFor="statement-format" className="mb-2 block text-sm font-medium text-slate-200">Format</label>
            <select
              id="statement-format"
              value={formatFilter}
              onChange={(event) => setFormatFilter(event.target.value as 'all' | 'csv' | 'pdf')}
              className={COMMON_INPUT_CLASS}
            >
              <option value="all">All formats</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label htmlFor="statement-account" className="mb-2 block text-sm font-medium text-slate-200">Account</label>
            <select
              id="statement-account"
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              className={COMMON_INPUT_CLASS}
            >
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredStatements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 px-6 py-10 text-center">
            <div className="text-lg font-medium text-white">No statements match this view yet.</div>
            <p className="mt-2 text-sm text-slate-400">
              Import a PDF or CSV from the Transactions page and it will appear here with its account,
              parser, period, and review metadata.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStatements.map(({ statement, accountName, summary, validation, statementTransactions }) => (
              <article
                key={statement.id}
                className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{statement.fileName}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${getStatusTone(statement.status)}`}>
                        {statement.status}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${getValidationTone(validation.health)}`}>
                        {getValidationLabel(validation.health)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
                      <span>{accountName}</span>
                      <span>{getSourceLabel(statement.sourceType)}</span>
                      <span>{statement.format.toUpperCase()}</span>
                      <span>Imported {new Date(statement.importedAt).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Spend</div>
                      <div className="mt-1 text-base font-semibold text-rose-200">
                        {formatCurrency(summary.expenseTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Payments</div>
                      <div className="mt-1 text-base font-semibold text-emerald-200">
                        {formatCurrency(summary.paymentTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Income</div>
                      <div className="mt-1 text-base font-semibold text-cyan-100">
                        {formatCurrency(summary.incomeTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Rows</div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {summary.transactionCount}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Import details</div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                      <div>
                        <span className="text-slate-400">Institution:</span>{' '}
                        {statement.institution || 'Not captured'}
                      </div>
                      <div>
                        <span className="text-slate-400">Parser:</span>{' '}
                        {statement.parserProfile || 'Generic/manual'}
                      </div>
                      <div>
                        <span className="text-slate-400">Period:</span>{' '}
                        {statement.periodStart && statement.periodEnd
                          ? `${statement.periodStart} to ${statement.periodEnd}`
                          : 'Not captured'}
                      </div>
                      <div>
                        <span className="text-slate-400">Reviewed rows:</span>{' '}
                        {statement.reviewedTransactionCount || statement.transactionCount}
                      </div>
                    </div>
                  </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Trust signals</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Duplicate candidates</span>
                        <span className="font-medium text-white">{statement.duplicateCandidateCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Review flags</span>
                        <span className="font-medium text-white">{statement.reviewFlagCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Medium confidence</span>
                        <span className="font-medium text-white">{statement.mediumConfidenceCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Low confidence</span>
                        <span className="font-medium text-white">{statement.lowConfidenceCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Excluded rows</span>
                        <span className="font-medium text-white">{validation.excludedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Validation summary</div>
                      <div className="mt-1 text-sm text-slate-200">
                        {validation.warnings.length === 0
                          ? 'No parser or review warnings were recorded for this import.'
                          : validation.warnings[0]}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStatementId((current) =>
                          current === statement.id ? null : statement.id
                        )
                      }
                      className="rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
                    >
                      {expandedStatementId === statement.id ? 'Hide review details' : 'Review statement details'}
                    </button>
                  </div>

                  {expandedStatementId === statement.id && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="text-sm font-medium text-white">Import warnings</div>
                        {validation.warnings.length === 0 ? (
                          <p className="mt-3 text-sm cockpit-muted">This statement imported cleanly.</p>
                        ) : (
                          <ul className="mt-3 space-y-2 text-sm text-slate-200">
                            {validation.warnings.map((warning) => (
                              <li key={`${statement.id}-${warning}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                {warning}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="text-sm font-medium text-white">Imported transaction preview</div>
                        {statementTransactions.length === 0 ? (
                          <p className="mt-3 text-sm cockpit-muted">
                            No linked transactions are currently attached to this statement.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {statementTransactions.slice(0, 8).map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <div>
                                  <div className="text-sm font-medium text-white">{transaction.description}</div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    {transaction.date} · {transaction.category}
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-white">
                                  {formatCurrency(
                                    transaction.type === 'cc_payment'
                                      ? Math.abs(transaction.amount)
                                      : transaction.amount
                                  )}
                                </div>
                              </div>
                            ))}
                            {statementTransactions.length > 8 && (
                              <div className="text-xs text-slate-400">
                                Showing 8 of {statementTransactions.length} linked transactions.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
