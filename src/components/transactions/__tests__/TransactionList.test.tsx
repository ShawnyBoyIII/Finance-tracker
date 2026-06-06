import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TransactionList from '../TransactionList';
import { useFinance } from '@/context/FinanceContext';
import { Transaction } from '@/types';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

describe('TransactionList filtering', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      amount: 42.5,
      type: 'expense',
      category: 'Groceries',
      date: '2026-06-03',
      description: 'Trader Joe',
      institution: 'Chase',
    },
    {
      id: '2',
      amount: 2000,
      type: 'income',
      category: 'Salary',
      date: '2026-06-01',
      description: 'Main paycheck',
      institution: 'Bank of America',
    },
    {
      id: '3',
      amount: -350,
      type: 'cc_payment',
      category: 'Credit Card',
      date: '2026-05-29',
      description: 'Autopay thank you',
      institution: 'Capital One',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useFinance as jest.Mock).mockReturnValue({
      transactions: mockTransactions,
      addTransaction: jest.fn(),
      deleteTransaction: jest.fn(),
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
});
