import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { calculateProfileCompleteness } from '@applyflow/types';
import { UserProfileSchema } from '@applyflow/validators';
import { sendSuccess, sendError } from '../utils/response.js';
import { getProfileForUser, upsertUserProfile } from '../services/profile.service.js';

export const profileRouter = Router();

profileRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  const completion = calculateProfileCompleteness(profile);
  return sendSuccess(res, { profile, completion });
});

import {
  PersonalInfoSchema,
  JobPreferencesSchema,
  WorkAuthorizationSchema,
  EducationRecordSchema,
  ExperienceRecordSchema,
  ProjectRecordSchema,
  ResumeRecordSchema,
  ProfileApplicationQuestionSchema
} from '@applyflow/validators';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  personal: PersonalInfoSchema.partial().optional(),
  jobPreferences: JobPreferencesSchema.partial().optional(),
  workAuthorization: WorkAuthorizationSchema.partial().optional(),
  education: z.array(EducationRecordSchema).optional(),
  experience: z.array(ExperienceRecordSchema).optional(),
  projects: z.array(ProjectRecordSchema).optional(),
  skills: z.record(z.array(z.string())).optional(),
  resumes: z.array(ResumeRecordSchema).optional(),
  applicationQuestions: z.array(ProfileApplicationQuestionSchema).optional()
});

profileRouter.put('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  // Synchronize country work authorization into legacy flags if present
  const currentProfile = req.profile || await getProfileForUser(userId);
  const incomingAuth = parsed.data.workAuthorization;
  let syncedAuth = incomingAuth ? { ...currentProfile.workAuthorization, ...incomingAuth } : currentProfile.workAuthorization;

  if (incomingAuth?.countries && incomingAuth.countries.length > 0) {
    const inAuth = incomingAuth.countries.find((c) => c.countryCode === 'IN');
    const usAuth = incomingAuth.countries.find((c) => c.countryCode === 'US');
    const euAuth = incomingAuth.countries.find((c) => ['DE', 'FR', 'IE', 'NL'].includes(c.countryCode));

    if (inAuth) {
      syncedAuth.indiaAuthorized = inAuth.status === 'AUTHORIZED' || inAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.indiaSponsorshipRequired = inAuth.status === 'REQUIRES_SPONSORSHIP';
    }
    if (usAuth) {
      syncedAuth.usAuthorized = usAuth.status === 'AUTHORIZED' || usAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.usSponsorshipRequired = usAuth.status === 'REQUIRES_SPONSORSHIP';
    }
    if (euAuth) {
      syncedAuth.europeAuthorized = euAuth.status === 'AUTHORIZED' || euAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.europeSponsorshipRequired = euAuth.status === 'REQUIRES_SPONSORSHIP';
    }
  }

  const updated = await upsertUserProfile(userId, {
    ...parsed.data,
    workAuthorization: syncedAuth
  });

  const completion = calculateProfileCompleteness(updated);
  return sendSuccess(res, { profile: updated, completion, message: 'Profile updated successfully' });
});

profileRouter.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  const { confirm } = req.body;
  if (confirm !== true) {
    return sendError(
      res,
      'CONFIRMATION_REQUIRED',
      'Deletion requires explicit confirmation. Pass { "confirm": true } in request body.'
    );
  }

  const userId = req.user!.id;
  // Reset only the authenticated user's profile
  const reset = await upsertUserProfile(userId, {
    personal: {
      fullName: '',
      firstName: '',
      lastName: '',
      preferredName: '',
      email: req.user!.email,
      phone: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      linkedin: '',
      github: '',
      portfolio: '',
      summary: ''
    },
    education: [],
    experience: [],
    projects: [],
    applicationQuestions: []
  });

  return sendSuccess(res, { message: 'Profile reset successfully', profile: reset });
});
