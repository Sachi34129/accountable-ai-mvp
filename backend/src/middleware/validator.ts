import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';
import { AuthRequest } from './auth.js';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Inject userId from auth middleware if available
      const authReq = req as AuthRequest;
      const dataToValidate = {
        ...req.body,
        ...req.query,
        ...req.params,
        ...(authReq.userId && { userId: authReq.userId }),
      };
      
      schema.parse(dataToValidate);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        throw new AppError(400, `Validation error: ${errors.map((e) => e.message).join(', ')}`);
      }
      next(error);
    }
  };
}

