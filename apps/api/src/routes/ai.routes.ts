import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { GeminiService, JobAnalyzer } from '@applyflow/ai';
import { CONFIG } from '../config.js';
import { getProfileForUser } from '../services/profile.service.js';
import { z } from 'zod';
import { FieldCategorySchema } from '@applyflow/validators';

export const aiRouter = Router();
const geminiService = new GeminiService(CONFIG.GEMINI_API_KEY);
const jobAnalyzer = new JobAnalyzer(CONFIG.GEMINI_API_KEY);

const GenerateAnswerBodySchema = z.object({
  fieldLabel: z.string().min(1),
  fieldType: z.string().default('textarea'),
  category: FieldCategorySchema,
  surroundingContext: z.string().optional(),
  maxLength: z.number().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  jobDescription: z.string().optional()
});

aiRouter.post('/generate-answer', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = GenerateAnswerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);

  try {
    const result = await geminiService.generateAnswer({
      ...parsed.data,
      profileContext: profile
    });
    return res.json({ result });
  } catch (err) {
    console.error('[AIRoutes] Error generating answer:', err);
    return res.status(500).json({
      error: 'Failed to generate answer with Gemini AI',
      fallback: 'INSUFFICIENT_INFORMATION'
    });
  }
});

aiRouter.post('/classify-field', async (req: AuthenticatedRequest, res: Response) => {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ error: 'Label is required' });
  }

  const clean = String(label).toLowerCase();
  let category = 'UNKNOWN';
  let confidence = 0.5;
  const relevantSources: string[] = [];

  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);

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
    if (profile.projects.length > 0) {
      relevantSources.push(profile.projects[0].id);
    }
  } else if (/challenge|problem|bug|tell\s*me\s*about|pressure|stress/i.test(clean)) {
    category = 'BEHAVIORAL';
    confidence = 0.91;
    if (profile.experience.length > 0) {
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

aiRouter.post('/analyze-job', async (req: AuthenticatedRequest, res: Response) => {
  const { jobText, pageUrl, pageTitle } = req.body;
  if (!jobText) {
    return res.status(400).json({ error: 'jobText is required' });
  }

  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);

  try {
    const analysis = await jobAnalyzer.analyzeJob({ jobText, pageUrl, pageTitle }, profile);
    return res.json({ analysis });
  } catch (err) {
    console.error('[AIRoutes] Error analyzing job:', err);
    const fallback = jobAnalyzer.analyzeJobRuleBased({ jobText, pageUrl, pageTitle }, profile);
    return res.json({ analysis: fallback });
  }
});
