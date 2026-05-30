'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Budget } from '@/types';

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[]) => void;
  updateBudget: (category: string, amount: number) => void;
  deleteBudget: (category: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const LOCAL_STORAGE_TRANSACTIONS_KEY = 'finance_tracker_transactions';
const LOCAL_STORAGE_BUDGETS_KEY = 'finance_tracker_budgets';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const storedTransactions = localStorage.getItem(LOCAL_STORAGE_TRANSACTIONS_KEY);
    const storedBudgets = localStorage.getItem(LOCAL_STORAGE_BUDGETS_KEY);

    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }

    if (storedBudgets) {
      try {
        setBudgets(JSON.parse(storedBudgets));
      } catch (e) {
        console.error("Failed to parse budgets", e);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
  }, [transactions, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_BUDGETS_KEY, JSON.stringify(budgets));
    }
  }, [budgets, isLoaded]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, transaction: Omit<Transaction, 'id'>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...transaction, id } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    // ⚡ Bolt: Removed redundant .map(t => t) array allocation which was O(N) memory overhead before filtering
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addTransactionsBulk = (newTransactions: Omit<Transaction, 'id'>[]) => {
    const transactionsWithIds: Transaction[] = newTransactions.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
    }));
    setTransactions((prev) => [...prev, ...transactionsWithIds]);
  };

  const updateBudget = (category: string, amount: number) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category === category);
      if (existing) {
        return prev.map((b) => (b.category === category ? { ...b, amount } : b));
      }
      return [...prev, { category, amount }];
    });
  };

  const deleteBudget = (category: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addTransactionsBulk,
        updateBudget,
        deleteBudget,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
