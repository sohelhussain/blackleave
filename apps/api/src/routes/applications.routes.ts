import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getPrismaClient } from '@applyflow/database';
import { ApplicationRecordSchema } from '@applyflow/validators';

export const applicationsRouter = Router();

applicationsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const prisma = getPrismaClient();
  const applications = await prisma.application.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  });

  return res.json({ applications });
});

applicationsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const parsed = ApplicationRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `app_${Date.now()}`,
    date: req.body.date || new Date().toISOString().split('T')[0],
    status: req.body.status || 'Draft'
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const prisma = getPrismaClient();
  const created = await prisma.application.create({
    data: {
      id: parsed.data.id,
      userId: req.user!.id,
      company: parsed.data.company,
      role: parsed.data.role,
      url: parsed.data.url,
      date: parsed.data.date,
      fieldsFilled: parsed.data.fieldsFilled || 0,
      aiAnswersCount: parsed.data.aiAnswersCount || 0,
      status: parsed.data.status || 'Draft',
      notes: parsed.data.notes || null
    }
  });

  return res.status(201).json({ message: 'Application recorded', application: created });
});

applicationsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const prisma = getPrismaClient();

  const existing = await prisma.application.findFirst({
    where: { id, userId: req.user!.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(req.body.company ? { company: req.body.company } : {}),
      ...(req.body.role ? { role: req.body.role } : {}),
      ...(req.body.status ? { status: req.body.status } : {}),
      ...(req.body.notes !== undefined ? { notes: req.body.notes } : {})
    }
  });

  return res.json({ application: updated });
});

applicationsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const prisma = getPrismaClient();

  const existing = await prisma.application.findFirst({
    where: { id, userId: req.user!.id }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Application not found' });
  }

  await prisma.application.delete({ where: { id } });
  return res.json({ message: 'Application deleted successfully' });
});
