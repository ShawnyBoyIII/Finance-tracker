import { parseTransactionsFromText } from '../pdfOcr';

describe('PDF OCR transaction parsing', () => {
  it('parses Chase credit card charges and payments with correct types and stored amounts', () => {
    const statementText = `
      Chase Freedom
      Statement Date: 01/02/2026
      Date of Transaction Merchant Name or Transaction Description $ Amount
      12/28 AUTOMATIC PAYMENT - THANK YOU -179.85
      12/04 TELLO US 866-3770294 GA 15.85
      12/20 MENERALS LLC 775-684-9000 NV 44.00
      12/21 TARGET.COM * WWW.TARGET.CO MN 4.24
      12/24 APEX SPIN AND FITNESS APEXSPINANDFI CA 5.00
      12/31 PUBLIX #803 DACULA GA 7.38
      Total fees charged in
    `;

    const transactions = parseTransactionsFromText(statementText, 'credit_card');

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
});
