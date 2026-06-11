'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { useFinance } from '@/context/FinanceContext';
import { Transaction, TransactionType } from '@/types';
import {
  findBatchDuplicates,
  findPotentialTransactionDuplicates,
  getSuggestedCategory,
  normalizeMerchantName,
} from '@/utils/finance';
import { COMMON_INPUT_CLASS } from '@/utils/constants';
import { Trash2 } from 'lucide-react';

import { StatementType } from './ImportSection';

interface CSVImportProps {
  statementType: StatementType;
  accountId: string;
}

interface ReviewCsvTransaction extends Omit<Transaction, 'id'> {
  id: string;
  include: boolean;
  duplicateExistingIds: string[];
  duplicateBatchIds: string[];
  reviewFlags: string[];
}

const getTransactionType = (amount: number, description: string, statementType: StatementType): TransactionType => {
  const isPayment = /payment/i.test(description);

  if (statementType === 'credit_card') {
    return amount > 0 ? 'expense' : 'cc_payment';
  }

  if (amount > 0) {
    return 'income';
  }

  if (isPayment) {
    return 'cc_payment';
  }

  return 'expense';
};

const buildCsvReviewFlags = (
  row: Record<string, unknown>,
  normalizedDescription: string,
  category: string,
  amount: number
) => {
  const flags: string[] = [];

  if (!row.Date) {
    flags.push('Date was missing, so today was used.');
  }

  if (!row.Category) {
    flags.push('Category was inferred from past activity.');
  }

  if (normalizedDescription !== String(row.Description || '').trim()) {
    flags.push('Merchant name was normalized for cleaner tracking.');
  }

  if (category === 'Uncategorized') {
    flags.push('No confident category match yet.');
  }

  if (!Number.isFinite(amount)) {
    flags.push('Amount needs review.');
  }

  return flags;
};

