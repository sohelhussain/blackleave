import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { ExperienceRecordSchema } from '@applyflow/validators';
import { ExperienceRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const experienceRouter = Router();

experienceRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return sendSuccess(res, { experience: profile.experience });
});

experienceRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = ExperienceRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `exp_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = getCurrentProfile();
  profile.experience.push(parsed.data as ExperienceRecord);
  setCurrentProfile(profile);

  return sendSuccess(res, { experience: parsed.data }, 201);
});

experienceRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  const index = profile.experience.findIndex((e) => e.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Experience record not found', 404);
  }

  const parsed = ExperienceRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  profile.experience[index] = {
    ...profile.experience[index],
    ...parsed.data
  };
  setCurrentProfile(profile);

  return sendSuccess(res, { experience: profile.experience[index] });
});

experienceRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  profile.experience = profile.experience.filter((e) => e.id !== id);
  setCurrentProfile(profile);

  return sendSuccess(res, { message: 'Experience deleted successfully' });
});
