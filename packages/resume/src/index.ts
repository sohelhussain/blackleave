/**
 * packages/resume
 * Reserved for future resume optimization and section tailoring.
 */

export interface TailoredSection {
  sectionName: string;
  originalContent: string;
  tailoredContent: string;
  relevanceScore: number;
}

export interface ResumeOptimizationResult {
  resumeId: string;
  targetRole: string;
  tailoredSections: TailoredSection[];
  keywordsAdded: string[];
}
