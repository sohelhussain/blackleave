/**
 * packages/matching
 * Reserved for future job/profile matching and scoring algorithms.
 */

export interface MatchScore {
  overall: number; // 0.0 to 1.0
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  breakdown: string[];
}

export interface MatchResult {
  jobId: string;
  candidateId: string;
  score: MatchScore;
  recommendedResumeId?: string;
}
