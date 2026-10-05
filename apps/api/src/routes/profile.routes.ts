import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { INITIAL_SOHEL_PROFILE, UserProfile } from '@applyflow/types';
import { UserProfileSchema } from '@applyflow/validators';
import { sendSuccess, sendError } from '../utils/response.js';

export const profileRouter = Router();

// In-memory / active state backed by initial profile
let currentProfile: UserProfile = JSON.parse(JSON.stringify(INITIAL_SOHEL_PROFILE));

export function getCurrentProfile(): UserProfile {
  return currentProfile;
}

export function setCurrentProfile(newProfile: UserProfile): void {
  currentProfile = newProfile;
}

profileRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  return sendSuccess(res, { profile: currentProfile });
});

profileRouter.put('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = UserProfileSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  currentProfile = {
    ...currentProfile,
    ...parsed.data,
    personal: {
      ...currentProfile.personal,
      ...(parsed.data.personal || {})
    },
    jobPreferences: {
      ...currentProfile.jobPreferences,
      ...(parsed.data.jobPreferences || {})
    },
    workAuthorization: {
      ...currentProfile.workAuthorization,
      ...(parsed.data.workAuthorization || {})
    },
    updatedAt: new Date().toISOString()
  };

  return sendSuccess(res, { profile: currentProfile, message: 'Profile updated successfully' });
});

profileRouter.delete('/', (req: AuthenticatedRequest, res: Response) => {
  const { confirm } = req.body;
  if (confirm !== true) {
    return sendError(
      res,
      'CONFIRMATION_REQUIRED',
      'Deletion requires explicit confirmation. Pass { "confirm": true } in request body.'
    );
  }

  // Reset profile to empty state
  currentProfile = {
    id: 'user_deleted',
    personal: {
      fullName: '',
      firstName: '',
      lastName: '',
      preferredName: '',
      email: '',
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
      employmentTypes: [],
      preferredLocations: [],
      willingToRelocate: false,
      willingToWorkRemotely: false,
      noticePeriod: ''
    },
    education: [],
    school: { tenthPercentage: '', twelfthPercentage: '', twelfthStream: '' },
    workAuthorization: {
      indiaAuthorized: false,
      indiaSponsorshipRequired: false,
      usAuthorized: false,
      usSponsorshipRequired: false,
      europeAuthorized: false,
      europeSponsorshipRequired: false
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
    resumes: []
  };

  return sendSuccess(res, { message: 'All profile data deleted successfully.' });
});
