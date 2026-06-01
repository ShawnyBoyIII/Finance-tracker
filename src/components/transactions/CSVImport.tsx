'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { useFinance } from '@/context/FinanceContext';
import { TransactionType } from '@/types';

export default function CSVImport() {
  const { addTransactionsBulk } = useFinance();
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newTransactions = results.data.map((row: any) => {
            // Very basic mapping, expecting columns: Date, Amount, Description, Category
            const amount = parseFloat(row.Amount || '0');
            const type: TransactionType = amount >= 0 ? 'income' : 'expense';

            return {
              date: row.Date || new Date().toISOString().split('T')[0],
              amount: Math.abs(amount),
              type,
              description: row.Description || 'Imported Transaction',
              category: row.Category || 'Uncategorized',
            };
          });

          addTransactionsBulk(newTransactions);
          setError(null);
          alert('CSV Imported Successfully!');
        } catch {
          setError('Failed to parse CSV. Ensure columns: Date, Amount, Description, Category');
        }
      },
      error: (error) => {
        setError(error.message);
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Import CSV</h3>
      <p className="text-sm text-gray-500 mb-4">
        Upload a CSV file with columns: <strong>Date, Amount, Description, Category</strong>. (Negative amounts will be marked as expenses).
      </p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-indigo-50 file:text-indigo-700
          hover:file:bg-indigo-100"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
