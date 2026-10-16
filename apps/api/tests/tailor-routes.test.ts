import test from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { tailorRouter } from '../dist/routes/tailor.routes.js';
import { resetAiRateLimiter } from '../dist/routes/ai.routes.js';

function executeTailorRoute(
  method: string,
  path: string,
  body: any,
  headers: Record<string, string> = {},
  ip: string = '127.0.0.1'
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const req: any = new EventEmitter();
    req.method = method;
    req.url = path;
    req.originalUrl = `/api/tailor${path}`;
    req.headers = { 'content-type': 'application/json', ...headers };
    req.body = body;
    req.ip = ip;
    req.socket = { remoteAddress: ip };

    const res: any = new EventEmitter();
    let statusCode = 200;
    let responseBody: any = null;
    const responseHeaders: Record<string, string> = {};

    res.status = (code: number) => {
      statusCode = code;
      return res;
    };

    res.set = (key: string, val: string) => {
      responseHeaders[key.toLowerCase()] = val;
      return res;
    };

    res.json = (data: any) => {
      responseBody = data;
      resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      return res;
    };

    tailorRouter(req, res, (routeErr?: any) => {
      if (routeErr) return reject(routeErr);
      resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
    });
  });
}

const SAMPLE_BACKEND_JD = `
Title: Senior Backend Distributed Systems Engineer
Company: CloudScale Systems
Requirements:
- Strong experience with Go, Node.js, TypeScript, PostgreSQL, and Redis
- 3+ years experience with distributed systems and microservices
- Bachelor's degree in Computer Science
`;

test('Tailor Routes - POST /api/tailor/match returns transparent scoring and breakdown', async () => {
  const res = await executeTailorRoute('POST', '/match', {
    jobText: SAMPLE_BACKEND_JD,
    jobTitle: 'Senior Backend Engineer',
    companyName: 'CloudScale Systems',
    profileContext: INITIAL_SOHEL_PROFILE
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(typeof res.body.analysis.overallScore === 'number');
  assert.strictEqual(res.body.analysis.scoreBreakdown.length, 6);
  assert.ok(res.body.analysis.matchingSkills.length > 0);
  assert.ok(res.body.analysis.qualifications.length > 0);
});

test('Tailor Routes - POST /api/tailor/match rejects missing job description or profile', async () => {
  // Empty job description (< 10 chars)
  const shortJdRes = await executeTailorRoute('POST', '/match', {
    jobText: 'Too short',
    profileContext: INITIAL_SOHEL_PROFILE
  });
  assert.strictEqual(shortJdRes.status, 400);

  // Missing profile
  const missingProfileRes = await executeTailorRoute('POST', '/match', {
    jobText: SAMPLE_BACKEND_JD
  });
  assert.strictEqual(missingProfileRes.status, 401);
});

test('Tailor Routes - POST /api/tailor/generate creates tailored draft and enforces rate limiting', async () => {
  resetAiRateLimiter();
  const testIp = '10.200.0.1';

  // Successful generation with deterministic fallback in test environment
  const res = await executeTailorRoute('POST', '/generate', {
    jobText: SAMPLE_BACKEND_JD,
    jobTitle: 'Senior Backend Engineer',
    companyName: 'CloudScale Systems',
    profileContext: INITIAL_SOHEL_PROFILE
  }, {}, testIp);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.draft.headline.length > 0);
  assert.ok(res.body.draft.professionalSummary.length > 0);
  assert.ok(res.body.draft.experience.length > 0);

  // Fill quota (rate limit is 20 for /generate)
  for (let i = 1; i < 20; i++) {
    await executeTailorRoute('POST', '/generate', {
      jobText: SAMPLE_BACKEND_JD,
      profileContext: INITIAL_SOHEL_PROFILE
    }, {}, testIp);
  }

  // 21st request triggers 429
  const limitedRes = await executeTailorRoute('POST', '/generate', {
    jobText: SAMPLE_BACKEND_JD,
    profileContext: INITIAL_SOHEL_PROFILE
  }, {}, testIp);

  assert.strictEqual(limitedRes.status, 429);
  assert.ok(limitedRes.body.error.includes('Too many AI requests'));
  assert.ok(limitedRes.headers['retry-after']);

  resetAiRateLimiter();
});

test('Tailor Routes - POST /api/tailor/save enforces strict authentication', async () => {
  // Unauthenticated request without session cookie or bearer token must return 401
  const res = await executeTailorRoute('POST', '/save', {
    name: 'Backend Tailored Resume',
    targetRoles: ['Backend Engineer'],
    relevantSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    tailoredDraft: {
      headline: 'Senior Backend Engineer',
      professionalSummary: 'Experienced distributed systems engineer...',
      targetJobTitle: 'Senior Backend Engineer',
      targetCompany: 'CloudScale Systems',
      matchScore: 88,
      highlightedSkills: ['TypeScript', 'Node.js'],
      experience: [],
      projects: [],
      education: [],
      changesSummary: ['Reordered backend projects']
    }
  });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});
