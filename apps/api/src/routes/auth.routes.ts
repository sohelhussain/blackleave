import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateProfileCompleteness } from '@applyflow/types';
import { verifyGoogleCredential } from '../utils/google-auth.js';
import {
  createSession,
  destroySession,
  extractSessionToken,
  validateSession,
  findOrCreateGoogleUser
} from '../utils/session.js';
import { getUserProfile, upsertUserProfile } from '../services/profile.service.js';

export const authRouter = Router();

const GoogleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required')
});

/**
 * POST /api/auth/google
 * Verifies Google OpenID token cryptographically.
 * Finds or creates user and initial candidate profile in PostgreSQL.
 * Sets secure HTTP-only session cookie.
 */
authRouter.post('/google', async (req: Request, res: Response) => {
  const parsed = GoogleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid Google authentication credential is required'
      }
    });
  }

  try {
    // 1. Properly verify Google credential (signature, issuer, aud, exp, email, sub)
    const verifiedGoogleUser = await verifyGoogleCredential(parsed.data.credential);

    // 2. Find or create user in PostgreSQL
    const { user, isNewUser } = await findOrCreateGoogleUser(verifiedGoogleUser);

    // 3. Create persistent server session & set HTTP-only cookie
    const { token, expiresAt } = await createSession(user.id, res);

    // 4. Retrieve or initialize user profile
    let profile = await getUserProfile(user.id);
    if (!profile) {
      profile = await upsertUserProfile(user.id, {
        personal: {
          fullName: user.name || '',
          firstName: user.name ? user.name.split(' ')[0] : '',
          lastName: user.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : '',
          preferredName: user.name ? user.name.split(' ')[0] : '',
          email: user.email,
          phone: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          linkedin: '',
          github: '',
          portfolio: ''
        }
      });
    }

    const completion = calculateProfileCompleteness(profile);

    return res.json({
      success: true,
      authenticated: true,
      isNewUser,
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name || profile.personal.fullName,
        image: user.image || null
      },
      profile,
      completion
    });
  } catch (err: any) {
    console.error('[Auth Error] Google login failed:', err.message);
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: err.message || 'Google sign-in failed. Please try again.'
      }
    });
  }
});

/**
 * GET /api/auth/session
 * Restores session from HTTP-only cookie or Authorization header.
 * Returns { authenticated: true, user, profile, completion } or { authenticated: false }.
 */
authRouter.get('/session', async (req: Request, res: Response) => {
  const token = extractSessionToken(req);

  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const session = await validateSession(token);

    if (!session || !session.user) {
      return res.json({ authenticated: false });
    }

    const profile = await getUserProfile(session.user.id);
    const completion = profile ? calculateProfileCompleteness(profile) : null;

    return res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || profile?.personal?.fullName || '',
        image: session.user.image || null
      },
      profile,
      completion
    });
  } catch (err: any) {
    console.error('[Auth Error] Session validation failed:', err.message);
    return res.json({ authenticated: false });
  }
});

/**
 * POST /api/auth/logout
 * Destroys server-side session from database and clears HTTP-only cookie.
 * Does NOT delete candidate profile or user data.
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = extractSessionToken(req);

  if (token) {
    await destroySession(token, res);
  } else {
    // Ensure cookie is cleared even if token header was missing
    res.clearCookie('session_token', { path: '/' });
  }

  return res.json({
    success: true,
    authenticated: false,
    message: 'Logged out successfully'
  });
});
