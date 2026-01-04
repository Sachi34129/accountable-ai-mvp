import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, 'User ID required');
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
      take: 100,
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

export default router;

