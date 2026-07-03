'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import type { ParsedTransaction } from '@/utils/pdfOcr';
import {
  findBatchDuplicates,
  findPotentialTransactionDuplicates,
  formatCurrency,
  getSuggestedCategory,
} from '@/utils/finance';
import { COMMON_INPUT_CLASS } from '@/utils/constants';
import { Transaction } from '@/types';
import { Trash2 } from 'lucide-react';

import { StatementType } from './ImportSection';

interface PDFImportProps {
  statementType: StatementType;
  accountId: string;
}

interface ReviewTransaction extends ParsedTransaction {
  include: boolean;
  duplicateExistingIds: string[];
  duplicateBatchIds: string[];
}

const getDisplayAmount = (transaction: ParsedTransaction) => {
  if (transaction.type === 'income' || transaction.type === 'cc_payment') {
    return {
      className: 'text-green-600',
      value: `+$${Math.abs(transaction.amount).toFixed(2)}`,
    };
  }

  return {
    className: 'text-red-600',
    value: `$${Math.abs(transaction.amount).toFixed(2)}`,
  };
};

const getConfidenceTone = (confidence: ParsedTransaction['confidence']) => {
  if (confidence === 'low') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (confidence === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const getConfidenceLabel = (confidence: ParsedTransaction['confidence']) =>
  confidence ? `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence` : 'Needs review';

export default function PDFImport({ statementType, accountId }: PDFImportProps) {
  const { importStatement, transactions } = useFinance();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stagedTransactions, setStagedTransactions] = useState<ReviewTransaction[]>([]);
  const [importPathSummary, setImportPathSummary] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const prepareReviewTransactions = (parsedTransactions: ParsedTransaction[]) => {
    const importedTransactions: Transaction[] = parsedTransactions.map((transaction) => ({
      id: transaction.id || `${transaction.date}-${transaction.description}`,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      category:
        transaction.category === 'Uncategorized'
          ? getSuggestedCategory(transaction.description, transactions)
          : transaction.category,
      institution: transaction.institution,
      accountId,
    }));

    const existingDuplicates = new Map(
      findPotentialTransactionDuplicates(importedTransactions, transactions).map((match) => [
        match.importedTransactionId,
        match.existingTransactionIds,
      ])
    );
    const batchDuplicates = findBatchDuplicates(importedTransactions);

    return parsedTransactions.map((transaction, index) => {
      const importedTransaction = importedTransactions[index];
      const duplicateExistingIds = existingDuplicates.get(importedTransaction.id) || [];
      const duplicateBatchIds = Array.from(batchDuplicates.values()).find((ids) => ids.includes(importedTransaction.id))
        ?.filter((id) => id !== importedTransaction.id) || [];

      const reviewFlags = [...(transaction.reviewFlags || [])];
      if (duplicateExistingIds.length > 0) {
        reviewFlags.push('Matches an existing transaction already in this account.');
      }
      if (duplicateBatchIds.length > 0) {
        reviewFlags.push('Looks duplicated within this import batch.');
      }

      return {
        ...transaction,
        category: importedTransaction.category,
        include: duplicateExistingIds.length === 0,
        duplicateExistingIds,
        duplicateBatchIds,
        reviewFlags,
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setStagedTransactions([]);
    setImportPathSummary(null);
    setSuccessMessage(null);
    setSelectedFileName(file.name);

    try {
      const {
        analyzePdfTextExtraction,
        extractImagesFromPdf,
        extractTextFromPdf,
        parseTransactionsFromText,
        performOcrOnImages,
      } = await import('@/utils/pdfOcr');

      setProgress(10);
      const textExtraction = await extractTextFromPdf(file);
      let parsedTransactions = parseTransactionsFromText(textExtraction.text, statementType);
      const analysis = analyzePdfTextExtraction(textExtraction, parsedTransactions.length);

      if (!analysis.shouldUseOcr) {
        setImportPathSummary('Imported using native PDF text extraction.');
      }

      if (analysis.shouldUseOcr) {
        setProgress(30);
        const images = await extractImagesFromPdf(file);
        const extractedText = await performOcrOnImages(images, (ocrProgress) => {
          setProgress(30 + Math.round(ocrProgress * 0.6));
        });
        parsedTransactions = parseTransactionsFromText(extractedText, statementType);
        setImportPathSummary(
          analysis.reason === 'empty_text'
            ? 'PDF looked like a scanned/image statement, so OCR was used.'
            : analysis.reason === 'sparse_text'
              ? 'PDF text extraction was too sparse, so OCR was used.'
              : 'PDF text was readable but did not parse cleanly, so OCR was used as fallback.'
        );
      }

      setProgress(95);

      if (parsedTransactions.length === 0) {
        setError('No valid transactions could be parsed from the PDF. It may not match the expected statement format.');
      } else {
        setStagedTransactions(prepareReviewTransactions(parsedTransactions));
      }
    } catch (e: any) {
      console.error(e);
      setError(`Failed to process PDF: ${e.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
      event.target.value = '';
    }
  };

  const handleRemoveStaged = (id: string) => {
    setStagedTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
  };

  const handleToggleInclude = (id: string) => {
    setStagedTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === id ? { ...transaction, include: !transaction.include } : transaction
      )
    );
  };

  const handleReviewFieldChange = (
    id: string,
    field: keyof Pick<ReviewTransaction, 'date' | 'description' | 'category' | 'type' | 'amount'>,
    value: string
  ) => {
    setStagedTransactions((prev) =>
      prev.map((transaction) => {
        if (transaction.id !== id) {
          return transaction;
        }

        if (field === 'amount') {
          const nextAmount = Number(value);
          return {
            ...transaction,
            amount: Number.isFinite(nextAmount) ? nextAmount : transaction.amount,
          };
        }

        return {
          ...transaction,
          [field]: value,
        };
      })
    );
  };

  const handleConfirmImport = () => {
    const readyToImport = stagedTransactions
      .filter((transaction) => transaction.include)
      .map(
        ({
          id: _id,
          include: _include,
          duplicateExistingIds: _duplicateExistingIds,
          duplicateBatchIds: _duplicateBatchIds,
          confidence: _confidence,
          reviewFlags: _reviewFlags,
          parserProfile: _parserProfile,
          ...rest
        }) => ({
          ...rest,
          accountId,
        })
      );

    if (readyToImport.length === 0) {
      setError('Select at least one transaction to import.');
      return;
    }

    const statementInstitution = stagedTransactions.find((transaction) => transaction.institution)?.institution;
    const parserProfile = stagedTransactions.find((transaction) => transaction.parserProfile)?.parserProfile;
    const statementDates = readyToImport.map((transaction) => transaction.date).sort();

    importStatement(
      {
        accountId,
        sourceType: statementType,
        format: 'pdf',
        fileName: selectedFileName || 'statement.pdf',
        institution: statementInstitution,
        parserProfile,
        periodStart: statementDates[0],
        periodEnd: statementDates[statementDates.length - 1],
        parseVersion: 1,
        reviewedTransactionCount: stagedTransactions.length,
        duplicateCandidateCount: duplicateCount,
        reviewFlagCount: stagedTransactions.reduce(
          (total, transaction) => total + (transaction.reviewFlags?.length || 0),
          0
        ),
        mediumConfidenceCount,
        lowConfidenceCount,
      },
      readyToImport
    );
    setStagedTransactions([]);
    setError(null);
    setSuccessMessage(`Imported ${readyToImport.length} transaction${readyToImport.length === 1 ? '' : 's'} from ${selectedFileName || 'PDF'} after review.`);
  };

  const includedCount = stagedTransactions.filter((transaction) => transaction.include).length;
  const duplicateCount = stagedTransactions.filter(
    (transaction) => transaction.duplicateExistingIds.length > 0 || transaction.duplicateBatchIds.length > 0
  ).length;
  const mediumConfidenceCount = stagedTransactions.filter((transaction) => transaction.confidence === 'medium').length;
  const lowConfidenceCount = stagedTransactions.filter((transaction) => transaction.confidence === 'low').length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Upload a PDF. The text will be extracted locally in your browser using OCR (no data is sent to a server). Note: This feature is experimental and works best with standard formats containing dates and amounts.
      </p>

      {!isProcessing && stagedTransactions.length === 0 && (
        <>
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            This importer now prefers built-in PDF text extraction first and only uses OCR when the statement appears scanned or the extracted text is too weak.
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            aria-label="Upload PDF file"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          />
        </>
      )}

      {isProcessing && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">Processing PDF... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
      {successMessage && <p className="mt-4 text-sm text-emerald-700 font-medium">{successMessage}</p>}
      {importPathSummary && <p className="mt-4 text-sm text-emerald-700 font-medium">{importPathSummary}</p>}

      {stagedTransactions.length > 0 && !isProcessing && (
        <div className="mt-6 border-t pt-4">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-100">
              <div className="text-slate-400">Ready to import</div>
              <div className="mt-1 text-xl font-semibold">{includedCount}</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <div className="text-amber-200/80">Potential duplicates</div>
              <div className="mt-1 text-xl font-semibold">{duplicateCount}</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <div className="text-amber-200/80">Medium confidence</div>
              <div className="mt-1 text-xl font-semibold">{mediumConfidenceCount}</div>
            </div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              <div className="text-rose-200/80">Low confidence</div>
              <div className="mt-1 text-xl font-semibold">{lowConfidenceCount}</div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-md font-semibold text-gray-900">Review Extracted Transactions</h4>
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
                {stagedTransactions.map((transaction) => {
                  const displayAmount = getDisplayAmount(transaction);

                  return (
                    <tr key={transaction.id}>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={transaction.include}
                          onChange={() => handleToggleInclude(transaction.id!)}
                          aria-label={`Include ${transaction.description}`}
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="date"
                          value={transaction.date}
                          onChange={(event) => handleReviewFieldChange(transaction.id!, 'date', event.target.value)}
                          className={COMMON_INPUT_CLASS}
                          aria-label={`Date for ${transaction.description}`}
                        />
                      </td>
                      <td className="px-4 py-4 min-w-64 align-top">
                        <input
                          type="text"
                          value={transaction.description}
                          onChange={(event) => handleReviewFieldChange(transaction.id!, 'description', event.target.value)}
                          className={COMMON_INPUT_CLASS}
                          aria-label={`Description for ${transaction.description}`}
                        />
                        <div className="mt-2 text-xs text-gray-500">{transaction.institution || 'Unknown institution'}</div>
                      </td>
                      <td className="px-4 py-4 min-w-44 align-top">
                        <input
                          type="text"
                          value={transaction.category}
                          onChange={(event) => handleReviewFieldChange(transaction.id!, 'category', event.target.value)}
                          className={COMMON_INPUT_CLASS}
                          aria-label={`Category for ${transaction.description}`}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                        <select
                          value={transaction.type}
                          onChange={(event) => handleReviewFieldChange(transaction.id!, 'type', event.target.value)}
                          className={COMMON_INPUT_CLASS}
                          aria-label={`Type for ${transaction.description}`}
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="cc_payment">CC payment</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={transaction.amount}
                          onChange={(event) => handleReviewFieldChange(transaction.id!, 'amount', event.target.value)}
                          className={COMMON_INPUT_CLASS}
                          aria-label={`Amount for ${transaction.description}`}
                        />
                        <div className={`mt-2 text-xs font-medium ${displayAmount.className}`}>{displayAmount.value}</div>
                      </td>
                      <td className="px-4 py-4 min-w-72 align-top text-sm text-gray-500">
                        <div className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getConfidenceTone(transaction.confidence)}`}>
                          {getConfidenceLabel(transaction.confidence)}
                        </div>
                        {transaction.parserProfile && (
                          <div className="mt-2 text-xs text-gray-500">Parser: {transaction.parserProfile}</div>
                        )}
                        {(transaction.reviewFlags || []).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {transaction.reviewFlags?.map((flag) => (
                              <div key={`${transaction.id}-${flag}`} className="text-xs text-amber-700">
                                {flag}
                              </div>
                            ))}
                          </div>
                        )}
                        {transaction.duplicateExistingIds.length > 0 && (
                          <div className="mt-2 text-xs text-rose-700">
                            Possible existing duplicate in this account.
                          </div>
                        )}
                        {transaction.duplicateBatchIds.length > 0 && (
                          <div className="mt-2 text-xs text-rose-700">
                            Duplicate also appears elsewhere in this PDF import.
                          </div>
                        )}
                        {transaction.amount !== 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Signed amount: {formatCurrency(transaction.amount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                        <button
                          onClick={() => handleRemoveStaged(transaction.id!)}
                          className="text-red-500 hover:text-red-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label="Remove staged transaction"
                          title="Remove staged transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
