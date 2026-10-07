import { NextRequest, NextResponse } from 'next/server';
import { destroySessionToken, SESSION_COOKIE_NAME } from '@applyflow/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (token) {
      await destroySessionToken(token);
    }

    const response = NextResponse.json({
      success: true,
      authenticated: false,
      message: 'Logged out successfully'
    });

    // Clear HTTP-only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0)
    });

    return response;
  } catch (err: any) {
    console.error('[Web API /api/auth/logout] Logout error:', err.message);
    return NextResponse.json({
      success: true,
      authenticated: false,
      message: 'Logged out'
    });
  }
}
