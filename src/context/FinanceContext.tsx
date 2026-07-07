'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Transaction,
  Budget,
  FinancialAccount,
  FinancialAccountType,
  AppMetadata,
  AppData,
  IncomeSource,
  Bill,
  ImportedStatement,
  ElectricityStatement,
} from '@/types';
import { APP_DATA_SCHEMA_VERSION, exportAppData, loadAppData, saveAppData } from '@/utils/storage';
import { migrateSalaryScheduleToIncomeSources } from '@/utils/salary';
import { v4 as uuidv4 } from 'uuid';

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: FinancialAccount[];
  statements: ImportedStatement[];
  electricityStatements: ElectricityStatement[];
  bills: Bill[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addTransactionsBulk: (transactions: Omit<Transaction, 'id'>[]) => void;
  importStatement: (
    statement: Omit<ImportedStatement, 'id' | 'importedAt' | 'status' | 'transactionCount'>,
    transactions: Omit<Transaction, 'id' | 'statementId' | 'sourceType'>[]
  ) => string;
  addAccount: (account: Omit<FinancialAccount, 'id'>) => string;
  updateTransactionCategory: (id: string, category: string) => void;
  updateBudget: (category: string, amount: number) => void;
  deleteBudget: (category: string) => void;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Omit<Bill, 'id'>) => void;
  deleteBill: (id: string) => void;
  importElectricityStatement: (statement: Omit<ElectricityStatement, 'id' | 'importedAt'>) => string;
  incomeSources: IncomeSource[];
  addIncomeSource: (incomeSource: Omit<IncomeSource, 'id'>) => void;
  updateIncomeSource: (id: string, incomeSource: Omit<IncomeSource, 'id'>) => void;
  deleteIncomeSource: (id: string) => void;
  getBackupData: () => AppData;
  restoreBackupData: (appData: AppData) => void;
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
  const [statements, setStatements] = useState<ImportedStatement[]>([]);
  const [electricityStatements, setElectricityStatements] = useState<ElectricityStatement[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
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
    setStatements(storedAppData.statements || []);
    setElectricityStatements(storedAppData.electricityStatements || []);
    setBills(storedAppData.bills || []);
    setIncomeSources(
      storedAppData.incomeSources && storedAppData.incomeSources.length > 0
        ? storedAppData.incomeSources
        : migrateSalaryScheduleToIncomeSources(storedAppData.salarySchedule || null)
    );
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
      statements,
      electricityStatements,
      bills,
      salarySchedule: null,
      incomeSources,
      metadata,
    });
  }, [transactions, budgets, accounts, statements, electricityStatements, bills, incomeSources, metadata, isLoaded]);

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

  const importStatement = (
    statement: Omit<ImportedStatement, 'id' | 'importedAt' | 'status' | 'transactionCount'>,
    importedTransactions: Omit<Transaction, 'id' | 'statementId' | 'sourceType'>[]
  ) => {
    const statementId = uuidv4();
    const transactionsWithIds: Transaction[] = importedTransactions.map((transaction) => ({
      ...transaction,
      id: uuidv4(),
      accountId: transaction.accountId || statement.accountId || DEFAULT_ACCOUNT_ID,
      statementId,
      sourceType: statement.sourceType,
    }));

    const importedStatement: ImportedStatement = {
      ...statement,
      id: statementId,
      importedAt: new Date().toISOString(),
      status: 'imported',
      transactionCount: transactionsWithIds.length,
      reviewedTransactionCount:
        statement.reviewedTransactionCount === undefined
          ? importedTransactions.length
          : statement.reviewedTransactionCount,
    };

    setTransactions((prev) => [...prev, ...transactionsWithIds]);
    setStatements((prev) => [importedStatement, ...prev]);

    return statementId;
  };

  const addAccount = (account: Omit<FinancialAccount, 'id'>) => {
    const newAccount: FinancialAccount = {
      ...account,
      id: uuidv4(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    return newAccount.id;
  };

  const updateTransactionCategory = (id: string, category: string) => {
    const normalizedCategory = category.trim();
    if (!normalizedCategory) return;

    setTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === id ? { ...transaction, category: normalizedCategory } : transaction
      )
    );
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

  const addBill = (bill: Omit<Bill, 'id'>) => {
    setBills((prev) => [
      ...prev,
      {
        ...bill,
        id: uuidv4(),
      },
    ]);
  };

  const updateBill = (id: string, bill: Omit<Bill, 'id'>) => {
    setBills((prev) => prev.map((existingBill) => (existingBill.id === id ? { ...bill, id } : existingBill)));
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  };

  const importElectricityStatement = (
    statement: Omit<ElectricityStatement, 'id' | 'importedAt'>
  ) => {
    const electricityStatement: ElectricityStatement = {
      ...statement,
      id: uuidv4(),
      importedAt: new Date().toISOString(),
    };

    setElectricityStatements((prev) => {
      const withoutMatchingStatement = prev.filter(
        (existingStatement) =>
          !(
            existingStatement.accountNumber === electricityStatement.accountNumber &&
            existingStatement.billDate === electricityStatement.billDate
          )
      );

      // ⚡ Bolt: Replaced expensive localeCompare with fast comparative operators for ISO date string sorting
      return [electricityStatement, ...withoutMatchingStatement].sort((left, right) =>
        (left.billDate < right.billDate ? 1 : left.billDate > right.billDate ? -1 : 0)
      );
    });

    return electricityStatement.id;
  };

  const addIncomeSource = (incomeSource: Omit<IncomeSource, 'id'>) => {
    setIncomeSources((prev) => [
      ...prev,
      {
        ...incomeSource,
        id: uuidv4(),
      },
    ]);
  };

  const updateIncomeSource = (id: string, incomeSource: Omit<IncomeSource, 'id'>) => {
    setIncomeSources((prev) =>
      prev.map((source) => (source.id === id ? { ...incomeSource, id } : source))
    );
  };

  const deleteIncomeSource = (id: string) => {
    setIncomeSources((prev) => prev.filter((source) => source.id !== id));
  };

  const getBackupData = () =>
    exportAppData({
      transactions,
      budgets,
      accounts,
      statements,
      electricityStatements,
      bills,
      salarySchedule: null,
      incomeSources,
      metadata,
    });

  const restoreBackupData = (appData: AppData) => {
    const migratedData = migrateTransactionsAndAccounts(
      appData.transactions || [],
      appData.accounts || null
    );

    setTransactions(migratedData.transactions);
    setAccounts(migratedData.accounts);
    setBudgets(appData.budgets || []);
    setStatements(appData.statements || []);
    setElectricityStatements(appData.electricityStatements || []);
    setBills(appData.bills || []);
    setIncomeSources(
      appData.incomeSources && appData.incomeSources.length > 0
        ? appData.incomeSources
        : migrateSalaryScheduleToIncomeSources(appData.salarySchedule || null)
    );
    setMetadata({
      ...(appData.metadata || {}),
      schemaVersion: APP_DATA_SCHEMA_VERSION,
      lastBackupAt: appData.metadata?.lastBackupAt,
    });
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        accounts,
        statements,
        electricityStatements,
        bills,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addTransactionsBulk,
        importStatement,
        addAccount,
        updateTransactionCategory,
        updateBudget,
        deleteBudget,
        addBill,
        updateBill,
        deleteBill,
        importElectricityStatement,
        incomeSources,
        addIncomeSource,
        updateIncomeSource,
        deleteIncomeSource,
        getBackupData,
        restoreBackupData,
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
