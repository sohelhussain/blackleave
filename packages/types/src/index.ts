export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type FieldCategory =
  | 'PERSONAL'
  | 'EDUCATION'
  | 'EXPERIENCE'
  | 'SKILLS'
  | 'PROJECT'
  | 'WORK_AUTHORIZATION'
  | 'SPONSORSHIP'
  | 'SALARY'
  | 'AVAILABILITY'
  | 'LOCATION'
  | 'BEHAVIORAL'
  | 'TECHNICAL'
  | 'COMPANY_MOTIVATION'
  | 'ROLE_MOTIVATION'
  | 'DEMOGRAPHIC'
  | 'RESUME'
  | 'UNKNOWN';

export type FieldSource = 'deterministic' | 'rule' | 'ai' | 'manual' | 'unmapped';

export interface PersonalInfo {
  fullName: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary?: string;
}

export interface JobPreferences {
  targetRoles: string[];
  employmentTypes: string[];
  preferredLocations: string[];
  willingToRelocate: boolean;
  willingToWorkRemotely: boolean;
  noticePeriod: string;
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  salaryCurrency?: string;
}

export interface EducationRecord {
  id: string;
  degree: string;
  branch: string;
  university: string;
  location: string;
  startDate: string; // e.g., "08/2024"
  endDate?: string | null;
  expectedGraduation?: string | null; // e.g., "2027"
  cgpa?: string | number | null;
  percentage?: string | number | null;
  stream?: string | null;
}

export interface SchoolRecord {
  tenthPercentage: string;
  twelfthPercentage: string;
  twelfthStream: string;
}

export interface WorkAuthorization {
  indiaAuthorized: boolean;
  indiaSponsorshipRequired: boolean;
  usAuthorized: boolean;
  usSponsorshipRequired: boolean;
  europeAuthorized: boolean;
  europeSponsorshipRequired: boolean;
  otherDetails?: string | null;
}

export interface ExperienceRecord {
  id: string;
  company: string;
  title: string;
  employmentType: string;
  location: string;
  workMode: 'Remote' | 'On-site' | 'Hybrid' | string;
  startDate: string; // e.g. "03/2025"
  endDate?: string | null; // e.g. "06/2025" or "Present"
  current?: boolean;
  responsibilities: string[];
  technologies: string[];
}

export interface ProjectRecord {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  features?: string[];
  securityHighlights?: string[];
  url?: string | null;
  githubUrl?: string | null;
}

export interface SkillsInventory {
  programming: string[];
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
  blockchain: string[];
  realtime: string[];
  auth: string[];
  other: string[];
}

export interface ResumeRecord {
  id: string;
  name: string;
  fileName: string;
  fileData?: string; // base64 or storage link
  fileType?: string; // e.g. "application/pdf"
  targetRoles: string[];
  relevantSkills: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  personal: PersonalInfo;
  jobPreferences: JobPreferences;
  education: EducationRecord[];
  school: SchoolRecord;
  workAuthorization: WorkAuthorization;
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  skills: SkillsInventory;
  resumes: ResumeRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DetectedField {
  id: string;
  selector: string;
  detectedLabel: string;
  fieldType:
    | 'text'
    | 'email'
    | 'tel'
    | 'url'
    | 'number'
    | 'date'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'textarea'
    | 'file'
    | 'button'
    | 'unknown';
  placeholder?: string | null;
  name?: string | null;
  htmlId?: string | null;
  ariaLabel?: string | null;
  surroundingText?: string | null;
  options?: Array<{ label: string; value: string }>;
  isRequired: boolean;
  suggestedProfileField: string | null;
  category: FieldCategory;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  source: FieldSource;
  suggestedValue: string | boolean | null;
  userValue?: string | boolean | null;
  approved?: boolean;
  requiresConfirmation: boolean;
  explanation?: string;
}

export interface AIAnswerRequest {
  fieldLabel: string;
  fieldType: string;
  category: FieldCategory;
  surroundingContext?: string;
  maxLength?: number;
  jobDescription?: string;
  companyName?: string;
  jobTitle?: string;
  profileContext: Partial<UserProfile>;
}

export interface AIAnswerResult {
  classification: FieldCategory;
  confidence: number;
  answer: string;
  sourceIds: string[];
  needsConfirmation: boolean;
  reason: string;
  status: 'SUCCESS' | 'INSUFFICIENT_INFORMATION' | 'ERROR';
}

export interface JobAnalysisRequest {
  pageUrl?: string;
  jobText: string;
  pageTitle?: string;
}

export interface JobAnalysisResult {
  role: string;
  company: string;
  location: string;
  employmentType: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
  sponsorship: string | null;
  relevantUserSkills: string[];
  relevantProjects: string[];
  recommendedResume: string;
  summary: string;
}

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  url: string;
  date: string;
  resumeUsed?: string | null;
  fieldsFilled: number;
  aiAnswersCount: number;
  status: 'Draft' | 'Reviewed' | 'Applied' | 'Rejected' | 'Interview' | 'Offer';
  notes?: string | null;
}

export interface ApplicationSession {
  sessionId: string;
  url: string;
  title: string;
  company?: string;
  role?: string;
  detectedFields: DetectedField[];
  recommendedResumeId?: string;
  status: 'scanning' | 'ready' | 'filling' | 'completed';
  createdAt: number;
}

export * from './initial-profile.js';
