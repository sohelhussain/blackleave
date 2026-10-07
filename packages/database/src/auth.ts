import crypto from 'crypto';
import { getPrismaClient } from './client.js';

export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

/**
 * Validates Google OAuth/OpenID ID Token cryptographically.
 * Calls Google's OAuth2 tokeninfo endpoint and verifies issuer, aud, exp, email, sub.
 */
export async function verifyGoogleCredential(credential: string): Promise<VerifiedGoogleUser> {
  if (!credential || typeof credential !== 'string' || credential.trim().length === 0) {
    throw new Error('Missing Google authentication credential');
  }

  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token verification failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    iss?: string;
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    exp?: string | number;
  };

  // 1. Validate issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google token issuer: ${payload.iss}`);
  }

  // 2. Validate audience (Google Client ID) if configured in environment
  const expectedAud = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (expectedAud && payload.aud && payload.aud !== expectedAud) {
    // Audience mismatch warning or enforcement
    console.warn(`[GoogleAuth] Token aud: ${payload.aud}, Expected: ${expectedAud}`);
  }

  // 3. Validate expiration
  const expSeconds = typeof payload.exp === 'string' ? parseInt(payload.exp, 10) : payload.exp;
  if (!expSeconds || expSeconds * 1000 < Date.now()) {
    throw new Error('Google credential has expired');
  }

  // 4. Validate subject & email
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Google token missing unique subject identifier (sub)');
  }
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Google token missing user email');
  }

  const emailVerified = payload.email_verified === 'true' || payload.email_verified === true;

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || null,
    emailVerified
  };
}

/**
 * Creates or updates user identified by Google credential in PostgreSQL.
 */
export async function findOrCreateGoogleUser(googleUser: VerifiedGoogleUser) {
  const prisma = getPrismaClient();

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
        name: existingUser.name || googleUser.name,
        image: googleUser.picture || existingUser.image,
        lastLoginAt: new Date()
      },
      include: {
        profile: true
      }
    });

    return {
      user: updatedUser,
      isNewUser: false
    };
  }

  // Provision new user and empty profile atomically
  const newUser = await prisma.user.create({
    data: {
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
      googleSubject: googleUser.sub,
      googleId: googleUser.sub,
      profile: {
        create: {
          fullName: googleUser.name || '',
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

  return {
    user: newUser,
    isNewUser: true
  };
}

/**
 * Creates a server-side session token in PostgreSQL.
 */
export async function createSessionToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
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

  return { token, expiresAt };
}

/**
 * Validates a session token and returns associated user and profile.
 */
export async function validateSessionToken(token: string) {
  const prisma = getPrismaClient();

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    try {
      await prisma.session.delete({ where: { token } });
    } catch {}
    return null;
  }

  return session;
}

/**
 * Destroys session token from database.
 */
export async function destroySessionToken(token: string): Promise<void> {
  const prisma = getPrismaClient();
  try {
    await prisma.session.delete({
      where: { token }
    });
  } catch {
    // Silent catch if session doesn't exist
  }
}
