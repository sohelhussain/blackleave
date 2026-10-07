import crypto from 'crypto';
import { Request, Response } from 'express';
import { getPrismaClient } from '@applyflow/database';
import { CONFIG } from '../config.js';
import { VerifiedGoogleUser } from './google-auth.js';
import { UserProfile, INITIAL_SOHEL_PROFILE } from '@applyflow/types';

export const SESSION_COOKIE_NAME = 'session_token';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join('=').trim();
    try {
      list[name] = decodeURIComponent(value);
    } catch {
      list[name] = value;
    }
  });
  return list;
}

export function extractSessionToken(req: Request): string | null {
  // 1. Check HTTP-only cookie first
  const cookies = parseCookies(req);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function createSession(userId: string, res: Response): Promise<{ token: string; expiresAt: Date }> {
  const prisma = getPrismaClient();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });

  // Set HTTP-only cookie
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: CONFIG.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/'
  });

  return { token, expiresAt };
}

export async function destroySession(token: string, res: Response): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.session.delete({
      where: { token }
    });
  } catch {
    // If already deleted or not found, silently continue
  }

  // Clear HTTP-only cookie
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: CONFIG.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

export async function validateSession(token: string) {
  const prisma = getPrismaClient();

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          profile: {
            include: {
              jobPreference: true,
              workAuthorization: true,
              studentEnrollment: true,
              countryAuthorizations: true,
              applicationQuestions: true,
              coverLetters: true,
              education: true,
              experience: true,
              projects: true,
              skills: true,
              resumes: true
            }
          }
        }
      }
    }
  });

  if (!session) return null;

  // Check expiration
  if (session.expiresAt.getTime() < Date.now()) {
    try {
      await prisma.session.delete({ where: { token } });
    } catch {}
    return null;
  }

  return session;
}

export async function findOrCreateGoogleUser(googleUser: VerifiedGoogleUser) {
  const prisma = getPrismaClient();

  // Search existing user by googleSubject, googleId, or verified email
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { googleSubject: googleUser.sub },
        { googleId: googleUser.sub },
        { email: googleUser.email }
      ]
    },
    include: {
      profile: true
    }
  });

  if (existingUser) {
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        googleSubject: googleUser.sub,
        googleId: googleUser.sub,
        name: existingUser.name || googleUser.name,
        image: existingUser.image || googleUser.picture,
        avatarUrl: existingUser.avatarUrl || googleUser.picture,
        lastLoginAt: new Date()
      },
      include: {
        profile: true
      }
    });

    return { user: updatedUser, isNewUser: false };
  }

  // Create new user with database unique constraints to prevent race conditions
  const newUser = await prisma.user.create({
    data: {
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
      avatarUrl: googleUser.picture,
      googleSubject: googleUser.sub,
      googleId: googleUser.sub,
      lastLoginAt: new Date(),
      profile: {
        create: {
          fullName: googleUser.name,
          firstName: googleUser.name ? googleUser.name.split(' ')[0] : '',
          lastName: googleUser.name && googleUser.name.split(' ').length > 1 ? googleUser.name.split(' ').slice(1).join(' ') : '',
          preferredName: googleUser.name ? googleUser.name.split(' ')[0] : '',
          email: googleUser.email,
          phone: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          profileCompleted: false
        }
      }
    },
    include: {
      profile: true
    }
  });

  return { user: newUser, isNewUser: true };
}
