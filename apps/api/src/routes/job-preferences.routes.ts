import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { JobPreferencesSchema } from '@applyflow/validators';
import { sendSuccess, sendError } from '../utils/response.js';

export const jobPreferencesRouter = Router();

jobPreferencesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return sendSuccess(res, { jobPreferences: profile.jobPreferences });
});

jobPreferencesRouter.put('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = JobPreferencesSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = getCurrentProfile();
  profile.jobPreferences = {
    ...profile.jobPreferences,
    ...parsed.data
  };
  setCurrentProfile(profile);

  return sendSuccess(res, { jobPreferences: profile.jobPreferences });
});
