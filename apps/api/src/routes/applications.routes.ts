import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ApplicationRecord } from '@applyflow/types';
import { ApplicationRecordSchema } from '@applyflow/validators';

export const applicationsRouter = Router();

// In-memory application tracker for session / history
let applications: ApplicationRecord[] = [
  {
    id: 'app_demo_01',
    company: 'Anthropic',
    role: 'Software Engineer',
    url: 'https://jobs.lever.co/anthropic/software-engineer',
    date: '2025-06-01',
    resumeUsed: 'General Software Engineer Resume',
    fieldsFilled: 18,
    aiAnswersCount: 2,
    status: 'Applied',
    notes: 'Submitted via Lever job board. Highlighted React and distributed systems.'
  },
  {
    id: 'app_demo_02',
    company: 'Stripe',
    role: 'Backend Engineer',
    url: 'https://boards.greenhouse.io/stripe/jobs/backend-engineer',
    date: '2025-06-05',
    resumeUsed: 'Backend Resume',
    fieldsFilled: 22,
    aiAnswersCount: 4,
    status: 'Interview',
    notes: 'Technical screening scheduled for next week.'
  }
];

applicationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ applications });
});

applicationsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = ApplicationRecordSchema.safeParse({
    ...req.body,
    id: req.body.id || `app_${Date.now()}`,
    date: req.body.date || new Date().toISOString().split('T')[0],
    status: req.body.status || 'Draft'
  });

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  applications.unshift(parsed.data as ApplicationRecord);
  return res.status(201).json({ message: 'Application recorded', application: parsed.data });
});

applicationsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const index = applications.findIndex((a) => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Application record not found' });
  }

  const parsed = ApplicationRecordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  applications[index] = {
    ...applications[index],
    ...parsed.data
  };

  return res.json({ message: 'Application status updated', application: applications[index] });
});
