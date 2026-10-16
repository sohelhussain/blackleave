import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import {
  AnalyzeJobMatchRequestSchema,
  TailorResumeRequestSchema,
  SaveTailoredResumeRequestSchema
} from '@applyflow/validators';
import { ResumeRecord, UserProfile } from '@applyflow/types';
import {
  ResumeTailorService,
  extractRequirementsFromText,
  computeJobMatchAnalysis
} from '@applyflow/ai';
import { CONFIG } from '../config.js';
import { aiRateLimiter } from './ai.routes.js';

export const tailorRouter = Router();
const resumeTailorService = new ResumeTailorService(CONFIG.GEMINI_API_KEY);

/**
 * POST /api/tailor/match
 * Computes transparent, weighted compatibility match score between a JD and candidate profile.
 */
tailorRouter.post('/match', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = AnalyzeJobMatchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const profile = parsed.data.profileContext || req.profile || (req.user ? await getProfileForUser(req.user.id) : null);
  if (!profile) {
    return res.status(401).json({
      error: 'Authentication or candidate profileContext is required to calculate match score'
    });
  }

  try {
    const requirements = extractRequirementsFromText(
      parsed.data.jobText,
      parsed.data.jobTitle,
      parsed.data.companyName
    );
    const matchAnalysis = computeJobMatchAnalysis(requirements, profile as UserProfile);

    return res.json({
      success: true,
      analysis: matchAnalysis
    });
  } catch (err: any) {
    console.error('[TailorRoutes] Error computing match:', err);
    return res.status(500).json({ error: 'Failed to compute job match analysis' });
  }
});

/**
 * POST /api/tailor/generate
 * Generates an editable tailored resume draft using verified candidate facts only.
 */
tailorRouter.post('/generate', optionalAuthMiddleware, aiRateLimiter(60_000, 20), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = TailorResumeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const profile = parsed.data.profileContext || req.profile || (req.user ? await getProfileForUser(req.user.id) : null);
  if (!profile) {
    return res.status(401).json({
      error: 'Authentication or candidate profileContext is required to generate tailored resume'
    });
  }

  try {
    const tailoredDraft = await resumeTailorService.tailorResume(parsed.data as any, profile as UserProfile);
    return res.json({
      success: true,
      draft: tailoredDraft
    });
  } catch (err: any) {
    console.error('[TailorRoutes] Error tailoring resume:', err);
    return res.status(500).json({ error: 'Failed to generate tailored resume draft' });
  }
});

/**
 * POST /api/tailor/save
 * Persists the tailored resume as an independent version in the authenticated candidate's profile.
 * Strictly checks user authentication to prevent cross-user access.
 */
tailorRouter.post('/save', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = SaveTailoredResumeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    const profile = req.profile || await getProfileForUser(userId);
    const existingResumes = [...profile.resumes];

    // If marked default, unset other defaults
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

    return res.status(201).json({
      success: true,
      message: 'Tailored resume version saved successfully',
      resume: newResume
    });
  } catch (err: any) {
    console.error('[TailorRoutes] Error saving tailored resume:', err);
    return res.status(500).json({ error: 'Failed to save tailored resume version' });
  }
});
