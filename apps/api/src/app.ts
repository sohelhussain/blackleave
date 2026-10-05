import express, { Request, Response } from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { educationRouter } from './routes/education.routes.js';
import { experienceRouter } from './routes/experience.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { skillsRouter } from './routes/skills.routes.js';
import { jobPreferencesRouter } from './routes/job-preferences.routes.js';
import { resumesRouter } from './routes/resumes.routes.js';
import { applicationsRouter } from './routes/applications.routes.js';
import { aiRouter } from './routes/ai.routes.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'ApplyFlow AI API' });
  });

  // Public auth routes
  app.use('/api/auth', authRouter);

  // Protected / contextual routes
  app.use('/api/profile', authMiddleware, profileRouter);
  app.use('/api/education', authMiddleware, educationRouter);
  app.use('/api/experience', authMiddleware, experienceRouter);
  app.use('/api/projects', authMiddleware, projectsRouter);
  app.use('/api/skills', authMiddleware, skillsRouter);
  app.use('/api/job-preferences', authMiddleware, jobPreferencesRouter);
  app.use('/api/resumes', authMiddleware, resumesRouter);
  app.use('/api/applications', authMiddleware, applicationsRouter);
  app.use('/api/ai', authMiddleware, aiRouter);

  return app;
}
