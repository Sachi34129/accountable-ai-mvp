import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { extractDocument } from '../services/extraction.js';
import { enqueueCategorization } from '../services/queue.js';
import { logger } from '../utils/logger.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'extraction',
  async (job) => {
    const { documentId, s3Url, userId } = job.data;
    // s3Url can be either s3:// or local:// URL
    const fileUrl = s3Url;

    logger.info(`Processing extraction job for document ${documentId}`);

    try {
      // Extract document
      const result = await extractDocument(documentId, fileUrl, userId);

      // Enqueue categorization for extracted transactions
      if (result.transactions.length > 0) {
        await enqueueCategorization(result.transactions, userId);
        logger.info(`Enqueued categorization for ${result.transactions.length} transactions`);
      }

      return result;
    } catch (error) {
      logger.error(`Extraction job failed for document ${documentId}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 extraction jobs concurrently
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
    },
  }
);

worker.on('completed', (job) => {
  logger.info(`Extraction job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Extraction job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info('Extraction worker started');
logger.info(`USE_OLLAMA: ${process.env.USE_OLLAMA || 'false'}`);
if (process.env.USE_OLLAMA === 'true') {
  logger.info('🤖 Ollama mode enabled - using local models');
} else {
  logger.info('🌐 OpenAI mode enabled - using OpenAI API');
}

// Keep process alive
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

