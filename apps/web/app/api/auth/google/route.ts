import { NextRequest, NextResponse } from 'next/server';
import {
  verifyGoogleCredential,
  findOrCreateGoogleUser,
  createSessionToken,
  getUserProfile,
  upsertUserProfile,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS
} from '@applyflow/database';
import { calculateProfileCompleteness } from '@applyflow/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const credential = body?.credential;

    if (!credential || typeof credential !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid Google authentication credential is required'
          }
        },
        { status: 400 }
      );
    }

    // 1. Cryptographically verify Google token
    const verifiedGoogleUser = await verifyGoogleCredential(credential);

    // 2. Find or create user in PostgreSQL
    const { user, isNewUser } = await findOrCreateGoogleUser(verifiedGoogleUser);

    // 3. Create persistent session in PostgreSQL
    const { token, expiresAt } = await createSessionToken(user.id);

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

    const response = NextResponse.json({
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

    // 5. Set HTTP-only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      expires: expiresAt
    });

    return response;
  } catch (err: any) {
    console.error('[Web API /api/auth/google] Login error:', err.message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: err.message || 'Google sign-in failed. Please try again.'
        }
      },
      { status: 401 }
    );
  }
}
