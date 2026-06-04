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

export const extractImagesFromPdf = async (file: File): Promise<string[]> => {
  // Dynamically import pdfjs-dist inside the function to ensure it only runs on the client
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

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

  // Split text by date-like patterns to handle OCR outputs where newlines are missing
  const dateRegex = /(?:\b|^)(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+/g;
  const splitText = text.split(dateRegex);

  // Improved Regex: Allows for spaces, tabs between parts, negative amounts, and commas in the numbers
  const transactionRegex = /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(.*?)\s*([-\u2013\u2014\u2212]?(?:\$\s*[\d,]+|[\d,]+)\.\d{2})$/i;

  // ⚡ Bolt: Hoist currentYear calculation outside the loop.
  // We avoid repeatedly instantiating new Date() for each transaction row.
  const currentYear = new Date().getFullYear().toString();
  const ignoreDescRegex = /balance|payment due|statement/i;
  const paymentRegex = /payment/i;
  const autoPaymentRegex = /automatic payment - thank you/i;

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
        formattedDate = `${currentYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (dateParts.length === 3) {
        const [m, d, y] = dateParts;
        const fullYear = y.length === 2 ? `20${y}` : y;
        formattedDate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      let type: TransactionType = 'expense'; // Default to expense
      const isPayment = paymentRegex.test(description);
      const isAutoPayment = autoPaymentRegex.test(description);

      if (isAutoPayment) {
        // Force these matches to be a CC payment regardless of sign or statement type
        type = 'cc_payment';
      } else if (statementType === 'credit_card') {
        // Credit Card rules: + is expense (spent money), - is cc_payment (paying bill/refund)
        if (parsedAmount > 0) {
          type = 'expense';
        } else {
          type = 'cc_payment';
        }
      } else {
        // Bank Statement rules: + is income, - is expense (or cc_payment if 'payment' in desc)
        if (parsedAmount > 0) {
          type = 'income';
        } else if (isPayment) {
          type = 'cc_payment';
        } else {
          type = 'expense';
        }
      }

      transactions.push({
        id: uuidv4(), // Temporarily add an ID for rendering lists in staging area
        date: formattedDate,
        amount: type === 'cc_payment' ? parsedAmount : Math.abs(parsedAmount),
        type,
        description: description.trim() || 'OCR Transaction',
        category: 'Uncategorized',
        ...(detectedInstitution && { institution: detectedInstitution }),
      });
    }
  }

  return transactions;
};
