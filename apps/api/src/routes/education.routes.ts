import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import { EducationRecordSchema } from '@applyflow/validators';
import { EducationRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const educationRouter = Router();

educationRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return sendSuccess(res, { education: profile.education });
});

educationRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = EducationRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `edu_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = req.profile || await getProfileForUser(userId);
  const updatedEducation = [...profile.education, parsed.data as EducationRecord];
  await saveProfileForUser(userId, { education: updatedEducation });

  return sendSuccess(res, { education: parsed.data }, 201);
});

educationRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const index = profile.education.findIndex((e) => e.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Education record not found', 404);
  }

  const parsed = EducationRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const updatedEducation = [...profile.education];
  updatedEducation[index] = {
    ...updatedEducation[index],
    ...parsed.data
  };

  await saveProfileForUser(userId, { education: updatedEducation });
  return sendSuccess(res, { education: updatedEducation[index] });
});

educationRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const updatedEducation = profile.education.filter((e) => e.id !== id);

  await saveProfileForUser(userId, { education: updatedEducation });
  return sendSuccess(res, { message: 'Education record deleted successfully' });
});
