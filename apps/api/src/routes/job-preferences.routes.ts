import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import { JobPreferencesSchema } from '@applyflow/validators';
import { sendSuccess, sendError } from '../utils/response.js';

export const jobPreferencesRouter = Router();

jobPreferencesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return sendSuccess(res, { jobPreferences: profile.jobPreferences });
});

jobPreferencesRouter.put('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = JobPreferencesSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = req.profile || await getProfileForUser(userId);
  const updated = await saveProfileForUser(userId, {
    jobPreferences: {
      ...profile.jobPreferences,
      ...parsed.data
    }
  });

  return sendSuccess(res, { jobPreferences: updated.jobPreferences });
});
