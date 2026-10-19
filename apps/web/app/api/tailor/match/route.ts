import { NextRequest, NextResponse } from 'next/server.js';
import { validateSessionToken, getUserProfile } from '@applyflow/database';
import { AnalyzeJobMatchRequestSchema } from '@applyflow/validators';
import type { UserProfile } from '@applyflow/types';
import {
  extractRequirementsFromText,
  computeJobMatchAnalysis
} from '@applyflow/ai';

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

  try {
    const session = await validateSessionToken(token);
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AnalyzeJobMatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request payload', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const isClientSupplied = Boolean(parsed.data.profileContext);
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
          error: { message: 'Authentication or candidate profileContext is required to calculate match score' }
        },
        { status: 401 }
      );
    }

    const requirements = extractRequirementsFromText(
      parsed.data.jobText,
      parsed.data.jobTitle,
      parsed.data.companyName
    );

    const matchAnalysis = computeJobMatchAnalysis(requirements, profile, {
      isVerified: !isClientSupplied
    });

    return NextResponse.json({
      success: true,
      analysis: matchAnalysis
    });
  } catch (err: any) {
    console.error('[Next.js /api/tailor/match] Error:', err);
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to compute job match analysis' } },
      { status: 500 }
    );
  }
}
