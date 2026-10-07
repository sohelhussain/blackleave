import { NextRequest, NextResponse } from 'next/server';
import {
  validateSessionToken,
  getUserProfile,
  saveProfileForUser,
  getPrismaClient
} from '@applyflow/database';
import { calculateProfileCompleteness } from '@applyflow/types';

export const dynamic = 'force-dynamic';

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  let token = req.cookies.get('session_token')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) return null;

  const session = await validateSessionToken(token);
  return session?.user?.id || null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const profile = await getUserProfile(userId);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } },
      { status: 404 }
    );
  }

  const completion = calculateProfileCompleteness(profile);
  return NextResponse.json({
    success: true,
    data: { profile, completion }
  });
}

export async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const updated = await saveProfileForUser(userId, body);
    const completion = calculateProfileCompleteness(updated);

    return NextResponse.json({
      success: true,
      data: { profile: updated, completion }
    });
  } catch (err: any) {
    console.error('[Web API /api/profile PUT] Error:', err.message);
    return NextResponse.json(
      { success: false, error: { code: 'SAVE_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== true) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Please confirm deletion' } },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    await prisma.profile.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });

    const res = NextResponse.json({ success: true, message: 'All user data permanently deleted' });
    res.cookies.set('session_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: err.message } },
      { status: 500 }
    );
  }
}
