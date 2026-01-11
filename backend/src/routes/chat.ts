import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { chatSchema } from '../utils/schemas.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { chatWithFinancesGemini } from '../services/gemini.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { TransactionData } from '../types/index.js';
import { resolveEntityForUser } from '../services/accounting/entity.js';

const router = Router();

function getRequestedEntityId(req: AuthRequest): string | null {
  const h = req.headers['x-entity-id'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  const q = (req.query as any)?.entityId;
  if (typeof q === 'string' && q.trim()) return q.trim();
  const b = (req.body as any)?.entityId;
  if (typeof b === 'string' && b.trim()) return b.trim();
  return null;
}

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

      // Accounting data (NormalizedTransaction + Categorization), scoped by active business (X-Entity-Id)
      const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
      if (!entity) throw new AppError(404, 'Business not found');

      const normalized = await prisma.normalizedTransaction.findMany({
        where: { entityId: entity.id },
        orderBy: { date: 'desc' },
        take: 250,
        include: {
          RawTransaction: true,
          Categorization: { include: { Category: true } },
        },
      });

      const txData: TransactionData[] = normalized.map((n) => ({
        date: n.date.toISOString(),
        amount: n.amount,
        currency: 'INR',
        description: n.descriptionClean,
        merchant: n.RawTransaction?.rawDescription || undefined,
        direction: (n.direction === 'inflow' ? 'income' : 'expense') as 'income' | 'expense',
        category: n.Categorization?.Category?.code || undefined,
        subCategory: n.Categorization?.Category?.name || undefined,
        isRecurring: false,
        labels: [],
        confidence: n.Categorization?.confidence ?? undefined,
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
      const response = await chatWithFinancesGemini(message, {
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
        // frontend expects `response`
        response,
        success: true,
        conversationId: conversationId || `conv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        entityId: entity.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

