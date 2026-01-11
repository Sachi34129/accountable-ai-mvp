import { extractTransactionsFromTextGemini } from './gemini.js';
import { getFileFromS3, extractKeyFromS3Url } from './storage.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import type { ExtractionResult } from '../types/index.js';
import { ocrSpaceExtractText } from './ocrSpace.js';

export async function extractDocument(documentId: string, fileUrl: string, userId: string) {
  try {
    logger.info(`Starting extraction for document ${documentId}`);

    // Update document status and progress
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        extractionStatus: 'processing',
        extractionProgress: 10, // Started processing
      },
    });

    // Get file from storage (handles both local:// and s3:// URLs)
    const key = extractKeyFromS3Url(fileUrl);
    const fileBuffer = await getFileFromS3(key);

    // Update progress: file loaded
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionProgress: 30 },
    });

    // Convert to base64 for OpenAI Vision API
    const mimeType = await prisma.document.findUnique({
      where: { id: documentId },
      select: { mimeType: true },
    });
    const resolvedMimeType = mimeType?.mimeType || 'application/octet-stream';

    // Update progress: ready for extraction
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionProgress: 40 },
    });

    // OCR via OCR.Space (works for images and PDFs, including scanned PDFs)
    const extractedText = await ocrSpaceExtractText({
      fileBuffer,
      // give OCR.Space a filename it can use (extension added in ocrSpace.ts as well)
      filename: `${documentId}`,
      mimeType: resolvedMimeType,
    });

    // Parse transactions from extracted text via Gemini (text)
    const result: ExtractionResult = await extractTransactionsFromTextGemini({
      text: extractedText,
      sourceHint: resolvedMimeType,
    });

    // Update progress: extraction complete, creating transactions
    await prisma.document.update({
      where: { id: documentId },
      data: { extractionProgress: 70 },
    });

    // Create transactions
    const transactions = await Promise.all(
      result.transactions.map((tx) =>
        prisma.transaction.create({
          data: {
            userId,
            documentId,
            date: new Date(tx.date),
            amount: tx.amount,
            currency: tx.currency || 'INR',
            description: tx.description,
            merchant: tx.merchant,
            direction: tx.direction,
            category: tx.category,
            subCategory: tx.subCategory,
            isRecurring: tx.isRecurring || false,
            labels: tx.labels || [],
            confidence: tx.confidence,
            explanation: undefined,
          },
        })
      )
    );

    // Update document - completed (frontend expects processed)
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: 'processed',
        extractionProgress: 100,
        extractedAt: new Date(),
        provenanceModel: result.metadata.model,
        provenanceVersion: result.metadata.version,
        confidence: result.metadata.confidence,
      },
    });

    logger.info(`Extraction completed for document ${documentId}, created ${transactions.length} transactions`);

    return {
      documentId,
      transactionCount: transactions.length,
      transactions: transactions.map((t) => t.id),
    };
  } catch (error) {
    logger.error(`Error extracting document ${documentId}:`, error);

    // Update document status to failed - ensure this always happens
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          extractionStatus: 'error',
          extractionProgress: 0, // Reset progress on failure
        },
      });
      logger.info(`Updated document ${documentId} status to error`);
    } catch (updateError) {
      logger.error(`Failed to update document ${documentId} status to error:`, updateError);
      // Continue anyway - the error is already logged
    }

    throw error;
  }
}

