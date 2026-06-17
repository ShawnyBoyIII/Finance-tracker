'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import BudgetManager from '@/components/budgets/BudgetManager';

export default function BudgetsPage() {
  return (
    <div className="min-h-screen cockpit-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Control spending</p>
            <h1 className="text-3xl font-semibold text-white mt-2">Budget Systems</h1>
          </div>
        </div>

        <BudgetManager />
      </main>
    </div>
  );
}
