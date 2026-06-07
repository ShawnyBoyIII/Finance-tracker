import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { useFinance } from '@/context/FinanceContext';
import { Transaction } from '@/types';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: any }) => (
      <div style={{ width: '100%', height: '100%' }} data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children: any }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data }: { data: any[] }) => (
      <div data-testid="pie">
        {data.map((entry, index) => (
          <div key={`pie-entry-${index}`} data-testid={`pie-entry-${entry.name}`}>
            {entry.name}: {entry.value}
          </div>
        ))}
      </div>
    ),
    Cell: () => <div data-testid="cell" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />
  };
});

const baseFinanceMock = {
  transactions: [] as Transaction[],
  incomeSources: [],
  bills: [],
  accounts: [],
  addBill: jest.fn(),
  updateBill: jest.fn(),
  deleteBill: jest.fn(),
};

describe('Dashboard Component', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders correctly with empty transactions', () => {
    (useFinance as jest.Mock).mockReturnValue(baseFinanceMock);

    render(<Dashboard />);

    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Income').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Expenses').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Income this month').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Expenses this month').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('No expense data available. Add some transactions to see charts.')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('calculates and displays summary values and chart correctly with transactions', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 1000, type: 'income', category: 'Salary', date: '2023-01-01', description: 'Salary' },
      { id: '2', amount: 500, type: 'income', category: 'Bonus', date: '2023-01-02', description: 'Bonus' },
      { id: '3', amount: 200, type: 'expense', category: 'Food', date: '2023-01-03', description: 'Groceries' },
      { id: '4', amount: 100, type: 'expense', category: 'Transport', date: '2023-01-04', description: 'Gas' },
      { id: '5', amount: 50, type: 'expense', category: 'Food', date: '2023-01-05', description: 'Snacks' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
    });

    render(<Dashboard />);

    expect(screen.getByText('Total Income').nextElementSibling).toHaveTextContent('$1,500.00');
    expect(screen.getByText('Total Expenses').nextElementSibling).toHaveTextContent('$350.00');
    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$1,150.00');
    expect(screen.queryByText('No expense data available. Add some transactions to see charts.')).not.toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-entry-Food')).toHaveTextContent('Food: 250');
    expect(screen.getByTestId('pie-entry-Transport')).toHaveTextContent('Transport: 100');
  });

  it('handles negative balance correctly', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 500, type: 'income', category: 'Salary', date: '2023-01-01', description: 'Salary' },
      { id: '2', amount: 1000, type: 'expense', category: 'Rent', date: '2023-01-02', description: 'Rent' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
    });

    render(<Dashboard />);

    const balanceElement = screen.getByText('Total Balance').nextElementSibling;
    expect(balanceElement).toHaveTextContent('-$500.00');
    expect(balanceElement).toHaveClass('text-red-600');
  });

  it('shows month-scoped cash flow separately from lifetime totals', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 2000, type: 'income', category: 'Salary', date: '2026-06-01', description: 'Paycheck' },
      { id: '2', amount: 400, type: 'expense', category: 'Rent', date: '2026-06-02', description: 'Rent' },
      { id: '3', amount: 200, type: 'expense', category: 'Groceries', date: '2026-06-03', description: 'Groceries' },
      { id: '4', amount: 1500, type: 'income', category: 'Salary', date: '2026-05-20', description: 'Older paycheck' },
      { id: '5', amount: 300, type: 'expense', category: 'Travel', date: '2026-05-21', description: 'Old expense' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
      incomeSources: [
        { id: 'income-1', name: 'Partner A', amount: 1000, nextPayDate: '2026-06-19' },
        { id: 'income-2', name: 'Partner B', amount: 1500, nextPayDate: '2026-06-12' },
      ],
    });

    render(<Dashboard />);

    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$2,600.00');
    expect(screen.getByText('Income this month').nextElementSibling).toHaveTextContent('$2,000.00');
    expect(screen.getByText('Expenses this month').nextElementSibling).toHaveTextContent('$600.00');
    expect(screen.getByText('Net cash flow').nextElementSibling).toHaveTextContent('$1,400.00');
    expect(screen.getByText('Monthly safe to spend').nextElementSibling).toHaveTextContent('$6,400.00');
  });

  it('shows detected recurring bills on the dashboard', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 1200, type: 'expense', category: 'Housing', date: '2026-04-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '2', amount: 1200, type: 'expense', category: 'Housing', date: '2026-05-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '3', amount: 1200, type: 'expense', category: 'Housing', date: '2026-06-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '4', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-05-10', description: 'Spotify', institution: 'Capital One' },
      { id: '5', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-06-10', description: 'Spotify', institution: 'Capital One' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
    });

    render(<Dashboard />);

    expect(screen.getByText('Money Radar')).toBeInTheDocument();
    expect(screen.getAllByText('Rent Payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Spotify').length).toBeGreaterThan(0);
    expect(screen.getByText('Jul 3, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jul 10, 2026')).toBeInTheDocument();
  });

  it('shows tracked bills and due dates on the dashboard', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 1200, type: 'expense', category: 'Housing', date: '2026-06-05', description: 'Rent Payment', accountId: 'account-1' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
      accounts: [{ id: 'account-1', name: 'Household Cash Flow', type: 'cash' }],
      bills: [
        { id: 'bill-1', name: 'Internet', dueDay: 18, amount: 85, category: 'Utilities', accountId: 'account-1' },
        { id: 'bill-2', name: 'Rent Payment', dueDay: 10, amount: 1200, category: 'Housing', accountId: 'account-1' },
      ],
    });

    render(<Dashboard />);

    expect(screen.getByText('Bills & Due Dates')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Jun 18, 2026'))).toBeInTheDocument();
    expect(screen.getAllByText('Rent Payment').length).toBeGreaterThan(0);
  });

  it('shows card summaries and a subscription watchlist', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 42.99, type: 'expense', category: 'Subscriptions', date: '2026-06-08', description: 'Spotify Premium', accountId: 'card-1', institution: 'Chase' },
      { id: '2', amount: 42.99, type: 'expense', category: 'Subscriptions', date: '2026-05-08', description: 'Spotify Premium', accountId: 'card-1', institution: 'Chase' },
      { id: '3', amount: 650, type: 'expense', category: 'Travel', date: '2026-06-10', description: 'Flight', accountId: 'card-1', institution: 'Chase' },
      { id: '4', amount: -200, type: 'cc_payment', category: 'Credit Card', date: '2026-06-12', description: 'Payment', accountId: 'card-1', institution: 'Chase' },
      { id: '5', amount: 19.99, type: 'expense', category: 'Subscriptions', date: '2026-06-03', description: 'Netflix', accountId: 'card-2', institution: 'Capital One' },
      { id: '6', amount: 19.99, type: 'expense', category: 'Subscriptions', date: '2026-05-03', description: 'Netflix', accountId: 'card-2', institution: 'Capital One' },
    ];

    (useFinance as jest.Mock).mockReturnValue({
      ...baseFinanceMock,
      transactions: mockTransactions,
      accounts: [
        { id: 'card-1', name: 'Chase Freedom', type: 'credit_card', issuer: 'Chase', last4: '1234' },
        { id: 'card-2', name: 'Capital One Venture', type: 'credit_card', issuer: 'Capital One', last4: '9876' },
      ],
    });

    render(<Dashboard />);

    expect(screen.getByText('Card Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Chase Freedom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Capital One Venture').length).toBeGreaterThan(0);
    expect(screen.getByText('Subscription Watchlist')).toBeInTheDocument();
    expect(screen.getAllByText('Spotify Premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Netflix').length).toBeGreaterThan(0);
  });
});
