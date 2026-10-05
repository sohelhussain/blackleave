import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { CONFIG } from '../config.js';

export const authRouter = Router();

const AuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

authRouter.post('/register', (req: Request, res: Response) => {
  const parsed = AuthBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const token = jwt.sign({ id: 'user_sohel_hussain_01', email: parsed.data.email }, CONFIG.JWT_SECRET, {
    expiresIn: '7d'
  });

  return res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: 'user_sohel_hussain_01', email: parsed.data.email }
  });
});

authRouter.post('/login', (req: Request, res: Response) => {
  const parsed = AuthBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const token = jwt.sign({ id: 'user_sohel_hussain_01', email: parsed.data.email }, CONFIG.JWT_SECRET, {
    expiresIn: '7d'
  });

  return res.json({
    message: 'Logged in successfully',
    token,
    user: { id: 'user_sohel_hussain_01', email: parsed.data.email }
  });
});
