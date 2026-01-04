import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { taxQuerySchema } from '../utils/schemas.js';
import { analyzeTaxOpportunities } from '../services/tax.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', authenticate, validate(taxQuerySchema), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, 'User ID required');
    }

    const assessmentYear = (req.query.assessmentYear as string) || new Date().getFullYear().toString();

    // Check if tax notes already exist for this year
    const existingNotes = await prisma.taxNote.findMany({
      where: {
        userId: req.userId,
        assessmentYear,
      },
    });

    if (existingNotes.length > 0) {
      logger.info(`Returning existing tax notes for user ${req.userId}, year ${assessmentYear}`);
      return res.json({
        assessmentYear,
        taxNotes: existingNotes,
        count: existingNotes.length,
      });
    }

    // Generate new tax opportunities
    const taxNotes = await analyzeTaxOpportunities(req.userId, assessmentYear);

    res.json({
      assessmentYear,
      taxNotes,
      count: taxNotes.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

