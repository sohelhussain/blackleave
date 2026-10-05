import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getCurrentProfile, setCurrentProfile } from './profile.routes.js';
import { z } from 'zod';
import { sendSuccess, sendError } from '../utils/response.js';

export const skillsRouter = Router();

const AddSkillSchema = z.object({
  category: z.enum([
    'programming',
    'frontend',
    'backend',
    'database',
    'infrastructure',
    'blockchain',
    'realtime',
    'auth',
    'other'
  ]),
  skill: z.string().min(1)
});

skillsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const profile = getCurrentProfile();
  return sendSuccess(res, { skills: profile.skills });
});

skillsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = AddSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const { category, skill } = parsed.data;
  const profile = getCurrentProfile();

  if (!profile.skills[category].includes(skill)) {
    profile.skills[category].push(skill);
    setCurrentProfile(profile);
  }

  return sendSuccess(res, { skills: profile.skills }, 201);
});

skillsRouter.delete('/:skillName', (req: AuthenticatedRequest, res: Response) => {
  const { skillName } = req.params;
  const profile = getCurrentProfile();

  for (const cat of Object.keys(profile.skills) as Array<keyof typeof profile.skills>) {
    profile.skills[cat] = profile.skills[cat].filter((s) => s.toLowerCase() !== skillName.toLowerCase());
  }
  setCurrentProfile(profile);

  return sendSuccess(res, { message: `Skill ${skillName} deleted`, skills: profile.skills });
});
