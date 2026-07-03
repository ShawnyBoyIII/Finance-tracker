import { ElectricityStatement } from '@/types';

const normalizeText = (text: string) =>
  text
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const parseSlashDate = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';

  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
};

const parseMonthNameDate = (value: string) => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';
  return parsedDate.toISOString().slice(0, 10);
};

const parseCurrency = (value: string) => Number(value.replace(/[$,]/g, ''));
const parseInteger = (value: string) => Number(value.replace(/[^\d.]/g, ''));

export const isJacksonEmcBill = (text: string) => /JACKSON EMC/i.test(text);

export const parseJacksonEmcElectricityBill = (
  rawText: string,
  sourceFileName: string
): Omit<ElectricityStatement, 'id' | 'importedAt'> | null => {
  const text = normalizeText(rawText);
  if (!isJacksonEmcBill(text)) {
    return null;
  }

  const accountNumber = text.match(/Account #:\s*(\d+)/i)?.[1] || text.match(/ACCOUNT #\s*(\d+)/i)?.[1];
  const billDateRaw = text.match(/Bill Date[: ]\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  const dueDateRaw = text.match(/PAYMENT DUE\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || text.match(/TOTAL DUE\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  const servicePeriodMatch = text.match(/Service period:\s*([A-Za-z]{3} \d{1,2}, \d{4})\s*-\s*([A-Za-z]{3} \d{1,2}, \d{4})/i)
    || text.match(/Service Period:\s*([A-Za-z]{3} \d{1,2}, \d{4})\s*-\s*([A-Za-z]{3} \d{1,2}, \d{4})/i);
  const daysOfServiceRaw = text.match(/Days of Service:\s*(\d+)/i)?.[1];
  const ratePlan = text.match(/Rate:\s*([A-Za-z0-9 ]+?)(?=\s+\d{2}\/\d{2}\/\d{2}\s+Previous Balance)/i)?.[1]?.trim();
  const previousBalanceRaw = text.match(/Previous Balance\s*\$([\d,]+\.\d{2})/i)?.[1];
  const paymentAmountRaw = text.match(/Payment - Thank You - \$(\d[\d,]*\.\d{2})/i)?.[1]
    || text.match(/Paid by Credit Card on \d{2}\/\d{2}\/\d{4} \$(\d[\d,]*\.\d{2})/i)?.[1];
  const totalDueRaw = text.match(/TOTAL DUE:? \$(\d[\d,]*\.\d{2})/i)?.[1];
  const totalConsumptionRaw = text.match(/Consumption\s+(\d[\d,]*)\s*kWh/i)?.[1];
  const solarGenerationRaw = text.match(/Cooperative Solar Generation\s+(\d[\d,]*)\s*kWh/i)?.[1];
  const billedConsumptionRaw = text.match(/Billed Consumption\s+(\d[\d,]*)\s*kWh/i)?.[1];

  const billDate = billDateRaw ? parseSlashDate(billDateRaw) : '';
  const dueDate = dueDateRaw ? parseSlashDate(dueDateRaw) : '';
  const servicePeriodStart = servicePeriodMatch ? parseMonthNameDate(servicePeriodMatch[1]) : '';
  const servicePeriodEnd = servicePeriodMatch ? parseMonthNameDate(servicePeriodMatch[2]) : '';
  const totalDue = totalDueRaw ? parseCurrency(totalDueRaw) : Number.NaN;

  if (!accountNumber || !billDate || !dueDate || !servicePeriodStart || !servicePeriodEnd || Number.isNaN(totalDue)) {
    return null;
  }

  return {
    provider: 'Jackson EMC',
    accountNumber,
    billDate,
    dueDate,
    servicePeriodStart,
    servicePeriodEnd,
    daysOfService: daysOfServiceRaw ? parseInteger(daysOfServiceRaw) : undefined,
    ratePlan,
    previousBalance: previousBalanceRaw ? parseCurrency(previousBalanceRaw) : undefined,
    paymentAmount: paymentAmountRaw ? parseCurrency(paymentAmountRaw) : undefined,
    totalDue,
    totalConsumptionKwh: totalConsumptionRaw ? parseInteger(totalConsumptionRaw) : undefined,
    solarGenerationKwh: solarGenerationRaw ? parseInteger(solarGenerationRaw) : undefined,
    billedConsumptionKwh: billedConsumptionRaw ? parseInteger(billedConsumptionRaw) : undefined,
    sourceFileName,
  };
};
