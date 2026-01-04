import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { chatSchema } from '../utils/schemas.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { chatWithFinances } from '../services/openai.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { TransactionData } from '../types/index.js';

const router = Router();

router.post(
  '/',
  chatLimiter,
  authenticate,
  validate(chatSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const { message, conversationId } = req.body;

      // Get recent transactions
      const transactions = await prisma.transaction.findMany({
        where: { userId: req.userId },
        orderBy: { date: 'desc' },
        take: 100,
      });

      const txData: TransactionData[] = transactions.map((tx) => ({
        date: tx.date.toISOString(),
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        merchant: tx.merchant || undefined,
        direction: tx.direction as 'income' | 'expense',
        category: tx.category || undefined,
        subCategory: tx.subCategory || undefined,
        isRecurring: tx.isRecurring,
        labels: tx.labels,
        confidence: tx.confidence || undefined,
      }));

      // Get recent insights
      const insights = await prisma.insight.findMany({
        where: { userId: req.userId },
        orderBy: { id: 'desc' },
        take: 10,
      });

      // Get recent tax notes
      const taxNotes = await prisma.taxNote.findMany({
        where: { userId: req.userId },
        orderBy: { id: 'desc' },
        take: 10,
      });

      // Generate response
      const response = await chatWithFinances(message, {
        transactions: txData,
        insights: insights.map((i) => ({
          type: i.type as any,
          summary: i.summary,
          eli5: i.eli5 || undefined,
          data: i.data as any,
          explanation: i.explanation || undefined,
          confidence: i.confidence || undefined,
        })),
        taxNotes: taxNotes.map((t) => ({
          section: t.section,
          title: t.title,
          potentialDeduction: t.potentialDeduction,
          evidenceTransactionIds: t.evidenceTransactionIds,
          explanation: t.explanation,
          confidence: t.confidence,
          uncertaintyNote: t.uncertaintyNote || undefined,
        })),
      });

      logger.info(`Chat response generated for user ${req.userId}`);

      res.json({
        message: response,
        conversationId: conversationId || `conv-${Date.now()}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

