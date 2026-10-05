import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createApp } from '../dist/app.js';

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3001;
  baseUrl = `http://localhost:${port}`;
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
  assert.strictEqual(data.app, 'ApplyFlow AI API');
});

test('API Server - GET /api/profile returns consistent success response', async () => {
  const res = await fetch(`${baseUrl}/api/profile`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.data.profile.personal.firstName, 'Sohel');
  assert.strictEqual(data.data.profile.personal.email, 'sohelhussaing@gmail.com');
  assert.strictEqual(data.data.profile.workAuthorization.indiaAuthorized, true);
  assert.strictEqual(data.data.profile.workAuthorization.usAuthorized, true);
});

test('API Server - Education endpoints GET and POST', async () => {
  const getRes = await fetch(`${baseUrl}/api/education`);
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.ok(Array.isArray(getData.data.education));

  const postRes = await fetch(`${baseUrl}/api/education`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

test('API Server - Skills endpoints GET and POST', async () => {
  const getRes = await fetch(`${baseUrl}/api/skills`);
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.ok(getData.data.skills.programming.includes('TypeScript'));

  const postRes = await fetch(`${baseUrl}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

test('API Server - Job Preferences GET and PUT', async () => {
  const getRes = await fetch(`${baseUrl}/api/job-preferences`);
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.data.jobPreferences.noticePeriod, '15 days');

  const putRes = await fetch(`${baseUrl}/api/job-preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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

test('API Server - DELETE /api/profile fails without explicit confirmation', async () => {
  const res = await fetch(`${baseUrl}/api/profile`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: false })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'CONFIRMATION_REQUIRED');
});
