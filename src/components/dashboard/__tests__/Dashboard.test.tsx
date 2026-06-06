import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { useFinance } from '@/context/FinanceContext';
import { Transaction } from '@/types';

// Mock the useFinance hook
jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

// Mock Recharts ResponsiveContainer to ensure it doesn't cause issues in JSDOM
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

describe('Dashboard Component', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders correctly with empty transactions', () => {
    // Setup mock to return empty transactions
    (useFinance as jest.Mock).mockReturnValue({ transactions: [], salarySchedule: null });

    render(<Dashboard />);

    // Check summary cards values
    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Income').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Expenses').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Income this month').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Expenses this month').nextElementSibling).toHaveTextContent('$0.00');

    // Check that empty state message is shown for charts
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

    (useFinance as jest.Mock).mockReturnValue({ transactions: mockTransactions, salarySchedule: null });

    render(<Dashboard />);

    // Total Income = 1000 + 500 = 1500
    expect(screen.getByText('Total Income').nextElementSibling).toHaveTextContent('$1,500.00');

    // Total Expenses = 200 + 100 + 50 = 350
    expect(screen.getByText('Total Expenses').nextElementSibling).toHaveTextContent('$350.00');

    // Total Balance = 1500 - 350 = 1150
    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$1,150.00');

    // Ensure empty state message is not shown
    expect(screen.queryByText('No expense data available. Add some transactions to see charts.')).not.toBeInTheDocument();

    // Check if the pie chart is rendered and displays correctly aggregated category data
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Food = 200 + 50 = 250
    expect(screen.getByTestId('pie-entry-Food')).toHaveTextContent('Food: 250');
    // Transport = 100
    expect(screen.getByTestId('pie-entry-Transport')).toHaveTextContent('Transport: 100');
  });

  it('handles negative balance correctly', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 500, type: 'income', category: 'Salary', date: '2023-01-01', description: 'Salary' },
      { id: '2', amount: 1000, type: 'expense', category: 'Rent', date: '2023-01-02', description: 'Rent' },
    ];

    (useFinance as jest.Mock).mockReturnValue({ transactions: mockTransactions, salarySchedule: null });

    render(<Dashboard />);

    const balanceElement = screen.getByText('Total Balance').nextElementSibling;
    expect(balanceElement).toHaveTextContent('-$500.00');
    // Ensure it has the red text class for negative balance
    expect(balanceElement).toHaveClass('text-red-600');
  });

  it('handles zero amount transactions', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 0, type: 'income', category: 'Salary', date: '2023-01-01', description: 'Salary' },
      { id: '2', amount: 0, type: 'expense', category: 'Rent', date: '2023-01-02', description: 'Rent' },
    ];

    (useFinance as jest.Mock).mockReturnValue({ transactions: mockTransactions, salarySchedule: null });

    render(<Dashboard />);

    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Income').nextElementSibling).toHaveTextContent('$0.00');
    expect(screen.getByText('Total Expenses').nextElementSibling).toHaveTextContent('$0.00');
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
      transactions: mockTransactions,
      salarySchedule: { amount: 1000, nextPayDate: '2026-06-19' },
    });

    render(<Dashboard />);

    expect(screen.getByText('Total Balance').nextElementSibling).toHaveTextContent('$2,600.00');
    expect(screen.getByText('Income this month').nextElementSibling).toHaveTextContent('$2,000.00');
    expect(screen.getByText('Expenses this month').nextElementSibling).toHaveTextContent('$600.00');
    expect(screen.getByText('Net cash flow').nextElementSibling).toHaveTextContent('$1,400.00');
    expect(screen.getByText('Monthly safe to spend').nextElementSibling).toHaveTextContent('$3,400.00');
  });

  it('shows detected recurring bills on the dashboard', () => {
    const mockTransactions: Transaction[] = [
      { id: '1', amount: 1200, type: 'expense', category: 'Housing', date: '2026-04-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '2', amount: 1200, type: 'expense', category: 'Housing', date: '2026-05-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '3', amount: 1200, type: 'expense', category: 'Housing', date: '2026-06-03', description: 'Rent Payment', institution: 'Chase' },
      { id: '4', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-05-10', description: 'Spotify', institution: 'Capital One' },
      { id: '5', amount: 18, type: 'expense', category: 'Subscriptions', date: '2026-06-10', description: 'Spotify', institution: 'Capital One' },
    ];

    (useFinance as jest.Mock).mockReturnValue({ transactions: mockTransactions, salarySchedule: null });

    render(<Dashboard />);

    expect(screen.getByText('Upcoming Recurring Bills')).toBeInTheDocument();
    expect(screen.getByText('Rent Payment')).toBeInTheDocument();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('Jul 3, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jul 10, 2026')).toBeInTheDocument();
  });
});
