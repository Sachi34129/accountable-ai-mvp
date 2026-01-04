import { Router } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadSchema } from '../utils/schemas.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadToS3 } from '../services/storage.js';
import { enqueueExtraction } from '../services/queue.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

router.post(
  '/',
  uploadLimiter,
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      if (!req.userId) {
        throw new AppError(401, 'User ID required');
      }

      const { type } = req.body;

      // Generate file key
      const timestamp = Date.now();
      const extension = req.file.originalname.split('.').pop();
      const key = `documents/${req.userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

      // Upload to local storage
      const localUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);

      // Create document record
      const document = await prisma.document.create({
        data: {
          userId: req.userId,
          type: type || 'unknown',
          sourceUri: localUrl,
          mimeType: req.file.mimetype,
          extractionStatus: 'pending',
        },
      });

      // Enqueue extraction job
      await enqueueExtraction(document.id, localUrl, req.userId);

      logger.info(`Document uploaded: ${document.id} by user ${req.userId}`);

      res.status(201).json({
        documentId: document.id,
        status: 'uploaded',
        extractionStatus: 'pending',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