export default function CSVImport({ statementType, accountId }: CSVImportProps) {
  const { importStatement, transactions } = useFinance();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stagedTransactions, setStagedTransactions] = useState<ReviewCsvTransaction[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const fallbackDate = new Date().toISOString().split('T')[0];

          const importedTransactions: Transaction[] = (results.data as Record<string, unknown>[]).map((row, index) => {
            const rawAmount = parseFloat(String(row.Amount || '0'));
            const normalizedDescription = normalizeMerchantName(String(row.Description || 'Imported Transaction'));
            const type = getTransactionType(rawAmount, normalizedDescription, statementType);
            const category = String(row.Category || '').trim() || getSuggestedCategory(normalizedDescription, transactions);

            return {
              id: `csv-${index}-${normalizedDescription}`,
              date: String(row.Date || fallbackDate),
              amount: type === 'cc_payment' ? rawAmount : Math.abs(rawAmount),
              type,
              description: normalizedDescription,
              category,
              accountId,
            };
          });

          const existingDuplicates = new Map(
            findPotentialTransactionDuplicates(importedTransactions, transactions).map((match) => [
              match.importedTransactionId,
              match.existingTransactionIds,
            ])
          );
          const batchDuplicates = findBatchDuplicates(importedTransactions);

          const reviewTransactions = importedTransactions.map((transaction, index) => {
            const row = results.data[index] as Record<string, unknown>;
            const duplicateExistingIds = existingDuplicates.get(transaction.id) || [];
            const duplicateBatchIds = Array.from(batchDuplicates.values()).find((ids) => ids.includes(transaction.id))
              ?.filter((id) => id !== transaction.id) || [];

            const reviewFlags = buildCsvReviewFlags(row, transaction.description, transaction.category, transaction.amount);
            if (duplicateExistingIds.length > 0) {
              reviewFlags.push('Matches an existing transaction already in this account.');
            }
            if (duplicateBatchIds.length > 0) {
              reviewFlags.push('Looks duplicated within this CSV import.');
            }

            return {
              ...transaction,
              include: duplicateExistingIds.length === 0,
              duplicateExistingIds,
              duplicateBatchIds,
              reviewFlags,
            };
          });

          setStagedTransactions(reviewTransactions);
          setError(null);
          setSuccessMessage(null);
        } catch {
          setError('Failed to parse CSV. Ensure columns: Date, Amount, Description, Category');
        }
      },
      error: (parseError) => {
        setError(parseError.message);
      }
    });

    event.target.value = '';
  };

  const handleChange = (
    id: string,
    field: keyof Pick<ReviewCsvTransaction, 'date' | 'description' | 'category' | 'type' | 'amount'>,
    value: string
  ) => {
    setStagedTransactions((prev) =>
      prev.map((transaction) => {
        if (transaction.id !== id) return transaction;

        if (field === 'amount') {
          const nextAmount = Number(value);
          return { ...transaction, amount: Number.isFinite(nextAmount) ? nextAmount : transaction.amount };
        }

        return { ...transaction, [field]: value };
      })
    );
  };

  const handleToggleInclude = (id: string) => {
    setStagedTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === id ? { ...transaction, include: !transaction.include } : transaction
      )
    );
  };

  const handleRemove = (id: string) => {
    setStagedTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
  };

  const handleConfirmImport = () => {
    const readyToImport = stagedTransactions
      .filter((transaction) => transaction.include)
      .map(({ id: _id, include: _include, duplicateExistingIds: _dedupe, duplicateBatchIds: _batch, reviewFlags: _flags, ...rest }) => rest);

    if (readyToImport.length === 0) {
      setError('Select at least one transaction to import.');
      return;
    }

    const statementDates = readyToImport.map((transaction) => transaction.date).sort();

    importStatement(
      {
        accountId,
        sourceType: statementType,
        format: 'csv',
        fileName: selectedFileName || 'import.csv',
        institution: transactions.find((transaction) => transaction.accountId === accountId)?.institution,
        periodStart: statementDates[0],
        periodEnd: statementDates[statementDates.length - 1],
        parseVersion: 1,
        reviewedTransactionCount: stagedTransactions.length,
        duplicateCandidateCount: duplicateCount,
        reviewFlagCount: stagedTransactions.reduce(
          (total, transaction) => total + transaction.reviewFlags.length,
          0
        ),
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
      },
      readyToImport
    );
    setStagedTransactions([]);
    setError(null);
    setSuccessMessage(`Imported ${readyToImport.length} transaction${readyToImport.length === 1 ? '' : 's'} from ${selectedFileName || 'CSV'} after review.`);
  };

  const includedCount = stagedTransactions.filter((transaction) => transaction.include).length;
  const duplicateCount = stagedTransactions.filter(
    (transaction) => transaction.duplicateExistingIds.length > 0 || transaction.duplicateBatchIds.length > 0
  ).length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Upload a CSV file with columns: <strong>Date, Amount, Description, Category</strong>. The import now pauses for review so you can catch duplicates or cleanup merchant names first.
      </p>
      {stagedTransactions.length === 0 && (
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          aria-label="Upload CSV file"
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        />
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {successMessage && <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>}

      {stagedTransactions.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-100">
              <div className="text-slate-400">Ready to import</div>
              <div className="mt-1 text-xl font-semibold">{includedCount}</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <div className="text-amber-200/80">Potential duplicates</div>
              <div className="mt-1 text-xl font-semibold">{duplicateCount}</div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-900">Review CSV Transactions</h4>
            <div className="space-x-3">
              <button
                onClick={() => setStagedTransactions([])}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Confirm & Import ({includedCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Import</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stagedTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={transaction.include}
                        onChange={() => handleToggleInclude(transaction.id)}
                        aria-label={`Include ${transaction.description}`}
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(event) => handleChange(transaction.id, 'date', event.target.value)}
                        className={COMMON_INPUT_CLASS}
                        aria-label={`Date for ${transaction.description}`}
                      />
                    </td>
                    <td className="px-4 py-4 min-w-64 align-top">
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(event) => handleChange(transaction.id, 'description', event.target.value)}
                        className={COMMON_INPUT_CLASS}
                        aria-label={`Description for ${transaction.description}`}
                      />
                    </td>
                    <td className="px-4 py-4 min-w-44 align-top">
                      <input
                        type="text"
                        value={transaction.category}
                        onChange={(event) => handleChange(transaction.id, 'category', event.target.value)}
                        className={COMMON_INPUT_CLASS}
                        aria-label={`Category for ${transaction.description}`}
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <select
                        value={transaction.type}
                        onChange={(event) => handleChange(transaction.id, 'type', event.target.value)}
                        className={COMMON_INPUT_CLASS}
                        aria-label={`Type for ${transaction.description}`}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="cc_payment">CC payment</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={transaction.amount}
                        onChange={(event) => handleChange(transaction.id, 'amount', event.target.value)}
                        className={COMMON_INPUT_CLASS}
                        aria-label={`Amount for ${transaction.description}`}
                      />
                    </td>
                    <td className="px-4 py-4 min-w-72 align-top text-sm text-gray-500">
                      {transaction.reviewFlags.length > 0 ? (
                        <div className="space-y-1">
                          {transaction.reviewFlags.map((flag) => (
                            <div key={`${transaction.id}-${flag}`} className="text-xs text-amber-700">
                              {flag}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700">Looks clean.</div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <button
                        onClick={() => handleRemove(transaction.id)}
                        className="text-red-500 hover:text-red-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Remove staged transaction"
                        title="Remove staged transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
