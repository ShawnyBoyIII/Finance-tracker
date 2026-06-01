'use client';

import dynamic from 'next/dynamic';

const PDFImport = dynamic(() => import('@/components/transactions/PDFImport'), {
  ssr: false,
});

export default function PDFImportWrapper() {
  return <PDFImport />;
}
