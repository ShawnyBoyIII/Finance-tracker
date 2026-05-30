import React from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import CSVImport from '@/components/transactions/CSVImport';
import TransactionList from '@/components/transactions/TransactionList';

// Dynamically import the PDFImport component, disabling SSR
// This prevents errors related to pdfjs-dist requiring browser APIs like DOMMatrix during server rendering
const PDFImport = dynamic(() => import('@/components/transactions/PDFImport'), {
  ssr: false,
});

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Transactions</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CSVImport />
          <PDFImport />
        </div>

        <TransactionList />
      </main>
    </div>
  );
}
