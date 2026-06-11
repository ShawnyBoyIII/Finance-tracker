import { isJacksonEmcBill, parseJacksonEmcElectricityBill } from '../electricityBillParser';

const sampleJacksonEmcBillText = `
  Important Information Page 1 of 2 Member-Owned MyJacksonEMC.com
  JACKSON EMC ACCOUNT # 1271096 Bill Date 05/12/2026
  Paid by Credit Card on 06/02/2026 $183.00
  TOTAL DUE: PAYMENT DUE 06/02/2026
  Account #: 1271096 Service period: Apr 7, 2026 - May 7, 2026
  Bill Date: 05/12/2026 Days of Service: 30
  Rate: Solar Farm Residential Service
  04/14/26 Previous Balance $226.00
  05/04/26 Payment - Thank You - $226.00
  06/02/26 TOTAL DUE $183.00
  Page 2 of 2 Services For 1871 JORDAN BROOK DR, LAWRENCEVILLE GA
  Service Period: Apr 7, 2026 - May 7, 2026 WPCA: 0.01100
  Meter # Use 6029562598
  Previous Reading 155970 Present Reading 157385
  Consumption 1415 kWh
  Cooperative Solar Generation 452 kWh
  Billed Consumption 963 kWh
  Autopay Amount On 06/02/2026 $183.00
`;

describe('electricityBillParser', () => {
  it('detects Jackson EMC electricity statements', () => {
    expect(isJacksonEmcBill(sampleJacksonEmcBillText)).toBe(true);
    expect(isJacksonEmcBill('Random utility statement')).toBe(false);
  });

  it('parses the stable Jackson EMC bill format', () => {
    expect(
      parseJacksonEmcElectricityBill(sampleJacksonEmcBillText, '2026_05_13_1271096.pdf')
    ).toEqual({
      provider: 'Jackson EMC',
      accountNumber: '1271096',
      billDate: '2026-05-12',
      dueDate: '2026-06-02',
      servicePeriodStart: '2026-04-07',
      servicePeriodEnd: '2026-05-07',
      daysOfService: 30,
      ratePlan: 'Solar Farm Residential Service',
      previousBalance: 226,
      paymentAmount: 226,
      totalDue: 183,
      totalConsumptionKwh: 1415,
      solarGenerationKwh: 452,
      billedConsumptionKwh: 963,
      sourceFileName: '2026_05_13_1271096.pdf',
    });
  });

  it('returns null for non-matching or incomplete text', () => {
    expect(parseJacksonEmcElectricityBill('not enough data', 'bad.pdf')).toBeNull();
  });
});
