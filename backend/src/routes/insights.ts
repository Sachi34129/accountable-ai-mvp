import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { insightsQuerySchema } from '../utils/schemas.js';
import { generateFinancialInsights } from '../services/insights.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(insightsQuerySchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const period = (req.query.period as string) || new Date().toISOString().slice(0, 7); // YYYY-MM
      const type = req.query.type as string | undefined;

      // Check if insights already exist for this period
      const existingInsights = await prisma.insight.findMany({
        where: {
          userId: req.userId,
          period,
          ...(type && { type }),
        },
      });

      if (existingInsights.length > 0 && !type) {
        logger.info(`Returning existing insights for user ${req.userId}, period ${period}`);
        return res.json({
          period,
          insights: existingInsights,
          count: existingInsights.length,
        });
      }

      // Generate new insights
      const insights = await generateFinancialInsights(req.userId, period, type);

      res.json({
        period,
        insights,
        count: insights.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

