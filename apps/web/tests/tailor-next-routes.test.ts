import test from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { POST as matchHandler } from '../app/api/tailor/match/route.ts';
import { POST as generateHandler } from '../app/api/tailor/generate/route.ts';
import { POST as saveHandler } from '../app/api/tailor/save/route.ts';

const HEADOUT_FRONTEND_JD = `
Title: Frontend Engineer
Company: Headout
Location: Remote / Bangalore
About Headout:
Headout is building the future of real-world experiences.

Requirements:
- 3+ years experience with React, TypeScript, Next.js, and modern CSS
- Deep understanding of web performance, browser APIs, and state management
- Bachelor's degree in Computer Science or related field
- Experience with responsive web applications and REST APIs

Preferred:
- Experience with WebSockets, Tailwind CSS, and testing libraries
`;

test('Next.js Route - POST /api/tailor/match succeeds with Headout Frontend Engineer JD', async () => {
  const req = new NextRequest('http://localhost:3000/api/tailor/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobText: HEADOUT_FRONTEND_JD,
      jobTitle: 'Frontend Engineer',
      companyName: 'Headout',
      profileContext: INITIAL_SOHEL_PROFILE
    })
  });

  const res = await matchHandler(req);
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.analysis);
  assert.strictEqual(data.analysis.jobTitle, 'Frontend Engineer');
  assert.strictEqual(data.analysis.company, 'Headout');
  assert.ok(typeof data.analysis.overallScore === 'number');
  assert.strictEqual(data.analysis.scoreBreakdown.length, 6);
  assert.ok(data.analysis.matchingSkills.length > 0);
});

test('Next.js Route - POST /api/tailor/match rejects missing profileContext when unauthenticated', async () => {
  const req = new NextRequest('http://localhost:3000/api/tailor/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobText: HEADOUT_FRONTEND_JD,
      jobTitle: 'Frontend Engineer'
    })
  });

  const res = await matchHandler(req);
  assert.strictEqual(res.status, 401);

  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.message.includes('profileContext is required'));
});

test('Next.js Route - POST /api/tailor/generate produces tailored draft with anti-hallucination fallback', async () => {
  const req = new NextRequest('http://localhost:3000/api/tailor/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobText: HEADOUT_FRONTEND_JD,
      jobTitle: 'Frontend Engineer',
      companyName: 'Headout',
      profileContext: INITIAL_SOHEL_PROFILE
    })
  });

  const res = await generateHandler(req);
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.draft);
  assert.strictEqual(data.draft.targetJobTitle, 'Frontend Engineer');
  assert.strictEqual(data.draft.targetCompany, 'Headout');
  assert.ok(data.draft.experience.length > 0);
});

test('Next.js Route - POST /api/tailor/save rejects unauthenticated requests', async () => {
  const req = new NextRequest('http://localhost:3000/api/tailor/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Headout Tailored Resume',
      targetRoles: ['Frontend Engineer'],
      relevantSkills: ['React', 'TypeScript'],
      tailoredDraft: {
        headline: 'Frontend Engineer',
        professionalSummary: 'Specialist in React and TypeScript web apps',
        targetJobTitle: 'Frontend Engineer',
        targetCompany: 'Headout',
        matchScore: 88,
        highlightedSkills: ['React', 'TypeScript'],
        experience: [],
        projects: [],
        education: [],
        changesSummary: ['Prioritized frontend highlights']
      }
    })
  });

  const res = await saveHandler(req);
  assert.strictEqual(res.status, 401);

  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.strictEqual(data.error.code, 'UNAUTHORIZED');
});
