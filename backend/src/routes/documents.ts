import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { deleteFile, extractKeyFromS3Url } from '../services/storage.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, 'User ID required');
    }

    const documents = await prisma.document.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, 'User ID required');
    }

    const documentId = req.params.id;

    // Verify document belongs to user
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    if (document.userId !== req.userId) {
      throw new AppError(403, 'Not authorized to delete this document');
    }

    // Delete the file from storage
    try {
      const key = extractKeyFromS3Url(document.sourceUri);
      await deleteFile(key);
    } catch (error) {
      // Log but don't fail if file deletion fails
      console.error('Error deleting file:', error);
    }

    // Delete document (cascade will delete related transactions)
    await prisma.document.delete({
      where: { id: documentId },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

