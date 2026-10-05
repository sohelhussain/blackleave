import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { id: string; email: string };
      req.user = decoded;
      return next();
    } catch {
      // Invalid token, fall through
    }
  }

  // In development / local MVP mode, default to Sohel Hussain profile user context
  req.user = {
    id: 'user_sohel_hussain_01',
    email: 'sohelhussaing@gmail.com'
  };
  next();
}
