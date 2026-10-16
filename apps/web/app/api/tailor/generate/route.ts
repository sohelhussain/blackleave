import { NextRequest, NextResponse } from 'next/server.js';
import { validateSessionToken, getUserProfile } from '@applyflow/database';
import { TailorResumeRequestSchema } from '@applyflow/validators';
import type { UserProfile } from '@applyflow/types';
import { ResumeTailorService } from '@applyflow/ai';

export const dynamic = 'force-dynamic';

const resumeTailorService = new ResumeTailorService(process.env.GEMINI_API_KEY);

// Sliding-window rate limiter per IP for AI resume generation
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, windowMs = 60_000, maxRequests = 20): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  let token = req.cookies.get('session_token')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) return null;

  try {
    const session = await validateSessionToken(token);
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const clientIp = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const { allowed, retryAfter } = checkRateLimit(clientIp);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { message: 'Too many AI requests. Please slow down.', retryAfter } },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = TailorResumeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request payload', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    let profile = parsed.data.profileContext as UserProfile | undefined;
    if (!profile) {
      const userId = await getAuthenticatedUserId(req);
      if (userId) {
        profile = (await getUserProfile(userId)) as UserProfile | undefined;
      }
    }

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Authentication or candidate profileContext is required to generate tailored resume' }
        },
        { status: 401 }
      );
    }

    const tailoredDraft = await resumeTailorService.tailorResume(parsed.data as any, profile);

    return NextResponse.json({
      success: true,
      draft: tailoredDraft
    });
  } catch (err: any) {
    console.error('[Next.js /api/tailor/generate] Error:', err);
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to generate tailored resume draft' } },
      { status: 500 }
    );
  }
}
