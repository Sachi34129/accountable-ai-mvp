import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Extraction queue
export const extractionQueue = new Queue('extraction', { connection });

// Categorization queue
export const categorizationQueue = new Queue('categorization', { connection });

// Queue events for monitoring
export const extractionQueueEvents = new QueueEvents('extraction', { connection });
export const categorizationQueueEvents = new QueueEvents('categorization', { connection });

export async function enqueueExtraction(documentId: string, s3Url: string, userId: string) {
  await extractionQueue.add(
    'extract-document',
    {
      documentId,
      s3Url,
      userId,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
  logger.info(`Extraction job enqueued for document ${documentId}`);
}

export async function enqueueCategorization(transactionIds: string[], userId: string) {
  await categorizationQueue.add(
    'categorize-transactions',
    {
      transactionIds,
      userId,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );
  logger.info(`Categorization job enqueued for ${transactionIds.length} transactions`);
}

// Queue event listeners
extractionQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Extraction job ${jobId} completed`);
});

extractionQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Extraction job ${jobId} failed: ${failedReason}`);
});

categorizationQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Categorization job ${jobId} completed`);
});

categorizationQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Categorization job ${jobId} failed: ${failedReason}`);
});

