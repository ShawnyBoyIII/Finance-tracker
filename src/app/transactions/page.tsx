import React from 'react';
import Navbar from '@/components/layout/Navbar';
import CSVImport from '@/components/transactions/CSVImport';
import TransactionList from '@/components/transactions/TransactionList';

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Transactions</h1>
        </div>

        <CSVImport />
        <TransactionList />
      </main>
    </div>
  );
}
