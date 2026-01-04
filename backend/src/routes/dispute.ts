import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { disputeSchema } from '../utils/schemas.js';
import { generateDisputeEmail } from '../services/openai.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { TransactionData } from '../types/index.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validate(disputeSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const { transactionId, reason } = req.body;

      // Get transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId: req.userId,
        },
      });

      if (!transaction) {
        throw new AppError(404, 'Transaction not found');
      }

      // Convert to TransactionData format
      const txData: TransactionData = {
        date: transaction.date.toISOString(),
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        merchant: transaction.merchant || undefined,
        direction: transaction.direction as 'income' | 'expense',
        category: transaction.category || undefined,
        subCategory: transaction.subCategory || undefined,
        isRecurring: transaction.isRecurring,
        labels: transaction.labels,
        confidence: transaction.confidence || undefined,
      };

      // Generate dispute email
      const email = await generateDisputeEmail(txData, reason);

      logger.info(`Dispute email generated for transaction ${transactionId} by user ${req.userId}`);

      res.json({
        transactionId,
        email: {
          ...email,
          transactionDetails: {
            date: transaction.date.toISOString(),
            amount: transaction.amount,
            description: transaction.description,
          },
        },
        status: 'draft',
        note: 'Please review and edit the email before sending.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

