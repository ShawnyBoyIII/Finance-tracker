import { TransactionType } from '@/types';

import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';
import { StatementType } from '@/components/transactions/ImportSection';

export interface ParsedTransaction {
  id?: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  category: string;
  institution?: string;
}

const loadPdfJs = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  return pdfjsLib;
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pageTexts.push(text);
  }

  return pageTexts.join('\n');
};

export const extractImagesFromPdf = async (file: File): Promise<string[]> => {
  // Dynamically import pdfjs-dist inside the function to ensure it only runs on the client
  const pdfjsLib = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better OCR resolution

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the page onto the canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    // Extract image data
    const dataUrl = canvas.toDataURL('image/png');
    images.push(dataUrl);
  }

  return images;
};

export const performOcrOnImages = async (images: string[], onProgress?: (progress: number) => void): Promise<string> => {
  let fullText = '';

  // Initialize the Tesseract worker
  const worker = await Tesseract.createWorker('eng');

  for (let i = 0; i < images.length; i++) {
    const { data: { text } } = await worker.recognize(images[i]);
    fullText += text + '\n';

    if (onProgress) {
      onProgress(Math.round(((i + 1) / images.length) * 100));
    }
  }

  await worker.terminate();
  return fullText;
};

const KNOWN_INSTITUTIONS = [
  'Chase',
  'Bank of America',
  'Capital One',
  'American Express',
  'Wells Fargo',
  'Discover',
  'Citi'
];

const paymentRegex = /payment|pymt|online payment/i;
const autoPaymentRegex = /autopay|auto[\s-]?payment/i;
const ignoreDescRegex = /previous balance|credit limit|available credit|payment due|total fees|interest charged/i;

