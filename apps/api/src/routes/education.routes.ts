import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { EducationRecordSchema } from '@applyflow/validators';
import { EducationRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const educationRouter = Router();

educationRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return sendSuccess(res, { education: profile.education });
});

educationRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = EducationRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `edu_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = getCurrentProfile();
  profile.education.push(parsed.data as EducationRecord);
  setCurrentProfile(profile);

  return sendSuccess(res, { education: parsed.data }, 201);
});

educationRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  const index = profile.education.findIndex((e) => e.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Education record not found', 404);
  }

  const parsed = EducationRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  profile.education[index] = {
    ...profile.education[index],
    ...parsed.data
  };
  setCurrentProfile(profile);

  return sendSuccess(res, { education: profile.education[index] });
});

educationRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  profile.education = profile.education.filter((e) => e.id !== id);
  setCurrentProfile(profile);

  return sendSuccess(res, { message: 'Education deleted successfully' });
});
