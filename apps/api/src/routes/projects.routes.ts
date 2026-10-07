import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import { ProjectRecordSchema } from '@applyflow/validators';
import { ProjectRecord } from '@applyflow/types';
import { sendSuccess, sendError } from '../utils/response.js';

export const projectsRouter = Router();

projectsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return sendSuccess(res, { projects: profile.projects });
});

projectsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = ProjectRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `proj_${Date.now()}`
  });

  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const profile = req.profile || await getProfileForUser(userId);
  const updatedProjects = [...profile.projects, parsed.data as ProjectRecord];
  await saveProfileForUser(userId, { projects: updatedProjects });

  return sendSuccess(res, { project: parsed.data }, 201);
});

projectsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const index = profile.projects.findIndex((p) => p.id === id);

  if (index === -1) {
    return sendError(res, 'NOT_FOUND', 'Project record not found', 404);
  }

  const parsed = ProjectRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const updatedProjects = [...profile.projects];
  updatedProjects[index] = {
    ...updatedProjects[index],
    ...parsed.data
  };

  await saveProfileForUser(userId, { projects: updatedProjects });
  return sendSuccess(res, { project: updatedProjects[index] });
});

projectsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const updatedProjects = profile.projects.filter((p) => p.id !== id);

  await saveProfileForUser(userId, { projects: updatedProjects });
  return sendSuccess(res, { message: 'Project record deleted successfully' });
});
