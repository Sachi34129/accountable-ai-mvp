import pdfParse from 'pdf-parse';
import { createCanvas } from '@napi-rs/canvas';
import { logger } from '../utils/logger.js';

export type IngestedDocument =
  | {
      kind: 'image';
      mimeType: string;
      imageBase64: string;
    }
  | {
      kind: 'pdf_digital';
      mimeType: 'application/pdf';
      text: string;
      pageCount?: number;
    }
  | {
      kind: 'pdf_scanned';
      mimeType: 'application/pdf';
      pageImages: Array<{ pageNumber: number; mimeType: 'image/png'; base64: string }>;
      pageCount?: number;
    };

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export async function ingestDocumentFile(params: {
  fileBuffer: Buffer;
  mimeType: string;
  maxPdfPagesToRender?: number;
}): Promise<IngestedDocument> {
  const { fileBuffer, mimeType, maxPdfPagesToRender = 8 } = params;

  if (mimeType !== 'application/pdf') {
    return {
      kind: 'image',
      mimeType,
      imageBase64: toBase64(fileBuffer),
    };
  }

  // Try digital text extraction first.
  try {
    const parsed = await pdfParse(fileBuffer);
    const text = (parsed.text || '').trim();
    const pageCount = parsed.numpages;

    // Heuristic: if we have meaningful text, treat as digital PDF.
    if (text.length >= 200) {
      logger.info(`PDF detected as digital (text length ${text.length}, pages ${pageCount})`);
      return {
        kind: 'pdf_digital',
        mimeType: 'application/pdf',
        text,
        pageCount,
      };
    }

    logger.info(`PDF likely scanned (low extracted text length ${text.length}, pages ${pageCount})`);
  } catch (e) {
    logger.warn(`pdf-parse failed; falling back to scanned PDF rendering: ${String(e)}`);
  }

  // Scanned PDF: render pages to images and OCR via vision model later.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
    disableAutoFetch: true,
    disableStream: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pagesToRender = Math.min(pageCount, maxPdfPagesToRender);

  logger.info(`Rendering scanned PDF pages: ${pagesToRender}/${pageCount}`);

  const pageImages: Array<{ pageNumber: number; mimeType: 'image/png'; base64: string }> = [];

  for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx as any, viewport }).promise;
    const pngBuffer = canvas.toBuffer('image/png');
    pageImages.push({
      pageNumber,
      mimeType: 'image/png',
      base64: toBase64(pngBuffer),
    });
  }

  return {
    kind: 'pdf_scanned',
    mimeType: 'application/pdf',
    pageImages,
    pageCount,
  };
}


