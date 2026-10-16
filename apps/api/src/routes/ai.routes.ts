import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { GeminiService, JobAnalyzer } from '@applyflow/ai';
import { CONFIG } from '../config.js';
import { getProfileForUser } from '../services/profile.service.js';
import { z } from 'zod';
import { FieldCategorySchema, UserProfileSchema } from '@applyflow/validators';

export const aiRouter = Router();
const geminiService = new GeminiService(CONFIG.GEMINI_API_KEY);
const jobAnalyzer = new JobAnalyzer(CONFIG.GEMINI_API_KEY);

// Sliding-window in-memory rate limiter per IP to prevent AI quota exhaustion
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function resetAiRateLimiter(): void {
  rateLimitMap.clear();
}

export function aiRateLimiter(windowMs: number = 60_000, maxRequests: number = 30) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many AI requests. Please slow down.',
        retryAfter: retryAfterSec
      });
      return;
    }

    entry.count++;
    next();
  };
}

// Attach rate limiter to all AI routes
aiRouter.use(aiRateLimiter(60_000, 30));

const GenerateAnswerBodySchema = z.object({
  fieldLabel: z.string().min(1).max(1000),
  fieldType: z.string().max(50).default('textarea'),
  category: FieldCategorySchema,
  surroundingContext: z.string().max(3000).optional(),
  maxLength: z.number().int().min(1).max(5000).optional(),
  companyName: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  jobDescription: z.string().max(10000).optional(),
  profileContext: UserProfileSchema.partial().optional()
});

aiRouter.post('/generate-answer', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = GenerateAnswerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const isClientSupplied = !req.user;
  const profile = parsed.data.profileContext || req.profile || (req.user ? await getProfileForUser(req.user.id) : null);
  if (!profile) {
    return res.status(401).json({
      error: 'Authentication or profileContext is required to generate answers'
    });
  }

  try {
    const result = await geminiService.generateAnswer({
      ...parsed.data,
      profileContext: profile as any
    });

    // Enforce trust boundary: client-supplied profiles require explicit human review
    if (isClientSupplied) {
      result.needsConfirmation = true;
      result.reason = `${result.reason || 'Synthesized from profile context.'} (Client-supplied profile context)`.trim();
    }

    return res.json({ result });
  } catch (err) {
    console.error('[AIRoutes] Error generating answer:', err);
    return res.status(500).json({
      error: 'Failed to generate answer with Gemini AI',
      fallback: 'INSUFFICIENT_INFORMATION'
    });
  }
});

const ClassifyFieldBodySchema = z.object({
  label: z.string().min(1).max(1000),
  profileContext: UserProfileSchema.partial().optional()
});

aiRouter.post('/classify-field', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ClassifyFieldBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const clean = parsed.data.label.toLowerCase();
  let category = 'UNKNOWN';
  let confidence = 0.5;
  const relevantSources: string[] = [];

  const profile = parsed.data.profileContext || req.profile || (req.user ? await getProfileForUser(req.user.id) : null);

  if (/why.*?(?:product\s*management|role|position|opportunity|engineering)/i.test(clean) || /interest\s*in\s*(?:product|role|position)/i.test(clean)) {
    category = 'ROLE_MOTIVATION';
    confidence = 0.92;
    relevantSources.push('skills_backend', 'exp_saurce');
  } else if (/why.*?(?:join|work|us|company|hire|motivates)/i.test(clean) || /career\s*goals/i.test(clean)) {
    category = 'COMPANY_MOTIVATION';
    confidence = 0.92;
    relevantSources.push('skills_backend');
  } else if (/project/i.test(clean) || /achievement/i.test(clean)) {
    category = 'PROJECT';
    confidence = 0.94;
    if (profile?.projects && profile.projects.length > 0) {
      relevantSources.push(profile.projects[0].id);
    }
  } else if (/challenge|problem|bug|tell\s*me\s*about|pressure|stress/i.test(clean)) {
    category = 'BEHAVIORAL';
    confidence = 0.91;
    if (profile?.experience && profile.experience.length > 0) {
      relevantSources.push(profile.experience[0].id);
    }
  } else if (/java|distributed|cloud|infrastructure|docker|devops|backend/i.test(clean)) {
    category = 'SKILLS';
    confidence = 0.93;
    relevantSources.push('skills_backend');
  } else if (/salary|compensation/i.test(clean)) {
    category = 'SALARY';
    confidence = 0.8;
  } else if (/veteran|disability|gender|race/i.test(clean)) {
    category = 'DEMOGRAPHIC';
    confidence = 0.95;
  }

  return res.json({
    category,
    classification: category,
    confidence,
    relevantSources,
    requiresConfirmation: true
  });
});

const AnalyzeJobBodySchema = z.object({
  jobText: z.string().min(1).max(30000),
  pageUrl: z.string().max(2000).optional(),
  pageTitle: z.string().max(500).optional(),
  profileContext: UserProfileSchema.partial().optional()
});

aiRouter.post('/analyze-job', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = AnalyzeJobBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const profile = parsed.data.profileContext || req.profile || (req.user ? await getProfileForUser(req.user.id) : null);
  if (!profile) {
    return res.status(401).json({
      error: 'Authentication or profileContext is required to analyze jobs against candidate profiles'
    });
  }

  try {
    const analysis = await jobAnalyzer.analyzeJob(
      { jobText: parsed.data.jobText, pageUrl: parsed.data.pageUrl, pageTitle: parsed.data.pageTitle },
      profile as any
    );
    return res.json({ analysis });
  } catch (err) {
    console.error('[AIRoutes] Error analyzing job:', err);
    const fallback = jobAnalyzer.analyzeJobRuleBased(
      { jobText: parsed.data.jobText, pageUrl: parsed.data.pageUrl, pageTitle: parsed.data.pageTitle },
      profile as any
    );
    return res.json({ analysis: fallback });
  }
});
