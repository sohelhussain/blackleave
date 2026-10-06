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
  address?: string;
  postalCode?: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary?: string;
  // Optional sensitive fields - never inferred, not required for 100% completion
  age?: number | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  genderCustom?: string | null;
}

export interface StudentEnrollment {
  isCurrentlyEnrolled: boolean;
  institution: string;
  degreeProgram: string;
  fieldOfStudy: string;
  currentYearSemester: string;
  expectedGraduationDate: string;
  openToStudyCombinedJobs: boolean;
}

export interface JobPreferences {
  targetRoles: string[];
  targetJobTitles?: string[];
  targetIndustries?: string[];
  targetCareerAreas?: string[];
  employmentStatus?: string;
  studentEnrollment?: StudentEnrollment | null;
  employmentTypes: string[];
  workModes?: string[];
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

export interface CountryWorkAuthorization {
  countryCode: string;
  countryName: string;
  status: 'AUTHORIZED' | 'REQUIRES_SPONSORSHIP' | 'NOT_AUTHORIZED' | 'UNSURE';
  visaType?: string | null;
}

export interface WorkAuthorization {
  // Legacy fields for backward compatibility
  indiaAuthorized: boolean;
  indiaSponsorshipRequired: boolean;
  usAuthorized: boolean;
  usSponsorshipRequired: boolean;
  europeAuthorized: boolean;
  europeSponsorshipRequired: boolean;
  otherDetails?: string | null;
  // Global country work authorizations
  countries?: CountryWorkAuthorization[];
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

export interface ProfileApplicationQuestion {
  id: string;
  category: string;
  question: string;
  answer: string;
  notes?: string;
  lastUpdated?: string;
}

export interface CoverLetterRecord {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
  targetRole?: string | null;
  targetCompany?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  applicationQuestions?: ProfileApplicationQuestion[];
  coverLetters?: CoverLetterRecord[];
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

export interface ProfileCompleteness {
  score: number;
  missingItems: Array<{
    category: string;
    label: string;
    tab: string;
  }>;
}

export function calculateProfileCompleteness(profile?: Partial<UserProfile> | null): ProfileCompleteness {
  if (!profile) {
    return {
      score: 0,
      missingItems: [{ category: 'Personal', label: 'Add basic personal information', tab: 'personal' }]
    };
  }

  const items: Array<{ category: string; label: string; tab: string; completed: boolean; weight: number }> = [
    {
      category: 'Personal',
      label: 'Add full name and contact information',
      tab: 'personal',
      completed: Boolean(profile.personal?.fullName && profile.personal?.email && profile.personal?.phone),
      weight: 15
    },
    {
      category: 'Location',
      label: 'Add current city and country',
      tab: 'personal',
      completed: Boolean(profile.personal?.city && profile.personal?.country),
      weight: 10
    },
    {
      category: 'Preferences',
      label: 'Select target industries and job titles',
      tab: 'preferences',
      completed: Boolean(
        (profile.jobPreferences?.targetIndustries && profile.jobPreferences.targetIndustries.length > 0) ||
        (profile.jobPreferences?.targetRoles && profile.jobPreferences.targetRoles.length > 0) ||
        (profile.jobPreferences?.targetJobTitles && profile.jobPreferences.targetJobTitles.length > 0)
      ),
      weight: 15
    },
    {
      category: 'Preferences',
      label: 'Choose preferred employment types and work mode',
      tab: 'preferences',
      completed: Boolean(profile.jobPreferences?.employmentTypes && profile.jobPreferences.employmentTypes.length > 0),
      weight: 10
    },
    {
      category: 'Work Authorization',
      label: 'Configure work authorization for target countries',
      tab: 'workAuth',
      completed: Boolean(
        (profile.workAuthorization?.countries && profile.workAuthorization.countries.length > 0) ||
        profile.workAuthorization?.indiaAuthorized ||
        profile.workAuthorization?.usAuthorized ||
        profile.workAuthorization?.europeAuthorized
      ),
      weight: 15
    },
    {
      category: 'Education',
      label: 'Add at least one degree or education entry',
      tab: 'education',
      completed: Boolean(profile.education && profile.education.length > 0),
      weight: 15
    },
    {
      category: 'Experience & Projects',
      label: 'Add work experience or projects',
      tab: 'experience',
      completed: Boolean(
        (profile.experience && profile.experience.length > 0) || (profile.projects && profile.projects.length > 0)
      ),
      weight: 10
    },
    {
      category: 'Application Questions',
      label: 'Answer common application questions (motivation, availability)',
      tab: 'questions',
      completed: Boolean(profile.applicationQuestions && profile.applicationQuestions.length >= 2),
      weight: 10
    }
  ];

  let score = 0;
  const missingItems: Array<{ category: string; label: string; tab: string }> = [];

  for (const item of items) {
    if (item.completed) {
      score += item.weight;
    } else {
      missingItems.push({ category: item.category, label: item.label, tab: item.tab });
    }
  }

  return {
    score: Math.min(100, Math.round(score)),
    missingItems
  };
}

export * from './countries.js';
export * from './industries.js';
export * from './application-questions.js';
export * from './initial-profile.js';

