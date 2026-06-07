import { analyzePdfTextExtraction, parseTransactionsFromText } from '../pdfOcr';
import {
  amexStatementFixture,
  capitalOneStatementFixture,
  chaseStatementFixture,
  chaseNoisyStatementFixture,
} from '../testFixtures/pdfStatements';

describe('PDF OCR transaction parsing', () => {
  it('parses Chase credit card charges and payments with correct types and stored amounts', () => {
    const transactions = parseTransactionsFromText(chaseStatementFixture, 'credit_card');

    expect(transactions).toHaveLength(6);
    expect(transactions[0]).toMatchObject({
      date: '2025-12-28',
      description: 'AUTOMATIC PAYMENT - THANK YOU',
      type: 'cc_payment',
      amount: -179.85,
      institution: 'Chase',
    });
    expect(transactions.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'TELLO US 866-3770294 GA',
          type: 'expense',
          amount: 15.85,
        }),
        expect.objectContaining({
          description: 'PUBLIX #803 DACULA GA',
          type: 'expense',
          amount: 7.38,
        }),
      ])
    );
  });

  it('parses noisier Chase statement sections and marks noisy merchants for review', () => {
    const transactions = parseTransactionsFromText(chaseNoisyStatementFixture, 'credit_card');

    expect(transactions).toHaveLength(4);
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'AMAZON.COM*MKTP US AMZN.COM/BILL WA',
          parserProfile: 'Chase credit card',
          confidence: 'medium',
        }),
        expect.objectContaining({
          description: 'SPOTIFY USA NEW YORK NY',
          parserProfile: 'Chase credit card',
        }),
      ])
    );
  });

  it('parses Capital One credit card charges and autopay rows', () => {
    const transactions = parseTransactionsFromText(capitalOneStatementFixture, 'credit_card');

    expect(transactions).toHaveLength(3);
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2025-12-03',
          description: 'NETFLIX.COM NETFLIX.COM CA',
          amount: 15.49,
          type: 'expense',
          institution: 'Capital One',
        }),
        expect.objectContaining({
          date: '2025-12-27',
          description: 'AUTOPAY PAYMENT - THANK YOU',
          amount: -125,
          type: 'cc_payment',
          institution: 'Capital One',
        }),
      ])
    );
  });

  it('parses American Express credit card charges and payment rows', () => {
    const transactions = parseTransactionsFromText(amexStatementFixture, 'credit_card');

    expect(transactions).toHaveLength(3);
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2025-12-05',
          description: 'WALMART SUPERCENTER LAWRENCEVILLE GA',
          amount: 28.44,
          type: 'expense',
          institution: 'American Express',
        }),
        expect.objectContaining({
          date: '2025-12-29',
          description: 'PAYMENT RECEIVED - THANK YOU',
          amount: -80,
          type: 'cc_payment',
          institution: 'American Express',
        }),
      ])
    );
  });

  it('prefers native PDF text when extraction is dense and already parsed', () => {
    expect(
      analyzePdfTextExtraction(
        {
          text: 'Statement Date 01/02/2026 Some valid text content repeated for multiple rows',
          totalItems: 200,
          nonEmptyItems: 180,
          pagesWithText: 2,
          pageCount: 2,
        },
        4
      )
    ).toEqual({
      shouldUseOcr: false,
      reason: 'text_ok',
    });
  });

  it('falls back to OCR when extracted PDF text is empty or too sparse', () => {
    expect(
      analyzePdfTextExtraction(
        {
          text: '',
          totalItems: 0,
          nonEmptyItems: 0,
          pagesWithText: 0,
          pageCount: 2,
        },
        0
      )
    ).toEqual({
      shouldUseOcr: true,
      reason: 'empty_text',
    });

    expect(
      analyzePdfTextExtraction(
        {
          text: 'Amt Date',
          totalItems: 8,
          nonEmptyItems: 6,
          pagesWithText: 1,
          pageCount: 2,
        },
        0
      )
    ).toEqual({
      shouldUseOcr: true,
      reason: 'sparse_text',
    });
  });
});
