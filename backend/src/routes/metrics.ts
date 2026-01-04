import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Simple in-memory metrics store (in production, use Redis or a metrics service)
const metricsStore = {
  requests: {
    total: 0,
    byEndpoint: {} as Record<string, number>,
  },
  latency: [] as number[],
  accuracy: {
    extraction: 0,
    categorization: 0,
    taxDetection: 0,
  },
};

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Calculate latency percentiles
    const sortedLatency = [...metricsStore.latency].sort((a, b) => a - b);
    const p50 = sortedLatency[Math.floor(sortedLatency.length * 0.5)] || 0;
    const p90 = sortedLatency[Math.floor(sortedLatency.length * 0.9)] || 0;
    const p99 = sortedLatency[Math.floor(sortedLatency.length * 0.99)] || 0;

    // Get accuracy from database (average confidence scores)
    const extractionConfidence = await prisma.document.aggregate({
      _avg: {
        confidence: true,
      },
      where: {
        extractionStatus: 'completed',
        confidence: { not: null },
      },
    });

    const categorizationConfidence = await prisma.transaction.aggregate({
      _avg: {
        confidence: true,
      },
      where: {
        category: { not: null },
        confidence: { not: null },
      },
    });

    const taxConfidence = await prisma.taxNote.aggregate({
      _avg: {
        confidence: true,
      },
    });

    const metrics = {
      accuracy: {
        extraction: extractionConfidence._avg.confidence || 0,
        categorization: categorizationConfidence._avg.confidence || 0,
        taxDetection: taxConfidence._avg.confidence || 0,
      },
      latency: {
        p50,
        p90,
        p99,
      },
      requests: {
        total: metricsStore.requests.total,
        byEndpoint: metricsStore.requests.byEndpoint,
      },
    };

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

// Export metrics store for middleware to update
export { metricsStore };

export default router;

