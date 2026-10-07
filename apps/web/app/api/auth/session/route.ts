import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, getUserProfile } from '@applyflow/database';
import { calculateProfileCompleteness } from '@applyflow/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Extract session token from cookies or Authorization header
    let token = req.cookies.get('session_token')?.value;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    // 2. Validate session against PostgreSQL
    const session = await validateSessionToken(token);
    if (!session || !session.user) {
      return NextResponse.json({ authenticated: false });
    }

    // 3. Fetch user profile
    const profile = await getUserProfile(session.user.id);
    const completion = profile ? calculateProfileCompleteness(profile) : null;

    return NextResponse.json({
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
    console.error('[Web API /api/auth/session] Error:', err.message);
    return NextResponse.json({ authenticated: false });
  }
}
