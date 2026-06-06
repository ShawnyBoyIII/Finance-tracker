'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import DataManager from '@/components/data/DataManager';

export default function DataPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataManager />
      </main>
    </div>
  );
}
