import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/app.js';
import { CONFIG } from '../dist/config.js';
import { getPrismaClient } from '@applyflow/database';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { upsertUserProfile } from '../dist/services/profile.service.js';

let server: http.Server;
let baseUrl: string;
let authToken: string;
let authCookie: string;

function createTestGoogleCredential(payload: { sub: string; email: string; name: string }) {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      iss: 'https://accounts.google.com',
      aud: CONFIG.GOOGLE_CLIENT_ID || undefined
    },
    CONFIG.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

test.before(async () => {
  // Ensure NODE_ENV is test
  CONFIG.NODE_ENV = 'test';

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3001;
  baseUrl = `http://localhost:${port}`;

  // Seed / ensure Sohel profile exists in database
  const prisma = getPrismaClient();
  const sohelUser = await prisma.user.upsert({
    where: { email: INITIAL_SOHEL_PROFILE.personal.email },
    update: {
      name: INITIAL_SOHEL_PROFILE.personal.fullName,
      googleSubject: 'google_sub_sohel_hussain_seed'
    },
    create: {
      email: INITIAL_SOHEL_PROFILE.personal.email,
      name: INITIAL_SOHEL_PROFILE.personal.fullName,
      googleSubject: 'google_sub_sohel_hussain_seed'
    }
  });

  await upsertUserProfile(sohelUser.id, INITIAL_SOHEL_PROFILE);

  // Sign in Sohel via Google auth endpoint to obtain authentic session token
  const cred = createTestGoogleCredential({
    sub: 'google_sub_sohel_hussain_seed',
    email: INITIAL_SOHEL_PROFILE.personal.email,
    name: INITIAL_SOHEL_PROFILE.personal.fullName
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: cred })
  });

  const loginData = await loginRes.json();
  authToken = loginData.token;
  const cookieHeader = loginRes.headers.get('set-cookie');
  if (cookieHeader) {
    authCookie = cookieHeader.split(';')[0];
  }
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    if (server) {
      server.closeAllConnections?.();
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
});

test('API Server - Health check returns 200 OK', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(data.app, 'blackLeave API');
});

test('Security - Unauthenticated requests to protected endpoints return 401', async () => {
  const res = await fetch(`${baseUrl}/api/profile`);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'UNAUTHORIZED');
});

test('Security - Invalid Google credential is strictly rejected with 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: 'forged_fake_invalid_token' })
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.success, false);
});

test('Google Auth - Creates new user, empty candidate profile, and session', async () => {
  const uniqueSub = `google_sub_test_${Date.now()}`;
  const uniqueEmail = `new.candidate.${Date.now()}@example.com`;
  const cred = createTestGoogleCredential({
    sub: uniqueSub,
    email: uniqueEmail,
    name: 'Morgan Test Candidate'
  });

  const res = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: cred })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.authenticated, true);
  assert.strictEqual(data.isNewUser, true);
  assert.strictEqual(data.user.email, uniqueEmail);
  assert.strictEqual(data.profile.personal.fullName, 'Morgan Test Candidate');
  assert.ok(data.token);

  // Relogin with the EXACT same account -> loads existing user, isNewUser is false
  const reloginRes = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: cred })
  });
  assert.strictEqual(reloginRes.status, 200);
  const reloginData = await reloginRes.json();
  assert.strictEqual(reloginData.isNewUser, false);
  assert.strictEqual(reloginData.user.id, data.user.id);
});

test('API Server - GET /api/profile returns authenticated user profile with 200', async () => {
  const res = await fetch(`${baseUrl}/api/profile`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.profile.personal.firstName, 'Sohel');
  assert.strictEqual(data.data.profile.personal.email, 'sohelhussaing@gmail.com');
  assert.strictEqual(data.data.profile.workAuthorization.indiaAuthorized, true);
});

