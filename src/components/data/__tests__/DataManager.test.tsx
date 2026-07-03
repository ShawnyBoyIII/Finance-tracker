import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DataManager from '../DataManager';
import { useFinance } from '@/context/FinanceContext';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

describe('DataManager', () => {
  const getBackupData = jest.fn();
  const restoreBackupData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => 'blob:backup');
    global.URL.revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();

    (useFinance as jest.Mock).mockReturnValue({
      transactions: [{ id: 'tx-1' }],
      budgets: [{ category: 'Groceries', amount: 500 }],
      accounts: [{ id: 'account-1', name: 'Household Cash Flow', type: 'cash' }],
      statements: [{ id: 'statement-1', accountId: 'account-1', sourceType: 'bank', format: 'csv', fileName: 'sample.csv', importedAt: '2026-06-07T00:00:00.000Z', status: 'imported', parseVersion: 1, transactionCount: 1 }],
      bills: [{ id: 'bill-1', name: 'Internet', dueDay: 12 }],
      incomeSources: [{ id: 'income-1', name: 'Partner A', amount: 2500, nextPayDate: '2026-06-12' }],
      getBackupData,
      restoreBackupData,
    });

    getBackupData.mockReturnValue({
      transactions: [{ id: 'tx-1' }],
      budgets: [],
      accounts: [],
      statements: [],
      bills: [],
      incomeSources: [],
      metadata: { schemaVersion: 2 },
    });
  });

  it('shows current data counts and exports a backup', async () => {
    const user = userEvent.setup();

    render(<DataManager />);

    expect(screen.getByText('Transactions').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Accounts').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Budgets').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Statements').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Bills').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Income Sources').nextElementSibling).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: /export backup/i }));

    expect(getBackupData).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Backup exported.')).toBeInTheDocument();
  });

  it('restores a valid backup file after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DataManager />);

    const file = new File(
      [
        JSON.stringify({
          transactions: [],
          budgets: [],
          accounts: [],
          statements: [],
          bills: [],
          salarySchedule: null,
          incomeSources: [],
          metadata: { schemaVersion: 2 },
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );

    const input = screen.getByLabelText('Restore backup file');
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Restored 0 transactions from backup.json.')).toBeInTheDocument();
    expect(restoreBackupData).toHaveBeenCalledWith(expect.objectContaining({ metadata: { schemaVersion: 2 } }));
  });
});
