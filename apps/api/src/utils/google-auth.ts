import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

/**
 * Validates Google OAuth/OpenID ID Token.
 * Verifies signature, issuer, audience, expiration, email, and Google subject ID.
 * Strictly rejects forged, unverified, or arbitrary client data.
 */
export async function verifyGoogleCredential(credential: string): Promise<VerifiedGoogleUser> {
  if (!credential || typeof credential !== 'string' || credential.trim().length === 0) {
    throw new Error('Missing Google authentication credential');
  }

  // Hermetic test mock token verification strictly when NODE_ENV === 'test'
  if (CONFIG.NODE_ENV === 'test') {
    try {
      const testPayload = jwt.verify(credential, CONFIG.JWT_SECRET) as any;
      if (testPayload && testPayload.sub && testPayload.email) {
        return {
          sub: testPayload.sub,
          email: testPayload.email.toLowerCase().trim(),
          name: testPayload.name || testPayload.email.split('@')[0],
          picture: testPayload.picture || null,
          emailVerified: true
        };
      }
    } catch {
      // If not a test JWT, continue to standard Google verification
    }
  }

  // Standard Google OpenID token verification via Google's OAuth2 tokeninfo endpoint
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

  // 2. Validate audience (Google Client ID) if configured
  if (CONFIG.GOOGLE_CLIENT_ID && payload.aud !== CONFIG.GOOGLE_CLIENT_ID) {
    throw new Error(`Audience mismatch: expected ${CONFIG.GOOGLE_CLIENT_ID}, received ${payload.aud}`);
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
