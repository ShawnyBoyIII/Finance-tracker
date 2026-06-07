import { TransactionType } from '@/types';
import { escapeRegExp } from '@/utils/finance';

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
  confidence?: 'high' | 'medium' | 'low';
  reviewFlags?: string[];
  parserProfile?: string;
}

export interface PdfTextExtractionResult {
  text: string;
  totalItems: number;
  nonEmptyItems: number;
  pagesWithText: number;
  pageCount: number;
}

export interface PdfImportAnalysis {
  shouldUseOcr: boolean;
  reason: 'empty_text' | 'sparse_text' | 'parse_failed' | 'text_ok';
}

interface StatementParserProfile {
  name: string;
  institutionMatch: RegExp;
  parse: (text: string, statementType: StatementType, institution?: string) => ParsedTransaction[];
}

const loadPdfJs = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  return pdfjsLib;
};

export const extractTextFromPdf = async (file: File): Promise<PdfTextExtractionResult> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  let totalItems = 0;
  let nonEmptyItems = 0;
  let pagesWithText = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .map((value: string) => value.trim());

    totalItems += strings.length;
    nonEmptyItems += strings.filter(Boolean).length;

    const text = strings
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 0) {
      pagesWithText += 1;
    }

    pageTexts.push(text);
  }

  return {
    text: pageTexts.join('\n').trim(),
    totalItems,
    nonEmptyItems,
    pagesWithText,
    pageCount: pdf.numPages,
  };
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

export const analyzePdfTextExtraction = (
  extraction: PdfTextExtractionResult,
  parsedTransactionsCount: number
): PdfImportAnalysis => {
  if (!extraction.text || extraction.nonEmptyItems === 0 || extraction.pagesWithText === 0) {
    return {
      shouldUseOcr: true,
      reason: 'empty_text',
    };
  }

  const averageItemsPerPage = extraction.nonEmptyItems / Math.max(extraction.pageCount, 1);
  const averageTextLengthPerPage = extraction.text.length / Math.max(extraction.pageCount, 1);

  if (parsedTransactionsCount > 0) {
    return {
      shouldUseOcr: false,
      reason: 'text_ok',
    };
  }

  if (averageItemsPerPage < 12 || averageTextLengthPerPage < 80) {
    return {
      shouldUseOcr: true,
      reason: 'sparse_text',
    };
  }

  return {
    shouldUseOcr: true,
    reason: 'parse_failed',
  };
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
  institution?: string,
  metadata?: Pick<ParsedTransaction, 'confidence' | 'reviewFlags' | 'parserProfile'>
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
    ...(metadata || {}),
  };
};

const normalizeStatementText = (text: string) => text.replace(/\s+/g, ' ').trim();

const parseClosingDate = (text: string) => {
  const numericDateMatch = text.match(
    /(?:Statement Date|Statement Closing Date|Closing Date)\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i
  );

  if (numericDateMatch) {
    const [, month, , year] = numericDateMatch;
    return {
      statementMonth: Number(month),
      statementYear: Number(year.length === 2 ? `20${year}` : year),
    };
  }

  return null;
};

const parseChaseCreditCardTransactions = (
  text: string,
  statementType: StatementType,
  institution?: string
): ParsedTransaction[] => {
  const closingDate = parseClosingDate(text);
  if (!closingDate) return [];

  const activityMatch = normalizeStatementText(text).match(
    /Date of Transaction\s+Merchant Name or Transaction Description\s+\$ Amount\s+(.*?)(?:\s+Total fees charged in|\s+Interest charged|\s+202\d Totals Year-to-Date|\s+Fees charged)/i
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
    const date = formatTransactionDate(month, day, closingDate.statementYear, closingDate.statementMonth);

    if (!date || !description || Number.isNaN(amount)) continue;

    const reviewFlags =
      description.includes('WWW.') || description.includes('*')
        ? ['Merchant text was normalized from a statement row.']
        : [];

    transactions.push(
      buildTransaction(date, amount, description, statementType, institution, {
        confidence: reviewFlags.length > 0 ? 'medium' : 'high',
        reviewFlags,
        parserProfile: 'Chase credit card',
      })
    );
  }

  return transactions;
};

