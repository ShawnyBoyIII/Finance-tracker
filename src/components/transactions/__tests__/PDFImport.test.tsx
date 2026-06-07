import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PDFImport from '../PDFImport';
import { useFinance } from '@/context/FinanceContext';

jest.mock('@/context/FinanceContext', () => ({
  useFinance: jest.fn(),
}));

jest.mock('@/utils/pdfOcr', () => ({
  extractTextFromPdf: jest.fn(),
  analyzePdfTextExtraction: jest.fn(),
  extractImagesFromPdf: jest.fn(),
  performOcrOnImages: jest.fn(),
  parseTransactionsFromText: jest.fn(),
}));

const pdfOcr = jest.requireMock('@/utils/pdfOcr');

describe('PDFImport review flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useFinance as jest.Mock).mockReturnValue({
      transactions: [
        {
          id: 'existing-1',
          amount: 15.85,
          type: 'expense',
          category: 'Phone',
          date: '2025-12-04',
          description: 'TELLO US 866-3770294 GA',
          accountId: 'card-1',
          institution: 'Chase',
        },
      ],
      addTransactionsBulk: jest.fn(),
    });

    pdfOcr.extractTextFromPdf.mockResolvedValue({
      text: 'mock text',
      totalItems: 100,
      nonEmptyItems: 90,
      pagesWithText: 2,
      pageCount: 2,
    });
    pdfOcr.analyzePdfTextExtraction.mockReturnValue({
      shouldUseOcr: false,
      reason: 'text_ok',
    });
    pdfOcr.parseTransactionsFromText.mockReturnValue([
      {
        id: 'import-1',
        date: '2025-12-04',
        amount: 15.85,
        type: 'expense',
        description: 'TELLO US 866-3770294 GA',
        category: 'Uncategorized',
        institution: 'Chase',
        confidence: 'high',
        reviewFlags: [],
        parserProfile: 'Chase credit card',
      },
      {
        id: 'import-2',
        date: '2025-12-20',
        amount: 44,
        type: 'expense',
        description: 'MENERALS LLC 775-684-9000 NV',
        category: 'Uncategorized',
        institution: 'Chase',
        confidence: 'medium',
        reviewFlags: ['Merchant text was normalized from a statement row.'],
        parserProfile: 'Chase credit card',
      },
    ]);
  });

  it('flags duplicates and imports only reviewed included rows', async () => {
    const user = userEvent.setup();
    const addTransactionsBulk = jest.fn();

    (useFinance as jest.Mock).mockReturnValue({
      transactions: [
        {
          id: 'existing-1',
          amount: 15.85,
          type: 'expense',
          category: 'Phone',
          date: '2025-12-04',
          description: 'TELLO US 866-3770294 GA',
          accountId: 'card-1',
          institution: 'Chase',
        },
      ],
      addTransactionsBulk,
    });

    render(<PDFImport statementType="credit_card" accountId="card-1" />);

    const fileInput = screen.getByLabelText('Upload PDF file');
    const file = new File(['fake pdf'], 'statement.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText('Review Extracted Transactions');

    expect(screen.getByText('Potential duplicates')).toBeInTheDocument();
    expect(screen.getByText('Possible existing duplicate in this account.')).toBeInTheDocument();
    expect(screen.getAllByText('Medium confidence').length).toBeGreaterThan(0);

    const duplicateCheckbox = screen.getByLabelText('Include TELLO US 866-3770294 GA') as HTMLInputElement;
    const cleanCheckbox = screen.getByLabelText('Include MENERALS LLC 775-684-9000 NV') as HTMLInputElement;

    expect(duplicateCheckbox.checked).toBe(false);
    expect(cleanCheckbox.checked).toBe(true);

    await user.clear(screen.getByLabelText('Category for MENERALS LLC 775-684-9000 NV'));
    await user.type(screen.getByLabelText('Category for MENERALS LLC 775-684-9000 NV'), 'Shopping');
    await user.click(screen.getByRole('button', { name: 'Confirm & Import (1)' }));

    expect(addTransactionsBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        date: '2025-12-20',
        amount: 44,
        category: 'Shopping',
        accountId: 'card-1',
      }),
    ]);

    await waitFor(() => {
      expect(screen.getByText('Imported 1 transaction after review.')).toBeInTheDocument();
    });
  });
});
