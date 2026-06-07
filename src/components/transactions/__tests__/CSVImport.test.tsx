import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSVImport from '../CSVImport';
import { useFinance } from '@/context/FinanceContext';
import Papa from 'papaparse';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

jest.mock('papaparse', () => ({
  parse: jest.fn(),
}));

describe('CSVImport review flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFinance as jest.Mock).mockReturnValue({
      transactions: [
        {
          id: 'existing-1',
          amount: 11.99,
          type: 'expense',
          category: 'Subscriptions',
          date: '2026-06-12',
          description: 'Spotify',
          accountId: 'card-1',
        },
      ],
      addTransactionsBulk: jest.fn(),
    });
  });

  it('stages CSV rows for review, normalizes merchants, and blocks duplicate rows by default', async () => {
    const user = userEvent.setup();
    const addTransactionsBulk = jest.fn();

    (useFinance as jest.Mock).mockReturnValue({
      transactions: [
        {
          id: 'existing-1',
          amount: 11.99,
          type: 'expense',
          category: 'Subscriptions',
          date: '2026-06-12',
          description: 'Spotify',
          accountId: 'card-1',
        },
      ],
      addTransactionsBulk,
    });

    (Papa.parse as jest.Mock).mockImplementation((_file, config) => {
      config.complete({
        data: [
          { Date: '2026-06-12', Amount: '11.99', Description: 'SPOTIFY USA 12345 NEW YORK NY', Category: '' },
          { Date: '2026-06-15', Amount: '44.00', Description: 'AMAZON.COM*MKTP US AMZN.COM/BILL WA', Category: '' },
        ],
      });
    });

    render(<CSVImport statementType="credit_card" accountId="card-1" />);

    const file = new File(['Date,Amount,Description,Category'], 'sample.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Upload CSV file'), { target: { files: [file] } });

    await screen.findByText('Review CSV Transactions');

    expect(screen.getByDisplayValue('Spotify')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Potential duplicates')).toBeInTheDocument();
    expect(screen.getByText('Matches an existing transaction already in this account.')).toBeInTheDocument();

    const spotifyCheckbox = screen.getByLabelText('Include Spotify') as HTMLInputElement;
    const amazonCheckbox = screen.getByLabelText('Include Amazon') as HTMLInputElement;

    expect(spotifyCheckbox.checked).toBe(false);
    expect(amazonCheckbox.checked).toBe(true);

    await user.clear(screen.getByLabelText('Category for Amazon'));
    await user.type(screen.getByLabelText('Category for Amazon'), 'Shopping');
    await user.click(screen.getByRole('button', { name: 'Confirm & Import (1)' }));

    expect(addTransactionsBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        description: 'Amazon',
        category: 'Shopping',
        accountId: 'card-1',
      }),
    ]);

    await waitFor(() => {
      expect(screen.getByText('Imported 1 transaction after review.')).toBeInTheDocument();
    });
  });
});
