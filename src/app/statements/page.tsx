'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import StatementsHub from '@/components/statements/StatementsHub';

export default function StatementsPage() {
  return (
    <div className="min-h-screen cockpit-grid">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <StatementsHub />
      </main>
    </div>
  );
}