const parseCapitalOneCreditCardTransactions = (
  text: string,
  statementType: StatementType,
  institution?: string
): ParsedTransaction[] => {
  const closingDate = parseClosingDate(text);
  if (!closingDate) return [];

  const activityMatch = normalizeStatementText(text).match(
    /Transactions\s+Trans Date\s+Post Date\s+Description\s+Amount\s+(.*?)\s+Total Transactions/i
  );

  if (!activityMatch) return [];

  const rows = activityMatch[1]
    .match(/\d{2}\/\d{2}\s+\d{2}\/\d{2}\s+.*?(?=\s+\d{2}\/\d{2}\s+\d{2}\/\d{2}\s+|$)/g);

  if (!rows) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const match = row.match(/^(\d{2})\/(\d{2})\s+\d{2}\/\d{2}\s+(.*?)\s+(-?[\d,]+\.\d{2})$/);
    if (!match) continue;

    const [, month, day, rawDescription, rawAmount] = match;
    const description = rawDescription.trim();
    const amount = Number(rawAmount.replace(/,/g, ''));
    const date = formatTransactionDate(month, day, closingDate.statementYear, closingDate.statementMonth);

    if (!date || !description || Number.isNaN(amount)) continue;

    transactions.push(
      buildTransaction(date, amount, description, statementType, institution, {
        confidence: 'high',
        reviewFlags: [],
        parserProfile: 'Capital One credit card',
      })
    );
  }

  return transactions;
};

const parseAmexCreditCardTransactions = (
  text: string,
  statementType: StatementType,
  institution?: string
): ParsedTransaction[] => {
  const closingDate = parseClosingDate(text);
  if (!closingDate) return [];

  const activityMatch = normalizeStatementText(text).match(
    /Date\s+Description\s+Amount\s+(.*?)\s+(?:Fees|Interest Charge Calculation|Total fees for this period)/i
  );

  if (!activityMatch) return [];

  const rows = activityMatch[1]
    .match(/\d{2}\/\d{2}\s+.*?(?=\s+\d{2}\/\d{2}\s+|$)/g);

  if (!rows) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const match = row.match(/^(\d{2})\/(\d{2})\s+(.*?)\s+(-?[\d,]+\.\d{2})$/);
    if (!match) continue;

    const [, month, day, rawDescription, rawAmount] = match;
    const description = rawDescription.trim();
    const amount = Number(rawAmount.replace(/,/g, ''));
    const date = formatTransactionDate(month, day, closingDate.statementYear, closingDate.statementMonth);

    if (!date || !description || Number.isNaN(amount)) continue;

    transactions.push(
      buildTransaction(date, amount, description, statementType, institution, {
        confidence: paymentRegex.test(description) ? 'medium' : 'high',
        reviewFlags: paymentRegex.test(description) ? ['Payment row detected from AmEx statement.'] : [],
        parserProfile: 'American Express credit card',
      })
    );
  }

  return transactions;
};

const STATEMENT_PARSER_PROFILES: StatementParserProfile[] = [
  {
    name: 'Chase credit card',
    institutionMatch: /\bChase\b/i,
    parse: parseChaseCreditCardTransactions,
  },
  {
    name: 'Capital One credit card',
    institutionMatch: /\bCapital One\b/i,
    parse: parseCapitalOneCreditCardTransactions,
  },
  {
    name: 'American Express credit card',
    institutionMatch: /\bAmerican Express\b|\bAmEx\b/i,
    parse: parseAmexCreditCardTransactions,
  },
];

const buildGenericReviewFlags = (description: string, amount: number) => {
  const flags: string[] = [];

  if (description.length < 6) {
    flags.push('Description is very short.');
  }

  if (!/[a-z]/i.test(description)) {
    flags.push('Description has weak merchant text.');
  }

  if (Math.abs(amount) >= 5000) {
    flags.push('Large amount parsed. Review before import.');
  }

  return flags;
};

export const parseTransactionsFromText = (text: string, statementType: StatementType): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];

  // Attempt to extract the institution from the full text
  let detectedInstitution: string | undefined;
  for (const inst of KNOWN_INSTITUTIONS) {
    // Use word boundaries to prevent matching "Chase" inside "Purchase"
    const regex = new RegExp(`\\b${escapeRegExp(inst)}\\b`, 'i');
    if (regex.test(text)) {
      detectedInstitution = inst;
      break;
    }
  }

  for (const profile of STATEMENT_PARSER_PROFILES) {
    if (!profile.institutionMatch.test(text)) {
      continue;
    }

    const profileTransactions = profile.parse(text, statementType, detectedInstitution);
    if (profileTransactions.length > 0) {
      return profileTransactions;
    }
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

      const reviewFlags = buildGenericReviewFlags(description, parsedAmount);

      transactions.push(
        buildTransaction(formattedDate, parsedAmount, description, statementType, detectedInstitution, {
          confidence: reviewFlags.length >= 2 ? 'low' : reviewFlags.length === 1 ? 'medium' : 'medium',
          reviewFlags,
          parserProfile: 'Generic statement parser',
        })
      );
    }
  }

  return transactions;
};
