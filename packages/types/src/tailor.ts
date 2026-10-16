import { UserProfile } from './index.js';

export type MatchQualificationStatus = 'SUPPORTED' | 'PARTIAL' | 'MISSING' | 'UNVERIFIED';

export interface MatchScoreCategory {
  id: 'requiredSkills' | 'preferredSkills' | 'experience' | 'projects' | 'education' | 'seniority';
  label: string;
  weight: number; // e.g. 0.35
  score: number; // 0 to 100
  matchedCount: number;
  totalCount: number;
  explanation: string;
}

export interface QualificationMatch {
  name: string;
  type: 'skill' | 'experience' | 'project' | 'education' | 'seniority';
  status: MatchQualificationStatus;
  required: boolean;
  evidence?: string;
  sourceIds?: string[];
}

export interface JobMatchAnalysis {
  jobTitle: string;
  company: string;
  overallScore: number; // 0 to 100
  summary: string;
  scoringFormula: string;
  scoreBreakdown: MatchScoreCategory[];
  qualifications: QualificationMatch[];
  matchingSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendedFocus: string[];
}

export interface TailoredBulletPoint {
  original: string;
  tailored: string;
  highlightedSkills: string[];
  rationale: string;
}

export interface TailoredExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate?: string | null;
  bullets: TailoredBulletPoint[];
  technologies: string[];
}

export interface TailoredProjectItem {
  id: string;
  title: string;
  description: string;
  bullets: TailoredBulletPoint[];
  technologies: string[];
  url?: string | null;
}

export interface TailoredEducationItem {
  degree: string;
  institution: string;
  location: string;
  graduationDate?: string | null;
  score?: string | null;
}

export interface TailoredResumeDraft {
  headline: string;
  professionalSummary: string;
  targetJobTitle: string;
  targetCompany: string;
  matchScore: number;
  highlightedSkills: string[];
  experience: TailoredExperienceItem[];
  projects: TailoredProjectItem[];
  education: TailoredEducationItem[];
  changesSummary: string[];
  unverifiedWarning?: string;
}

export interface TailorResumeRequest {
  jobText: string;
  jobTitle?: string;
  companyName?: string;
  baseResumeId?: string;
  profileContext?: UserProfile;
}

export interface SaveTailoredResumeRequest {
  name: string;
  targetRoles: string[];
  relevantSkills: string[];
  tailoredDraft: TailoredResumeDraft;
  isDefault?: boolean;
}
