import { z } from 'zod';
import { UserProfileSchema } from './index.js';

export const MatchQualificationStatusSchema = z.enum(['SUPPORTED', 'PARTIAL', 'MISSING', 'UNVERIFIED']);

export const MatchScoreCategorySchema = z.object({
  id: z.enum(['requiredSkills', 'preferredSkills', 'experience', 'projects', 'education', 'seniority']),
  label: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
  matchedCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  explanation: z.string()
});

export const QualificationMatchSchema = z.object({
  name: z.string(),
  type: z.enum(['skill', 'experience', 'project', 'education', 'seniority']),
  status: MatchQualificationStatusSchema,
  required: z.boolean(),
  evidence: z.string().optional(),
  sourceIds: z.array(z.string()).optional()
});

export const JobMatchAnalysisSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  scoringFormula: z.string(),
  scoreBreakdown: z.array(MatchScoreCategorySchema),
  qualifications: z.array(QualificationMatchSchema),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendedFocus: z.array(z.string())
});

export const TailoredBulletPointSchema = z.object({
  original: z.string(),
  tailored: z.string(),
  highlightedSkills: z.array(z.string()),
  rationale: z.string()
});

export const TailoredExperienceItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  bullets: z.array(TailoredBulletPointSchema),
  technologies: z.array(z.string())
});

export const TailoredProjectItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  bullets: z.array(TailoredBulletPointSchema),
  technologies: z.array(z.string()),
  url: z.string().nullable().optional()
});

export const TailoredEducationItemSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  location: z.string(),
  graduationDate: z.string().nullable().optional(),
  score: z.string().nullable().optional()
});

export const TailoredResumeDraftSchema = z.object({
  headline: z.string(),
  professionalSummary: z.string(),
  targetJobTitle: z.string(),
  targetCompany: z.string(),
  matchScore: z.number().min(0).max(100),
  highlightedSkills: z.array(z.string()),
  experience: z.array(TailoredExperienceItemSchema),
  projects: z.array(TailoredProjectItemSchema),
  education: z.array(TailoredEducationItemSchema),
  changesSummary: z.array(z.string()),
  unverifiedWarning: z.string().optional()
});

export const AnalyzeJobMatchRequestSchema = z.object({
  jobText: z.string().min(10, 'Job description must be at least 10 characters').max(30000),
  jobTitle: z.string().max(300).optional(),
  companyName: z.string().max(200).optional(),
  profileContext: z.lazy(() => UserProfileSchema.partial()).optional()
});

export const TailorResumeRequestSchema = z.object({
  jobText: z.string().min(10, 'Job description must be at least 10 characters').max(30000),
  jobTitle: z.string().max(300).optional(),
  companyName: z.string().max(200).optional(),
  baseResumeId: z.string().optional(),
  profileContext: z.lazy(() => UserProfileSchema.partial()).optional()
});

export const SaveTailoredResumeRequestSchema = z.object({
  name: z.string().min(1).max(200),
  targetRoles: z.array(z.string()).min(1),
  relevantSkills: z.array(z.string()),
  tailoredDraft: TailoredResumeDraftSchema,
  isDefault: z.boolean().optional().default(false)
});
