import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TransactionList from '../TransactionList';
import { useFinance } from '@/context/FinanceContext';
import { FinancialAccount, Transaction } from '@/types';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

describe('TransactionList filtering', () => {
  const mockAccounts: FinancialAccount[] = [
    { id: 'cash-1', name: 'Household Cash Flow', type: 'cash' },
    { id: 'card-1', name: 'Chase Freedom', type: 'credit_card', issuer: 'Chase', last4: '1234' },
    { id: 'card-2', name: 'Capital One Venture', type: 'credit_card', issuer: 'Capital One', last4: '9876' },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      amount: 42.5,
      type: 'expense',
      category: 'Groceries',
      date: '2026-06-03',
      description: 'Trader Joe',
      institution: 'Chase',
      accountId: 'card-1',
    },
    {
      id: '2',
      amount: 2000,
      type: 'income',
      category: 'Salary',
      date: '2026-06-01',
      description: 'Main paycheck',
      institution: 'Bank of America',
      accountId: 'cash-1',
    },
    {
      id: '3',
      amount: -350,
      type: 'cc_payment',
      category: 'Credit Card',
      date: '2026-05-29',
      description: 'Autopay thank you',
      institution: 'Capital One',
      accountId: 'card-2',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useFinance as jest.Mock).mockReturnValue({
      transactions: mockTransactions,
      accounts: mockAccounts,
      addAccount: jest.fn(() => 'card-3'),
      addTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
      updateTransactionCategory: jest.fn(),
    });
  });

  it('filters transactions by search text, type, and date range', async () => {
    const user = userEvent.setup();

    render(<TransactionList />);

    expect(screen.getByText('Trader Joe')).toBeInTheDocument();
    expect(screen.getByText('Main paycheck')).toBeInTheDocument();
    expect(screen.getByText('Autopay thank you')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search'), 'trader');

    expect(screen.getByText('Trader Joe')).toBeInTheDocument();
    expect(screen.queryByText('Main paycheck')).not.toBeInTheDocument();
    expect(screen.queryByText('Autopay thank you')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search'));
    await user.selectOptions(screen.getByLabelText('Type'), 'income');

    expect(screen.getByText('Main paycheck')).toBeInTheDocument();
    expect(screen.queryByText('Trader Joe')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'all');
    await user.selectOptions(screen.getByLabelText('Category'), 'Credit Card');

    expect(screen.getByText('Autopay thank you')).toBeInTheDocument();
    expect(screen.queryByText('Trader Joe')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Category'), 'all');
    await user.type(screen.getByLabelText('Start date'), '2026-06-01');
    await user.type(screen.getByLabelText('End date'), '2026-06-30');

    expect(screen.getByText('Trader Joe')).toBeInTheDocument();
    expect(screen.getByText('Main paycheck')).toBeInTheDocument();
    expect(screen.queryByText('Autopay thank you')).not.toBeInTheDocument();
  });

  it('switches between account tabs for individual card views', async () => {
    const user = userEvent.setup();

    render(<TransactionList />);

    await user.click(screen.getByRole('button', { name: 'Chase Freedom' }));

    expect(screen.getByText('Trader Joe')).toBeInTheDocument();
    expect(screen.queryByText('Main paycheck')).not.toBeInTheDocument();
    expect(screen.getByText('Chase Freedom snapshot')).toBeInTheDocument();
    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('updates a transaction category inline', async () => {
    const user = userEvent.setup();
    const updateTransactionCategory = jest.fn();

    (useFinance as jest.Mock).mockReturnValue({
      transactions: mockTransactions,
      accounts: mockAccounts,
      addAccount: jest.fn(() => 'card-3'),
      addTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
      updateTransactionCategory,
    });

    render(<TransactionList />);

    const categoryInput = screen.getByLabelText('Category for Trader Joe');
    await user.type(categoryInput, 's');

    expect(updateTransactionCategory).toHaveBeenLastCalledWith('1', 'Groceriess');
  });
});
