import test from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { POST as matchHandler } from '../app/api/tailor/match/route.ts';
import { POST as generateHandler } from '../app/api/tailor/generate/route.ts';
import { POST as saveHandler } from '../app/api/tailor/save/route.ts';

const HEADOUT_FRONTEND_JD = `
Title: Software Engineer, Web (Frontend)
Company: Headout
Location: Bangalore / Remote
About Headout:
Headout is building the world's leading travel experiences marketplace, helping millions discover and book tours, attractions, and activities globally.

Responsibilities:
- Build and maintain high-performance, accessible, and responsive user-facing web applications.
- Optimize frontend web performance, ensuring sub-second page loads and high Core Web Vitals.
- Ensure cross-browser compatibility across Chrome, Safari, Firefox, and mobile rendering engines.
- Architect modular frontend state management and integrate with REST APIs.

Requirements:
- 3+ years of professional frontend web engineering experience.
- Strong proficiency in modern JavaScript (ES6+), TypeScript, and React.
- Solid mastery of HTML5, modern CSS3, and Responsive Design principles.
- Demonstrated experience with Cross-Browser Compatibility and performance optimization.
- Experience consuming and integrating RESTful APIs and managing complex client-side state.
- Bachelor's or Master's degree in Computer Science, Engineering, or a related technical discipline.

Preferred Qualifications:
- Experience with Next.js, Tailwind CSS, and WebSockets.
- Familiarity with automated unit testing (Jest/Vitest) and end-to-end testing frameworks.
`;

test('Next.js Route - POST /api/tailor/match succeeds with complete Headout JD and transparent scoring', async () => {
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

  // Score must not be inflated to 100% because Headout requires 3+ years and Cross-Browser evidence
  assert.ok(data.analysis.overallScore < 95, `Overall score cannot be 100%, got ${data.analysis.overallScore}%`);
  assert.ok(data.analysis.overallScore > 50, `Overall score should be solid match, got ${data.analysis.overallScore}%`);

  // Client-supplied profileContext preserves Reported provenance
  const supportedSkills = data.analysis.qualifications.filter((q: any) => q.status === 'SUPPORTED');
  assert.ok(supportedSkills.length > 0);
  for (const q of supportedSkills) {
    assert.ok(
      q.evidence?.startsWith('Reported in') || q.evidence?.includes('Reported'),
      `Evidence must use Reported for client-supplied profileContext: ${q.evidence}`
    );
  }
});

test('Next.js Route - POST /api/tailor/match penalizes incomplete profile with missing dates and unevidenced skills', async () => {
  const incompleteProfile = {
    ...INITIAL_SOHEL_PROFILE,
    experience: [
      {
        id: 'exp_no_dates',
        company: 'Dev Shop',
        title: 'Frontend Engineer',
        employmentType: 'Full-time',
        location: 'Remote',
        workMode: 'Remote',
        startDate: '', // Missing date
        endDate: null,
        current: false,
        responsibilities: ['Basic UI tweaks'],
        technologies: ['React']
      }
    ],
    projects: [],
    education: []
  };

  const req = new NextRequest('http://localhost:3000/api/tailor/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobText: HEADOUT_FRONTEND_JD,
      jobTitle: 'Frontend Engineer',
      companyName: 'Headout',
      profileContext: incompleteProfile
    })
  });

  const res = await matchHandler(req);
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.success, true);
  // Missing dates and missing competencies drop score significantly below 50%
  assert.ok(data.analysis.overallScore < 50, `Incomplete profile score must be < 50%, got ${data.analysis.overallScore}%`);
  const expBreakdown = data.analysis.scoreBreakdown.find((b: any) => b.id === 'experience');
  assert.ok(expBreakdown.score <= 30);
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