const formatTransactionDate = (month: string, day: string, statementYear: number, statementMonth: number) => {
  const numericMonth = Number(month);
  const numericDay = Number(day);

  if (!numericMonth || !numericDay) return '';

  const inferredYear = numericMonth > statementMonth ? statementYear - 1 : statementYear;
  return `${inferredYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const buildTransaction = (
  date: string,
  amount: number,
  description: string,
  statementType: StatementType,
  institution?: string
): ParsedTransaction => {
  let type: TransactionType = 'expense';
  const isPayment = paymentRegex.test(description);
  const isAutoPayment = autoPaymentRegex.test(description);

  if (isAutoPayment) {
    type = 'cc_payment';
  } else if (statementType === 'credit_card') {
    type = amount > 0 ? 'expense' : 'cc_payment';
  } else if (amount > 0) {
    type = 'income';
  } else if (isPayment) {
    type = 'cc_payment';
  }

  return {
    id: uuidv4(),
    date,
    amount: type === 'cc_payment' ? amount : Math.abs(amount),
    type,
    description: description.trim() || 'Imported Transaction',
    category: 'Uncategorized',
    ...(institution && { institution }),
  };
};

const parseChaseCreditCardTransactions = (
  text: string,
  statementType: StatementType,
  institution?: string
): ParsedTransaction[] => {
  const statementDateMatch = text.match(/Statement Date:\s*(\d{2})\/(\d{2})\/(\d{2,4})/i);
  if (!statementDateMatch) return [];

  const statementMonth = Number(statementDateMatch[1]);
  const statementYear = Number(statementDateMatch[3].length === 2 ? `20${statementDateMatch[3]}` : statementDateMatch[3]);
  const activityMatch = text.match(
    /Date of Transaction\s+Merchant Name or Transaction Description\s+\$ Amount\s+(.*?)\s+Total fees charged in/i
  );

  if (!activityMatch) return [];

  const rows = activityMatch[1]
    .replace(/\s+/g, ' ')
    .match(/\d{2}\/\d{2}\s+.*?(?=\s+\d{2}\/\d{2}\s+|$)/g);

  if (!rows) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const match = row.match(/^(\d{2})\/(\d{2})\s+(.*?)\s+(-?[\d,]+\.\d{2})$/);
    if (!match) continue;

    const [, month, day, rawDescription, rawAmount] = match;
    const description = rawDescription.trim();
    const amount = Number(rawAmount.replace(/,/g, ''));
    const date = formatTransactionDate(month, day, statementYear, statementMonth);

    if (!date || !description || Number.isNaN(amount)) continue;

    transactions.push(buildTransaction(date, amount, description, statementType, institution));
  }

  return transactions;
};

export const parseTransactionsFromText = (text: string, statementType: StatementType): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];

  // Attempt to extract the institution from the full text
  let detectedInstitution: string | undefined;
  for (const inst of KNOWN_INSTITUTIONS) {
    // Use word boundaries to prevent matching "Chase" inside "Purchase"
    const regex = new RegExp(`\\b${inst}\\b`, 'i');
    if (regex.test(text)) {
      detectedInstitution = inst;
      break;
    }
  }

  const chaseTransactions = parseChaseCreditCardTransactions(text, statementType, detectedInstitution);
  if (chaseTransactions.length > 0) {
    return chaseTransactions;
  }

  const statementDateMatch = text.match(/Statement Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  const statementMonth = statementDateMatch ? Number(statementDateMatch[1]) : null;
  const statementYear = statementDateMatch
    ? Number(statementDateMatch[3].length === 2 ? `20${statementDateMatch[3]}` : statementDateMatch[3])
    : null;

  // Split text by date-like patterns to handle OCR outputs where newlines are missing
  const dateRegex = /(?:\b|^)(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+/g;
  const splitText = text.split(dateRegex);

  // ⚡ Bolt: Hoist currentYear calculation outside the loop.
  // We avoid repeatedly instantiating new Date() for each transaction row.
  const currentYear = new Date().getFullYear().toString();
  for (let i = 1; i < splitText.length; i += 2) {
    const dateStr = splitText[i];
    let rest = splitText[i + 1];
    if (!rest) continue;

    // Clean up leading spaces/newlines
    rest = rest.replace(/^\s+/, '');

    // Assuming description is at most 150 characters long before we see an amount.
    // Handles typographic dashes (which look like negative signs) by only matching hyphens attached to numbers/dollar signs
    const amountRegex = /^([^]{1,150}?)\s+([-\u2013\u2014\u2212]?\$?\s*[\d,]+\.\d{2})(?:\s|$)/;
    const match = rest.match(amountRegex);

    if (match) {
      const description = match[1].trim();
      const amountStr = match[2];

      // Filter out false positives common in statements
      if (
        ignoreDescRegex.test(description) ||
        description.startsWith('$')
      ) {
        continue;
      }

      // Further filter if description doesn't contain any letters
      if (!/[a-zA-Z]/.test(description)) {
        continue;
      }

      let cleanAmountStr = amountStr.replace(/[$\s,]/g, '');
      // Replace typographic dashes with standard hyphen for parseFloat
      cleanAmountStr = cleanAmountStr.replace(/[\u2013\u2014\u2212]/g, '-');
      const parsedAmount = parseFloat(cleanAmountStr);
      if (isNaN(parsedAmount)) continue;

      // ⚡ Bolt: Fast string parsing instead of expensive new Date() object instantiation.
      let formattedDate = '';
      const dateParts = dateStr.split(/[/-]/);

      if (dateParts.length === 2) {
        const [m, d] = dateParts;
        formattedDate = statementYear && statementMonth
          ? formatTransactionDate(m, d, statementYear, statementMonth)
          : `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (dateParts.length === 3) {
        const [m, d, y] = dateParts;
        const fullYear = y.length === 2 ? `20${y}` : y;
        formattedDate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      if (!formattedDate) continue;

      transactions.push(
        buildTransaction(formattedDate, parsedAmount, description, statementType, detectedInstitution)
      );
    }
  }

  return transactions;
};
