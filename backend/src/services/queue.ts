import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

/**
 * Railway deploy note:
 * - Our core MVP works without Redis (we do in-process extraction for the main flows).
 * - Some legacy endpoints/workers use BullMQ. We make Redis lazy/optional so the API server can boot
 *   even when REDIS_URL is not configured.
 */

let connection: Redis | null = null;
let extractionQueue: Queue | null = null;
let categorizationQueue: Queue | null = null;
let extractionQueueEvents: QueueEvents | null = null;
let categorizationQueueEvents: QueueEvents | null = null;
let listenersAttached = false;

function requireRedisUrl(): string {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set. Add a Redis plugin on Railway and set REDIS_URL, or disable queue-based endpoints.');
  }
  return url;
}

function getConnection(): Redis {
  if (connection) return connection;
  connection = new Redis(requireRedisUrl(), { maxRetriesPerRequest: null });
  return connection;
}

function attachListenersOnce() {
  if (listenersAttached) return;
  listenersAttached = true;

  extractionQueueEvents?.on('completed', ({ jobId }) => {
    logger.info(`Extraction job ${jobId} completed`);
  });

  extractionQueueEvents?.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Extraction job ${jobId} failed: ${failedReason}`);
  });

  categorizationQueueEvents?.on('completed', ({ jobId }) => {
    logger.info(`Categorization job ${jobId} completed`);
  });

  categorizationQueueEvents?.on('failed', ({ jobId, failedReason }) => {
    logger.error(`Categorization job ${jobId} failed: ${failedReason}`);
  });
}

function ensureQueues(): { extractionQueue: Queue; categorizationQueue: Queue } {
  if (extractionQueue && categorizationQueue) {
    return { extractionQueue, categorizationQueue };
  }
  const conn = getConnection();
  extractionQueue = new Queue('extraction', { connection: conn });
  categorizationQueue = new Queue('categorization', { connection: conn });
  extractionQueueEvents = new QueueEvents('extraction', { connection: conn });
  categorizationQueueEvents = new QueueEvents('categorization', { connection: conn });
  attachListenersOnce();
  return { extractionQueue, categorizationQueue };
}

export async function enqueueExtraction(documentId: string, s3Url: string, userId: string) {
  const { extractionQueue } = ensureQueues();
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
  const { categorizationQueue } = ensureQueues();
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

