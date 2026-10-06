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

import { calculateProfileCompleteness } from '@applyflow/types';

export function setCurrentProfile(newProfile: UserProfile): void {
  currentProfile = newProfile;
}

profileRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const completion = calculateProfileCompleteness(currentProfile);
  return sendSuccess(res, { profile: currentProfile, completion });
});

profileRouter.put('/', (req: AuthenticatedRequest, res: Response) => {
  const parsed = UserProfileSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
  }

  // Synchronize country work authorization into legacy flags if present
  const incomingAuth = parsed.data.workAuthorization;
  let syncedAuth = incomingAuth ? { ...currentProfile.workAuthorization, ...incomingAuth } : currentProfile.workAuthorization;

  if (incomingAuth?.countries && incomingAuth.countries.length > 0) {
    const inAuth = incomingAuth.countries.find((c) => c.countryCode === 'IN');
    const usAuth = incomingAuth.countries.find((c) => c.countryCode === 'US');
    const euAuth = incomingAuth.countries.find((c) => ['DE', 'FR', 'IE', 'NL'].includes(c.countryCode));

    if (inAuth) {
      syncedAuth.indiaAuthorized = inAuth.status === 'AUTHORIZED' || inAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.indiaSponsorshipRequired = inAuth.status === 'REQUIRES_SPONSORSHIP';
    }
    if (usAuth) {
      syncedAuth.usAuthorized = usAuth.status === 'AUTHORIZED' || usAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.usSponsorshipRequired = usAuth.status === 'REQUIRES_SPONSORSHIP';
    }
    if (euAuth) {
      syncedAuth.europeAuthorized = euAuth.status === 'AUTHORIZED' || euAuth.status === 'REQUIRES_SPONSORSHIP';
      syncedAuth.europeSponsorshipRequired = euAuth.status === 'REQUIRES_SPONSORSHIP';
    }
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
    workAuthorization: syncedAuth,
    applicationQuestions: parsed.data.applicationQuestions !== undefined ? parsed.data.applicationQuestions : currentProfile.applicationQuestions,
    updatedAt: new Date().toISOString()
  };

  const completion = calculateProfileCompleteness(currentProfile);
  return sendSuccess(res, { profile: currentProfile, completion, message: 'Profile updated successfully' });
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
