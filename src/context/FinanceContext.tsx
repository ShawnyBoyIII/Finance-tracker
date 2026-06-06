'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Budget, SalarySchedule, FinancialAccount, FinancialAccountType, AppMetadata } from '@/types';
import { APP_DATA_SCHEMA_VERSION, loadAppData, saveAppData } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: FinancialAccount[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[]) => void;
  addAccount: (account: Omit<FinancialAccount, 'id'>) => string;
  updateBudget: (category: string, amount: number) => void;
  deleteBudget: (category: string) => void;
  salarySchedule: SalarySchedule | null;
  setSalarySchedule: (schedule: SalarySchedule | null) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_ACCOUNT_ID = 'account-cash-default';

const DEFAULT_ACCOUNT: FinancialAccount = {
  id: DEFAULT_ACCOUNT_ID,
  name: 'Household Cash Flow',
  type: 'cash',
};

const normalizeInstitutionAccountName = (institution: string) =>
  institution.trim().replace(/\s+/g, ' ');

const buildAccountFromInstitution = (institution: string): FinancialAccount => ({
  id: uuidv4(),
  name: normalizeInstitutionAccountName(institution),
  type: 'credit_card',
  issuer: normalizeInstitutionAccountName(institution),
});

const inferAccountTypeFromTransaction = (transaction: Partial<Transaction>): FinancialAccountType => {
  if (transaction.type === 'cc_payment') {
    return 'credit_card';
  }

  return transaction.institution ? 'credit_card' : 'cash';
};

const migrateTransactionsAndAccounts = (
  rawTransactions: Transaction[],
  rawAccounts: FinancialAccount[] | null
) => {
  const accounts = rawAccounts && rawAccounts.length > 0 ? [...rawAccounts] : [DEFAULT_ACCOUNT];
  const accountsByName = new Map(accounts.map((account) => [account.name.toLowerCase(), account]));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  if (!accountsById.has(DEFAULT_ACCOUNT_ID)) {
    accounts.unshift(DEFAULT_ACCOUNT);
    accountsById.set(DEFAULT_ACCOUNT_ID, DEFAULT_ACCOUNT);
    accountsByName.set(DEFAULT_ACCOUNT.name.toLowerCase(), DEFAULT_ACCOUNT);
  }

  const transactions = rawTransactions.map((transaction) => {
    if (transaction.accountId && accountsById.has(transaction.accountId)) {
      return transaction;
    }

    if (transaction.institution) {
      const accountName = normalizeInstitutionAccountName(transaction.institution).toLowerCase();
      let matchingAccount = accountsByName.get(accountName);

      if (!matchingAccount) {
        matchingAccount = buildAccountFromInstitution(transaction.institution);
        matchingAccount.type = inferAccountTypeFromTransaction(transaction);
        accounts.push(matchingAccount);
        accountsByName.set(accountName, matchingAccount);
        accountsById.set(matchingAccount.id, matchingAccount);
      }

      return {
        ...transaction,
        accountId: matchingAccount.id,
      };
    }

    return {
      ...transaction,
      accountId: DEFAULT_ACCOUNT_ID,
    };
  });

  return {
    transactions,
    accounts,
  };
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([DEFAULT_ACCOUNT]);
  const [salarySchedule, setSalarySchedule] = useState<SalarySchedule | null>(null);
  const [metadata, setMetadata] = useState<AppMetadata>({ schemaVersion: APP_DATA_SCHEMA_VERSION });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedAppData = loadAppData();
    const migratedData = migrateTransactionsAndAccounts(
      storedAppData.transactions || [],
      storedAppData.accounts || null
    );

    setTransactions(migratedData.transactions);
    setAccounts(migratedData.accounts);
    setBudgets(storedAppData.budgets || []);
    setSalarySchedule(storedAppData.salarySchedule || null);
    setMetadata({
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      ...(storedAppData.metadata || {}),
    });

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    saveAppData({
      transactions,
      budgets,
      accounts,
      salarySchedule,
      metadata,
    });
  }, [transactions, budgets, accounts, salarySchedule, metadata, isLoaded]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      accountId: transaction.accountId || DEFAULT_ACCOUNT_ID,
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, transaction: Omit<Transaction, 'id'>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...transaction, id, accountId: transaction.accountId || DEFAULT_ACCOUNT_ID } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    // ⚡ Bolt: Removed redundant .map(t => t) array allocation which was O(N) memory overhead before filtering
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addTransactionsBulk = (newTransactions: Omit<Transaction, 'id'>[]) => {
    const transactionsWithIds: Transaction[] = newTransactions.map((t) => ({
      ...t,
      id: uuidv4(),
      accountId: t.accountId || DEFAULT_ACCOUNT_ID,
    }));
    setTransactions((prev) => [...prev, ...transactionsWithIds]);
  };

  const addAccount = (account: Omit<FinancialAccount, 'id'>) => {
    const newAccount: FinancialAccount = {
      ...account,
      id: uuidv4(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    return newAccount.id;
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
        accounts,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addTransactionsBulk,
        addAccount,
        updateBudget,
        deleteBudget,
        salarySchedule,
        setSalarySchedule,
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
