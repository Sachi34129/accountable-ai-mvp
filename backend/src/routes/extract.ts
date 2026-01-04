import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { extractDocument } from '../services/extraction.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Internal endpoint for worker to trigger extraction
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { documentId, s3Url, userId } = req.body;

    if (!documentId || !s3Url || !userId) {
      throw new AppError(400, 'Missing required fields: documentId, s3Url, userId');
    }

    if (req.userId !== userId) {
      throw new AppError(403, 'Unauthorized: User ID mismatch');
    }

    const result = await extractDocument(documentId, s3Url, userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

