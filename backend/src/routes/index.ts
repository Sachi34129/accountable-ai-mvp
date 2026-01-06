import { Router } from 'express';
import uploadRouter from './upload.js';
import extractRouter from './extract.js';
import categorizeRouter from './categorize.js';
import taxRouter from './tax.js';
import insightsRouter from './insights.js';
import reportRouter from './report.js';
import chatRouter from './chat.js';
import disputeRouter from './dispute.js';
import metricsRouter from './metrics.js';
import authRouter from './auth.js';
import documentsRouter from './documents.js';
import transactionsRouter from './transactions.js';

const router = Router();

// Health check with service status
router.get('/health', async (req, res) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      ollama: 'unknown',
    },
  };

  // Check database
  try {
    const { prisma } = await import('../db/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    await redis.quit();
    health.services.redis = 'connected';
  } catch (error) {
    health.services.redis = 'disconnected';
    health.status = 'degraded';
  }

  // Check Ollama (if enabled)
  if (process.env.USE_OLLAMA === 'true') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(
        `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        health.services.ollama = 'running';
      } else {
        health.services.ollama = 'error';
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.ollama = 'not_running';
      health.status = 'degraded';
    }
  } else {
    health.services.ollama = 'disabled';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
router.use('/upload', uploadRouter);
router.use('/extract', extractRouter);
router.use('/categorize', categorizeRouter);
router.use('/tax', taxRouter);
router.use('/insights', insightsRouter);
router.use('/report', reportRouter);
router.use('/chat', chatRouter);
router.use('/dispute', disputeRouter);
router.use('/metrics', metricsRouter);
router.use('/auth', authRouter);
router.use('/documents', documentsRouter);
router.use('/transactions', transactionsRouter);

export default router;

