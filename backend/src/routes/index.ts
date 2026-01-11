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
import usersRouter from './users.js';
import accountingRouter from './accounting.js';
import entitiesRouter from './entities.js';

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
      ai: 'openai',
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
router.use('/users', usersRouter);
router.use('/entities', entitiesRouter);
router.use('/accounting', accountingRouter);
router.use('/documents', documentsRouter);
router.use('/transactions', transactionsRouter);

export default router;

