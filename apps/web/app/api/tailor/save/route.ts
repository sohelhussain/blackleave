import { NextRequest, NextResponse } from 'next/server.js';
import { validateSessionToken, getUserProfile, saveProfileForUser } from '@applyflow/database';
import { SaveTailoredResumeRequestSchema } from '@applyflow/validators';
import type { ResumeRecord } from '@applyflow/types';

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
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required. No active session found.' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = SaveTailoredResumeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request payload', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: { message: 'Candidate profile not found' } },
        { status: 404 }
      );
    }

    const existingResumes = [...profile.resumes];
    if (parsed.data.isDefault) {
      existingResumes.forEach((r) => (r.isDefault = false));
    }

    const newResume: ResumeRecord = {
      id: `resume_tailored_${Date.now()}`,
      name: parsed.data.name,
      fileName: `${parsed.data.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`,
      fileType: 'application/json;type=tailored',
      fileData: JSON.stringify(parsed.data.tailoredDraft),
      targetRoles: parsed.data.targetRoles,
      relevantSkills: parsed.data.relevantSkills,
      isDefault: Boolean(parsed.data.isDefault),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    existingResumes.push(newResume);
    await saveProfileForUser(userId, { resumes: existingResumes });

    return NextResponse.json(
      {
        success: true,
        message: 'Tailored resume version saved successfully',
        resume: newResume
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Next.js /api/tailor/save] Error:', err);
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to save tailored resume version' } },
      { status: 500 }
    );
  }
}
