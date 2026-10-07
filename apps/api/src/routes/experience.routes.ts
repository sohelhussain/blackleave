import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import { ExperienceRecordSchema } from '@applyflow/validators';
import { ExperienceRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const experienceRouter = Router();

experienceRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return sendSuccess(res, { experience: profile.experience });
});

experienceRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = ExperienceRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `exp_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = req.profile || await getProfileForUser(userId);
  const updatedExperience = [...profile.experience, parsed.data as ExperienceRecord];
  await saveProfileForUser(userId, { experience: updatedExperience });

  return sendSuccess(res, { experience: parsed.data }, 201);
});

experienceRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const index = profile.experience.findIndex((e) => e.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Experience record not found', 404);
  }

  const parsed = ExperienceRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const updatedExperience = [...profile.experience];
  updatedExperience[index] = {
    ...updatedExperience[index],
    ...parsed.data
  };

  await saveProfileForUser(userId, { experience: updatedExperience });
  return sendSuccess(res, { experience: updatedExperience[index] });
});

experienceRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const updatedExperience = profile.experience.filter((e) => e.id !== id);

  await saveProfileForUser(userId, { experience: updatedExperience });
  return sendSuccess(res, { message: 'Experience record deleted successfully' });
});