test('API Server - Education endpoints GET and POST scoped to user', async () => {
  const getRes = await fetch(`${baseUrl}/api/education`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.ok(Array.isArray(getData.data.education));

  const postRes = await fetch(`${baseUrl}/api/education`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      degree: 'Master of Science',
      branch: 'Artificial Intelligence',
      university: 'Tech University',
      location: 'Bangalore',
      startDate: '08/2027'
    })
  });
  assert.strictEqual(postRes.status, 201);
  const postData = await postRes.json();
  assert.strictEqual(postData.success, true);
  assert.strictEqual(postData.data.education.degree, 'Master of Science');
});

test('API Server - Skills endpoints GET and POST scoped to user', async () => {
  const getRes = await fetch(`${baseUrl}/api/skills`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.ok(getData.data.skills.programming.includes('TypeScript'));

  const postRes = await fetch(`${baseUrl}/api/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      category: 'backend',
      skill: 'GraphQL'
    })
  });
  assert.strictEqual(postRes.status, 201);
  const postData = await postRes.json();
  assert.strictEqual(postData.success, true);
  assert.ok(postData.data.skills.backend.includes('GraphQL'));
});

test('API Server - Job Preferences GET and PUT scoped to user', async () => {
  const getRes = await fetch(`${baseUrl}/api/job-preferences`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.data.jobPreferences.noticePeriod, '15 days');

  const putRes = await fetch(`${baseUrl}/api/job-preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      noticePeriod: '30 days'
    })
  });
  assert.strictEqual(putRes.status, 200);
  const putData = await putRes.json();
  assert.strictEqual(putData.success, true);
  assert.strictEqual(putData.data.jobPreferences.noticePeriod, '30 days');
});

test('API Server - POST /api/ai/classify-field accurately categorizes questions', async () => {
  const res = await fetch(`${baseUrl}/api/ai/classify-field`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ label: 'Why do you want to join our company?' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.category, 'COMPANY_MOTIVATION');
  assert.strictEqual(data.requiresConfirmation, true);
});

test('API Server - POST /api/ai/generate-answer generates truthful answer using profile', async () => {
  const res = await fetch(`${baseUrl}/api/ai/generate-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      fieldLabel: 'Tell us about a technical project you built',
      fieldType: 'textarea',
      category: 'PROJECT',
      jobTitle: 'Backend Engineer'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.result.classification, 'PROJECT');
  assert.ok(data.result.answer.length > 20);
});

test('API Server - Session restoration via GET /api/auth/session', async () => {
  const res = await fetch(`${baseUrl}/api/auth/session`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.authenticated, true);
  assert.strictEqual(data.user.email, 'sohelhussaing@gmail.com');
});

test('API Server - Logout revokes session but preserves user & profile data', async () => {
  // Create a temporary user
  const tempSub = `temp_logout_sub_${Date.now()}`;
  const tempEmail = `temp.logout.${Date.now()}@example.com`;
  const cred = createTestGoogleCredential({
    sub: tempSub,
    email: tempEmail,
    name: 'Temporary Logout User'
  });

  const loginRes = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: cred })
  });
  const loginData = await loginRes.json();
  const tempToken = loginData.token;

  // Verify session is active
  const checkActive = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Authorization: `Bearer ${tempToken}` }
  });
  const checkActiveData = await checkActive.json();
  assert.strictEqual(checkActiveData.authenticated, true);

  // Update profile with a custom city
  await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tempToken}`
    },
    body: JSON.stringify({
      personal: { city: 'San Francisco' }
    })
  });

  // Call logout endpoint
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempToken}` }
  });
  assert.strictEqual(logoutRes.status, 200);
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutData.authenticated, false);

  // Verify session is now invalidated
  const checkAfterLogout = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Authorization: `Bearer ${tempToken}` }
  });
  const checkAfterLogoutData = await checkAfterLogout.json();
  assert.strictEqual(checkAfterLogoutData.authenticated, false);

  // Protected route rejects old token
  const protectedRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { Authorization: `Bearer ${tempToken}` }
  });
  assert.strictEqual(protectedRes.status, 401);

  // Relogin with same Google account -> Data is preserved!
  const reloginRes = await fetch(`${baseUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: cred })
  });
  const reloginData = await reloginRes.json();
  assert.strictEqual(reloginData.authenticated, true);
  assert.strictEqual(reloginData.profile.personal.city, 'San Francisco');
});
