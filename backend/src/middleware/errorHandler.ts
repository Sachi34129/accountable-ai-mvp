import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Multer upload errors (e.g., file too large)
  const anyErr = err as any;
  if (anyErr && anyErr.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large. Max upload size is 1MB.',
      statusCode: 413,
    });
  }

  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // Common upstream/service failures -> map to useful HTTP statuses (instead of generic 500)
  const msg = String((err as any)?.message || '');
  if (msg.includes('Gemini API error: 429') || msg.includes('"status": "RESOURCE_EXHAUSTED"') || msg.includes('RESOURCE_EXHAUSTED')) {
    return res.status(429).json({
      error: 'Gemini rate limit/quota exceeded. Please retry in a minute or use a higher-quota API key.',
      statusCode: 429,
      ...(process.env.NODE_ENV === 'development' && { details: msg }),
    });
  }

  if (msg.includes('OCR.Space processing failed') || msg.includes('OCR.Space error:')) {
    return res.status(422).json({
      error: 'OCR failed to read this document. Try a clearer scan/photo or a different file.',
      statusCode: 422,
      ...(process.env.NODE_ENV === 'development' && { details: msg }),
    });
  }

  // Unexpected errors
  logger.error('Unexpected error:', {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}

