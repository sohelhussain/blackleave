import { Request, Response, NextFunction } from 'express';
import { extractSessionToken, validateSession } from '../utils/session.js';
import { mapPrismaProfileToUserProfile } from '../services/profile.service.js';
import { UserProfile } from '@applyflow/types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  profile?: UserProfile;
}

/**
 * Strict authentication middleware.
 * Verifies persistent session from HTTP-only cookie or Authorization header.
 * Derives user strictly from database-backed session.
 * Rejects unauthenticated or expired requests with 401.
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. No active session found.'
      }
    });
    return;
  }

  try {
    const session = await validateSession(token);

    if (!session || !session.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session is invalid or has expired. Please sign in again.'
        }
      });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined
    };

    if (session.user.profile) {
      req.profile = mapPrismaProfileToUserProfile(session.user.profile);
    }

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate authentication session'
      }
    });
  }
}
