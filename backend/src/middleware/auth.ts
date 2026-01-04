import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Simple JWT-based auth middleware (can be enhanced with proper JWT verification)
export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    persona: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // For development/testing: Allow X-User-Id header (priority for testing)
    const userIdFromHeader = req.headers['x-user-id'] as string;
    
    if (userIdFromHeader) {
      req.userId = userIdFromHeader;
      next();
      return;
    }

    // For production: Check Bearer token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token. For testing, use X-User-Id header.' });
    }

    const token = authHeader.substring(7);
    
    // TODO: Implement proper JWT verification
    // For now, we'll extract userId from token (assuming it's a simple format)
    // In production, use a proper JWT library like jsonwebtoken
    
    // Placeholder: In a real implementation, verify JWT and extract userId
    // For MVP, we'll use a simple approach where token contains userId
    // This should be replaced with proper JWT verification
    
    // For OAuth flow, the token would come from the OAuth provider
    // For now, extract userId from token (simple format for development)
    const userId = token; // In production, decode JWT and extract userId
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }

    req.userId = userId;
    
    // Optionally fetch user from database
    // const user = await prisma.user.findUnique({ where: { id: userId } });
    // if (!user) {
    //   return res.status(401).json({ error: 'Unauthorized: User not found' });
    // }
    // req.user = user;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Optional: Make auth optional for certain routes
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userId = req.headers['x-user-id'] as string;
  
  if (userId) {
    req.userId = userId;
  }
  
  next();
}

