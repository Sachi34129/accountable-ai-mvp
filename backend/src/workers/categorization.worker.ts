import dotenv from 'dotenv';
dotenv.config(); // Ensure .env is loaded

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { categorizeTransactions } from '../services/categorization.js';
import { logger } from '../utils/logger.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'categorization',
  async (job) => {
    const { transactionIds, userId } = job.data;

    logger.info(`Processing categorization job for ${transactionIds.length} transactions`);

    try {
      const results = await categorizeTransactions(transactionIds, userId);
      return results;
    } catch (error) {
      logger.error(`Categorization job failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process up to 10 categorization jobs concurrently
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 1000,
    },
  }
);

worker.on('completed', (job) => {
  logger.info(`Categorization job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Categorization job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

logger.info('Categorization worker started');
logger.info('🌐 AI provider: OpenAI API');

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

