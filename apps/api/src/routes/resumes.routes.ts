import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
import { ResumeRecordSchema } from '@applyflow/validators';
import { ResumeRecord } from '@applyflow/types';

export const resumesRouter = Router();

resumesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return res.json({ resumes: profile.resumes });
});

resumesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = ResumeRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `resume_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const profile = req.profile || await getProfileForUser(userId);
  const updatedResumes = [...profile.resumes];

  // If set to default, unset previous default
  if (parsed.data.isDefault) {
    updatedResumes.forEach((r) => (r.isDefault = false));
  }

  updatedResumes.push(parsed.data as ResumeRecord);
  await saveProfileForUser(userId, { resumes: updatedResumes });

  return res.status(201).json({ message: 'Resume uploaded', resume: parsed.data });
});

resumesRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const profile = req.profile || await getProfileForUser(userId);
  const updatedResumes = profile.resumes.filter((r) => r.id !== id);

  await saveProfileForUser(userId, { resumes: updatedResumes });
  return res.json({ message: 'Resume deleted successfully' });
});
