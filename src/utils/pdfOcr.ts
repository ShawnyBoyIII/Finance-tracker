import { TransactionType } from '@/types';

import Tesseract from 'tesseract.js';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedTransaction {
  id?: string;
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  category: string;
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

export const parseTransactionsFromText = (text: string): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];

  // Basic regex: Look for MM/DD or MM/DD/YYYY, followed by some description, followed by amount
  const lines = text.split('\n');

  // Improved Regex: Allows for spaces, tabs between parts, negative amounts, and commas in the numbers
  const transactionRegex = /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(.*?)\s+(-?\$?\s*[\d,]+\.\d{2})$/i;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = trimmedLine.match(transactionRegex);
    if (match) {
      const [, dateStr, description, amountStr] = match;

      const cleanAmountStr = amountStr.replace(/[$\s,]/g, '');
      const parsedAmount = parseFloat(cleanAmountStr);
      if (isNaN(parsedAmount)) continue;

      let formattedDate = '';
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          formattedDate = parsedDate.toISOString().split('T')[0];
        } else {
            // Handle MM/DD by appending current year
            if(dateStr.length <= 5) {
                const currentYear = new Date().getFullYear();
                const d = new Date(`${dateStr}/${currentYear}`);
                if (!isNaN(d.getTime())) {
                    formattedDate = d.toISOString().split('T')[0];
                }
            }
        }
      } catch {
        // Leave formattedDate empty string if parsing fails
      }

      // Determine type based on amount sign and description keywords
      const isPayment = description.toLowerCase().includes('payment');

      let type: TransactionType = parsedAmount > 0 ? 'income' : 'expense';

      if (isPayment || (parsedAmount < 0 && isPayment)) {
        type = 'cc_payment';
      } else if (parsedAmount < 0) {
        // Some expenses might be negative without "payment" in the name,
        // but typically standard expenses are positive on statements.
        // We will default generic negatives to expenses unless they are CC payments
        type = 'expense';
      }

      transactions.push({
        id: uuidv4(), // Temporarily add an ID for rendering lists in staging area
        date: formattedDate,
        amount: type === 'cc_payment' ? parsedAmount : Math.abs(parsedAmount),
        type,
        description: description.trim() || 'OCR Transaction',
        category: 'Uncategorized',
      });
    }
  }

  return transactions;
};
