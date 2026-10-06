import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { CONFIG } from '../config.js';
import { calculateProfileCompleteness, INITIAL_SOHEL_PROFILE, UserProfile } from '@applyflow/types';
import { getCurrentProfile } from './profile.routes.js';

export const authRouter = Router();

const AuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const GoogleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  googleId: z.string().optional()
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

  const profile = getCurrentProfile();
  const completion = calculateProfileCompleteness(profile);

  return res.json({
    message: 'Logged in successfully',
    token,
    user: { id: 'user_sohel_hussain_01', email: parsed.data.email },
    profile,
    completion
  });
});

authRouter.post('/google', async (req: Request, res: Response) => {
  const parsed = GoogleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  let email = parsed.data.email;
  let name = parsed.data.name;
  let picture = parsed.data.picture;
  let googleId = parsed.data.googleId;

  // If a raw Google JWT credential was provided, parse payload safely
  if (parsed.data.credential) {
    try {
      const decoded: any = jwt.decode(parsed.data.credential);
      if (decoded && decoded.email) {
        email = decoded.email;
        name = decoded.name || name;
        picture = decoded.picture || picture;
        googleId = decoded.sub || googleId;
      }
    } catch (e) {
      // Fallback to directly provided fields
    }
  }

  if (!email) {
    // Default to demo/seed user if offline or testing
    email = 'sohelhussaing@gmail.com';
    name = 'Sohel Hussain';
  }

  // Check if existing user (e.g. Sohel Hussain seed)
  const isExisting = email.toLowerCase() === 'sohelhussaing@gmail.com';
  const profile: UserProfile = isExisting
    ? getCurrentProfile()
    : {
        id: `user_${Date.now()}`,
        personal: {
          fullName: name || '',
          firstName: name ? name.split(' ')[0] : '',
          lastName: name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '',
          preferredName: name ? name.split(' ')[0] : '',
          email: email,
          phone: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          linkedin: '',
          github: '',
          portfolio: ''
        },
        jobPreferences: {
          targetRoles: [],
          targetJobTitles: [],
          targetIndustries: [],
          employmentTypes: ['Full-time'],
          workModes: ['Remote'],
          preferredLocations: [],
          willingToRelocate: false,
          willingToWorkRemotely: true,
          noticePeriod: 'Immediate'
        },
        education: [],
        school: { tenthPercentage: '', twelfthPercentage: '', twelfthStream: '' },
        workAuthorization: {
          indiaAuthorized: false,
          indiaSponsorshipRequired: false,
          usAuthorized: false,
          usSponsorshipRequired: false,
          europeAuthorized: false,
          europeSponsorshipRequired: false,
          countries: []
        },
        experience: [],
        projects: [],
        skills: {
          programming: [],
          frontend: [],
          backend: [],
          database: [],
          infrastructure: [],
          blockchain: [],
          realtime: [],
          auth: [],
          other: []
        },
        resumes: [],
        applicationQuestions: []
      };

  const token = jwt.sign(
    { id: profile.id, email, name, googleId },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const completion = calculateProfileCompleteness(profile);

  return res.json({
    success: true,
    token,
    isNewUser: !isExisting,
    user: {
      id: profile.id,
      email,
      name: name || profile.personal.fullName,
      picture: picture || null
    },
    profile,
    completion
  });
});

authRouter.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, CONFIG.JWT_SECRET);
    const profile = getCurrentProfile();
    const completion = calculateProfileCompleteness(profile);

    return res.json({
      success: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || profile.personal.fullName
      },
      profile,
      completion
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
