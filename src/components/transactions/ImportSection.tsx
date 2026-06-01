'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import CSVImport from './CSVImport';

const PDFImport = dynamic(() => import('./PDFImport'), {
  ssr: false,
});

export type StatementType = 'bank' | 'credit_card';
export type FormatType = 'csv' | 'pdf';

export default function ImportSection() {
  const [statementType, setStatementType] = useState<StatementType>('bank');
  const [format, setFormat] = useState<FormatType>('pdf');

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Import Transactions</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Statement Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={statementType === 'bank'}
                onChange={() => setStatementType('bank')}
              />
              <span className="text-sm text-gray-700">Bank Statement</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={statementType === 'credit_card'}
                onChange={() => setStatementType('credit_card')}
              />
              <span className="text-sm text-gray-700">Credit Card Statement</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
              />
              <span className="text-sm text-gray-700">PDF</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="mr-2 text-indigo-600 focus:ring-indigo-500"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              <span className="text-sm text-gray-700">CSV</span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        {format === 'pdf' ? (
          <PDFImport statementType={statementType} />
        ) : (
          <CSVImport statementType={statementType} />
        )}
      </div>
    </div>
  );
}
