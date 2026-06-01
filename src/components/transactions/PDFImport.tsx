'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { extractImagesFromPdf, performOcrOnImages, parseTransactionsFromText, ParsedTransaction } from '@/utils/pdfOcr';
import { Trash2 } from 'lucide-react';

export default function PDFImport() {
  const { addTransactionsBulk } = useFinance();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stagedTransactions, setStagedTransactions] = useState<ParsedTransaction[]>([]);

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

    try {
      setProgress(10);
      const images = await extractImagesFromPdf(file);

      setProgress(30);
      const extractedText = await performOcrOnImages(images, (p) => {
        setProgress(30 + Math.round(p * 0.6)); // OCR progress accounts for 60% of the bar
      });

      setProgress(95);
      const transactions = parseTransactionsFromText(extractedText);

      if (transactions.length === 0) {
        setError('No valid transactions could be parsed from the PDF. It may not match expected formats or the OCR failed to read it clearly.');
      } else {
        setStagedTransactions(transactions);
      }

    } catch (e: any) {
      console.error(e);
      setError(`Failed to process PDF: ${e.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProgress(100);
      event.target.value = ''; // Reset input
    }
  };

  const handleRemoveStaged = (id: string) => {
    setStagedTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfirmImport = () => {
    // Remove the temporary 'id' and import to context
    const readyToImport = stagedTransactions.map(({ id: _, ...rest }) => rest);
    addTransactionsBulk(readyToImport);
    setStagedTransactions([]);
    alert(`Successfully imported ${readyToImport.length} transactions!`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Import Bank Statement (PDF)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Upload a PDF bank statement. The text will be extracted locally in your browser using OCR (no data is sent to a server). Note: This feature is experimental and works best with standard formats containing dates and amounts.
      </p>

      {!isProcessing && stagedTransactions.length === 0 && (
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
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

      {stagedTransactions.length > 0 && !isProcessing && (
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-4">
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
                Confirm & Import ({stagedTransactions.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stagedTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{t.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={t.type === 'income' || (t.type === 'cc_payment' && t.amount > 0) ? 'text-green-600' : 'text-red-600'}>
                        {t.type === 'cc_payment' && t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(2)}` : `${t.type === 'income' || t.type === 'cc_payment' ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleRemoveStaged(t.id!)}
                        className="text-red-500 hover:text-red-700"
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
