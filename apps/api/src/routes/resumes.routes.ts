import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { ResumeRecordSchema } from '@applyflow/validators';
import { ResumeRecord } from '@applyflow/types';

export const resumesRouter = Router();

resumesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return res.json({ resumes: profile.resumes });
});

resumesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = ResumeRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `resume_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const profile = getCurrentProfile();
  // If set to default, unset previous default
  if (parsed.data.isDefault) {
    profile.resumes.forEach((r) => (r.isDefault = false));
  }

  profile.resumes.push(parsed.data as ResumeRecord);
  setCurrentProfile(profile);

  return res.status(201).json({ message: 'Resume uploaded', resume: parsed.data });
});

resumesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = getCurrentProfile();
  profile.resumes = profile.resumes.filter((r) => r.id !== id);
  setCurrentProfile(profile);

  return res.json({ message: 'Resume deleted successfully' });
});
