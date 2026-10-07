import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getProfileForUser, saveProfileForUser } from '../services/profile.service.js';
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

skillsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = req.profile || await getProfileForUser(userId);
  return sendSuccess(res, { skills: profile.skills });
});

skillsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const parsed = AddSkillSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  const { category, skill } = parsed.data;
  const profile = req.profile || await getProfileForUser(userId);

  const updatedSkills = { ...profile.skills };
  if (!updatedSkills[category].includes(skill)) {
    updatedSkills[category] = [...updatedSkills[category], skill];
    await saveProfileForUser(userId, { skills: updatedSkills });
  }

  return sendSuccess(res, { skills: updatedSkills }, 201);
});

skillsRouter.delete('/:skillName', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { skillName } = req.params;
  const profile = req.profile || await getProfileForUser(userId);

  const updatedSkills = { ...profile.skills };
  for (const cat of Object.keys(updatedSkills) as Array<keyof typeof profile.skills>) {
    updatedSkills[cat] = updatedSkills[cat].filter((s) => s.toLowerCase() !== skillName.toLowerCase());
  }

  await saveProfileForUser(userId, { skills: updatedSkills });
  return sendSuccess(res, { message: `Skill ${skillName} deleted`, skills: updatedSkills });
});
