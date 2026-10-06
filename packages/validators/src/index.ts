import { z } from 'zod';

export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  preferredName: z.string().default(''),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Invalid phone number'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').or(z.literal('')),
  github: z.string().url('Invalid GitHub URL').or(z.literal('')),
  portfolio: z.string().url('Invalid Portfolio URL').or(z.literal('')),
  summary: z.string().optional(),
  // Sensitive optional fields
  age: z.number().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  genderCustom: z.string().nullable().optional()
});

export const StudentEnrollmentSchema = z.object({
  isCurrentlyEnrolled: z.boolean().default(true),
  institution: z.string().default(''),
  degreeProgram: z.string().default(''),
  fieldOfStudy: z.string().default(''),
  currentYearSemester: z.string().default(''),
  expectedGraduationDate: z.string().default(''),
  openToStudyCombinedJobs: z.boolean().default(true)
});

export const JobPreferencesSchema = z.object({
  targetRoles: z.array(z.string()),
  targetJobTitles: z.array(z.string()).optional(),
  targetIndustries: z.array(z.string()).optional(),
  targetCareerAreas: z.array(z.string()).optional(),
  employmentStatus: z.string().optional(),
  studentEnrollment: StudentEnrollmentSchema.nullable().optional(),
  employmentTypes: z.array(z.string()),
  workModes: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()),
  willingToRelocate: z.boolean(),
  willingToWorkRemotely: z.boolean(),
  noticePeriod: z.string(),
  expectedSalaryMin: z.number().nullable().optional(),
  expectedSalaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().optional().default('INR')
});

export const EducationRecordSchema = z.object({
  id: z.string(),
  degree: z.string().min(1),
  branch: z.string().min(1),
  university: z.string().min(1),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  expectedGraduation: z.string().nullable().optional(),
  cgpa: z.union([z.string(), z.number()]).nullable().optional(),
  percentage: z.union([z.string(), z.number()]).nullable().optional(),
  stream: z.string().nullable().optional()
});

export const SchoolRecordSchema = z.object({
  tenthPercentage: z.string(),
  twelfthPercentage: z.string(),
  twelfthStream: z.string()
});

export const CountryWorkAuthorizationSchema = z.object({
  countryCode: z.string(),
  countryName: z.string(),
  status: z.enum(['AUTHORIZED', 'REQUIRES_SPONSORSHIP', 'NOT_AUTHORIZED', 'UNSURE']),
  visaType: z.string().nullable().optional()
});

export const WorkAuthorizationSchema = z.object({
  indiaAuthorized: z.boolean(),
  indiaSponsorshipRequired: z.boolean(),
  usAuthorized: z.boolean(),
  usSponsorshipRequired: z.boolean(),
  europeAuthorized: z.boolean(),
  europeSponsorshipRequired: z.boolean(),
  otherDetails: z.string().nullable().optional(),
  countries: z.array(CountryWorkAuthorizationSchema).optional()
});

export const ExperienceRecordSchema = z.object({
  id: z.string(),
  company: z.string().min(1),
  title: z.string().min(1),
  employmentType: z.string(),
  location: z.string(),
  workMode: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  current: z.boolean().optional(),
  responsibilities: z.array(z.string()),
  technologies: z.array(z.string())
});

export const ProjectRecordSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  technologies: z.array(z.string()),
  features: z.array(z.string()).optional(),
  securityHighlights: z.array(z.string()).optional(),
  url: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional()
});

export const SkillsInventorySchema = z.object({
  programming: z.array(z.string()),
  frontend: z.array(z.string()),
  backend: z.array(z.string()),
  database: z.array(z.string()),
  infrastructure: z.array(z.string()),
  blockchain: z.array(z.string()),
  realtime: z.array(z.string()),
  auth: z.array(z.string()),
  other: z.array(z.string())
});

export const ResumeRecordSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  fileName: z.string(),
  fileData: z.string().optional(),
  fileType: z.string().optional(),
  targetRoles: z.array(z.string()),
  relevantSkills: z.array(z.string()),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ProfileApplicationQuestionSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string().min(1),
  answer: z.string(),
  notes: z.string().optional(),
  lastUpdated: z.string().optional()
});

export const CoverLetterSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string(),
  isDefault: z.boolean().default(false),
  targetRole: z.string().nullable().optional(),
  targetCompany: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const UserProfileSchema = z.object({
  id: z.string(),
  personal: PersonalInfoSchema,
  jobPreferences: JobPreferencesSchema,
  education: z.array(EducationRecordSchema),
  school: SchoolRecordSchema,
  workAuthorization: WorkAuthorizationSchema,
  experience: z.array(ExperienceRecordSchema),
  projects: z.array(ProjectRecordSchema),
  skills: SkillsInventorySchema,
  resumes: z.array(ResumeRecordSchema),
  applicationQuestions: z.array(ProfileApplicationQuestionSchema).optional(),
  coverLetters: z.array(CoverLetterSchema).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const FieldCategorySchema = z.enum([
  'PERSONAL',
  'EDUCATION',
  'EXPERIENCE',
  'SKILLS',
  'PROJECT',
  'WORK_AUTHORIZATION',
  'SPONSORSHIP',
  'SALARY',
  'AVAILABILITY',
  'LOCATION',
  'BEHAVIORAL',
  'TECHNICAL',
  'COMPANY_MOTIVATION',
  'ROLE_MOTIVATION',
  'DEMOGRAPHIC',
  'RESUME',
  'UNKNOWN'
]);

export const AIAnswerResultSchema = z.object({
  classification: FieldCategorySchema,
  confidence: z.number().min(0).max(1),
  answer: z.string(),
  sourceIds: z.array(z.string()),
  needsConfirmation: z.boolean(),
  reason: z.string(),
  status: z.enum(['SUCCESS', 'INSUFFICIENT_INFORMATION', 'ERROR'])
});

export const JobAnalysisResultSchema = z.object({
  role: z.string(),
  company: z.string(),
  location: z.string(),
  employmentType: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  experienceRequirements: z.array(z.string()),
  educationRequirements: z.array(z.string()),
  sponsorship: z.string().nullable(),
  relevantUserSkills: z.array(z.string()),
  relevantProjects: z.array(z.string()),
  recommendedResume: z.string(),
  summary: z.string()
});

export const ApplicationRecordSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  url: z.string(),
  date: z.string(),
  resumeUsed: z.string().nullable().optional(),
  fieldsFilled: z.number().default(0),
  aiAnswersCount: z.number().default(0),
  status: z.enum(['Draft', 'Reviewed', 'Applied', 'Rejected', 'Interview', 'Offer']),
  notes: z.string().nullable().optional()
});
