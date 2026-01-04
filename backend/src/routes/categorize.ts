import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { categorizeSchema } from '../utils/schemas.js';
import { categorizeTransactions } from '../services/categorization.js';
import { enqueueCategorization } from '../services/queue.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validate(categorizeSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const { transactionIds } = req.body;

      // If no transaction IDs provided, get all uncategorized transactions
      let txIds = transactionIds;
      if (!txIds || txIds.length === 0) {
        const uncategorized = await prisma.transaction.findMany({
          where: {
            userId: req.userId,
            category: null,
          },
          select: { id: true },
        });
        txIds = uncategorized.map((t) => t.id);
      }

      if (txIds.length === 0) {
        return res.json({
          message: 'No transactions to categorize',
          categorized: [],
        });
      }

      // Enqueue categorization job (async)
      await enqueueCategorization(txIds, req.userId);

      logger.info(`Categorization enqueued for ${txIds.length} transactions by user ${req.userId}`);

      res.json({
        message: 'Categorization job enqueued',
        transactionCount: txIds.length,
        transactionIds: txIds,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

