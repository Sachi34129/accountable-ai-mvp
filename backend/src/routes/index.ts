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

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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

