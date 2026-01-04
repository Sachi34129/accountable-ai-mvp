import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { reportQuerySchema } from '../utils/schemas.js';
import { generateMonthlyReport } from '../services/report.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(reportQuerySchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const month = req.query.month as string;

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new AppError(400, 'Invalid month format. Use YYYY-MM');
      }

      // Check if report already exists
      const existingReport = await prisma.report.findUnique({
        where: {
          userId_month: {
            userId: req.userId,
            month,
          },
        },
        include: {
          // Note: Prisma doesn't support include with array fields directly
          // We'll fetch insights and tax notes separately
        },
      });

      if (existingReport) {
        // Fetch related insights and tax notes
        const insights = await prisma.insight.findMany({
          where: {
            id: { in: existingReport.insightIds },
          },
        });

        const taxNotes = await prisma.taxNote.findMany({
          where: {
            id: { in: existingReport.taxNoteIds },
          },
        });

        logger.info(`Returning existing report for user ${req.userId}, month ${month}`);
        return res.json({
          ...existingReport,
          insights,
          taxNotes,
        });
      }

      // Generate new report
      const report = await generateMonthlyReport(req.userId, month);

      // Fetch related insights and tax notes
      const insights = await prisma.insight.findMany({
        where: {
          id: { in: report.insightIds },
        },
      });

      const taxNotes = await prisma.taxNote.findMany({
        where: {
          id: { in: report.taxNoteIds },
        },
      });

      res.json({
        ...report,
        insights,
        taxNotes,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

