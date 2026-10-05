import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { ProjectRecordSchema } from '@applyflow/validators';
import { ProjectRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const projectsRouter = Router();

projectsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return sendSuccess(res, { projects: profile.projects });
});

projectsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = ProjectRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `proj_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = getCurrentProfile();
  profile.projects.push(parsed.data as ProjectRecord);
  setCurrentProfile(profile);

  return sendSuccess(res, { project: parsed.data }, 201);
});

projectsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  const index = profile.projects.findIndex((p) => p.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Project record not found', 404);
  }

  const parsed = ProjectRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  profile.projects[index] = {
    ...profile.projects[index],
    ...parsed.data
  };
  setCurrentProfile(profile);

  return sendSuccess(res, { project: profile.projects[index] });
});

projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  profile.projects = profile.projects.filter((p) => p.id !== id);
  setCurrentProfile(profile);

  return sendSuccess(res, { message: 'Project deleted successfully' });
});
