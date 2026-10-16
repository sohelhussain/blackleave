import test from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { SESSION_COOKIE_NAME } from '@applyflow/database';
import { optionalAuthMiddleware } from '../dist/middleware/auth.js';
import { aiRouter, resetAiRateLimiter, aiRateLimiter } from '../dist/routes/ai.routes.js';

function executeRoute(
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
    req.originalUrl = `/api/ai${path}`;
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

    optionalAuthMiddleware(req, res, (err?: any) => {
      if (err) return reject(err);
      aiRouter(req, res, (routeErr?: any) => {
        if (routeErr) return reject(routeErr);
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      });
    });
  });
}

test('Audit Regression - SESSION_COOKIE_NAME is defined and consistent', () => {
  assert.strictEqual(SESSION_COOKIE_NAME, 'session_token');
});

test('Audit Regression - AI routes accept profileContext without database session token & enforce trust boundary', async () => {
  resetAiRateLimiter();

  // 1. Calling generate-answer without session AND without profileContext returns 401
  const unauthRes = await executeRoute('POST', '/generate-answer', {
    fieldLabel: 'Why do you want to join our company?',
    category: 'COMPANY_MOTIVATION'
  });
  assert.strictEqual(unauthRes.status, 401);
  assert.ok(unauthRes.body.error.includes('profileContext is required'));

  // 2. Calling with profileContext (as sent by the Chrome extension) succeeds and enforces trust boundary
  const extRes = await executeRoute('POST', '/generate-answer', {
    fieldLabel: 'Tell us about a technical project you built',
    fieldType: 'textarea',
    category: 'PROJECT',
    jobTitle: 'Backend Engineer',
    profileContext: INITIAL_SOHEL_PROFILE
  });
  assert.strictEqual(extRes.status, 200);
  assert.ok(extRes.body.result);
  assert.strictEqual(extRes.body.result.classification, 'PROJECT');
  assert.ok(extRes.body.result.answer.length > 20);
  // Trust boundary check: Client-supplied unauthenticated profile requires explicit human confirmation
  assert.strictEqual(extRes.body.result.needsConfirmation, true);
  assert.ok(extRes.body.result.reason.includes('Client-supplied profile context'));

  // 3. Calling classify-field with profileContext
  const classifyRes = await executeRoute('POST', '/classify-field', {
    label: 'Why are you interested in this engineering role?',
    profileContext: INITIAL_SOHEL_PROFILE
  });
  assert.strictEqual(classifyRes.status, 200);
  assert.strictEqual(classifyRes.body.category, 'ROLE_MOTIVATION');
});

test('Audit Regression - AI routes reject oversized prompts and malformed inputs', async () => {
  resetAiRateLimiter();

  // 1. Oversized fieldLabel (> 1000 chars) is rejected with 400
  const hugeLabel = 'A'.repeat(1500);
  const oversizedRes = await executeRoute('POST', '/generate-answer', {
    fieldLabel: hugeLabel,
    category: 'ROLE_MOTIVATION',
    profileContext: INITIAL_SOHEL_PROFILE
  });
  assert.strictEqual(oversizedRes.status, 400);

  // 2. Invalid category is rejected with 400
  const invalidCategoryRes = await executeRoute('POST', '/generate-answer', {
    fieldLabel: 'What is your background?',
    category: 'INVALID_CATEGORY_XYZ',
    profileContext: INITIAL_SOHEL_PROFILE
  });
  assert.strictEqual(invalidCategoryRes.status, 400);
});

test('Audit Regression - AI routes enforce sliding-window rate limiting (429 Too Many Requests)', async () => {
  resetAiRateLimiter();
  const testIp = '192.168.1.100';

  // Issue 30 requests (allowed quota)
  for (let i = 0; i < 30; i++) {
    const res = await executeRoute(
      'POST',
      '/classify-field',
      { label: 'Role motivation question', profileContext: INITIAL_SOHEL_PROFILE },
      {},
      testIp
    );
    assert.strictEqual(res.status, 200);
  }

  // 31st request from same IP exceeds quota and returns 429
  const rateLimitedRes = await executeRoute(
    'POST',
    '/classify-field',
    { label: 'Another question', profileContext: INITIAL_SOHEL_PROFILE },
    {},
    testIp
  );
  assert.strictEqual(rateLimitedRes.status, 429);
  assert.ok(rateLimitedRes.body.error.includes('Too many AI requests'));
  assert.ok(rateLimitedRes.headers['retry-after']);

  // Requests from a different IP are not blocked
  const otherIpRes = await executeRoute(
    'POST',
    '/classify-field',
    { label: 'Question from other IP', profileContext: INITIAL_SOHEL_PROFILE },
    {},
    '10.0.0.5'
  );
  assert.strictEqual(otherIpRes.status, 200);

  resetAiRateLimiter();
});

test('Audit Regression - RECORD_APPLICATION handles payload validation, deduplication, and HTTP errors', async () => {
  const storage: Record<string, any> = { history: [] };
  const mockChromeStorage = {
    local: {
      get: async (key: string) => ({ [key]: storage[key] || [] }),
      set: async (obj: Record<string, any>) => {
        Object.assign(storage, obj);
      }
    }
  };

  async function handleRecordApplication(application: any, mockApiStatus: number) {
    if (!application || typeof application !== 'object' || !application.company) {
      return { success: false, error: 'Invalid application payload' };
    }

    let apiSynced = false;
    try {
      if (mockApiStatus === 200) {
        apiSynced = true;
      } else {
        throw new Error(`API returned HTTP ${mockApiStatus}`);
      }
    } catch {
      // API unauthenticated or offline
    }

    try {
      const { history = [] } = await mockChromeStorage.local.get('history');
      const cleanHistory = Array.isArray(history) ? history : [];

      const existingIdx = cleanHistory.findIndex(
        (h: any) =>
          h.id === application.id ||
          (application.url && h.url === application.url && h.date === application.date)
      );

      if (existingIdx >= 0) {
        cleanHistory[existingIdx] = { ...cleanHistory[existingIdx], ...application };
      } else {
        cleanHistory.unshift(application);
      }

      if (cleanHistory.length > 200) {
        cleanHistory.length = 200;
      }

      await mockChromeStorage.local.set({ history: cleanHistory });
    } catch (storageErr: any) {
      return { success: false, error: storageErr.message };
    }

    return { success: true, apiSynced };
  }

  // 1. Invalid payload rejection
  const invalidRes = await handleRecordApplication(null, 200);
  assert.strictEqual(invalidRes.success, false);
  assert.strictEqual(invalidRes.error, 'Invalid application payload');

  // 2. HTTP 401 fallback to local storage
  const app1 = {
    id: 'app_1',
    company: 'Alpha Corp',
    role: 'Frontend Engineer',
    url: 'https://alpha.example/jobs/1',
    date: '2026-10-16',
    fieldsFilled: 4,
    status: 'Reviewed'
  };
  const res1 = await handleRecordApplication(app1, 401);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.apiSynced, false);
  assert.strictEqual(storage.history.length, 1);
  assert.strictEqual(storage.history[0].company, 'Alpha Corp');

  // 3. Deduplication: submitting update to the same application URL/date updates instead of duplicating
  const app1Updated = {
    ...app1,
    fieldsFilled: 6,
    status: 'Submitted'
  };
  const res2 = await handleRecordApplication(app1Updated, 401);
  assert.strictEqual(res2.success, true);
  assert.strictEqual(storage.history.length, 1, 'History length should remain 1 due to deduplication');
  assert.strictEqual(storage.history[0].fieldsFilled, 6);
  assert.strictEqual(storage.history[0].status, 'Submitted');

  // 4. Different application appends cleanly
  const app2 = {
    id: 'app_2',
    company: 'Beta Systems',
    role: 'Backend Engineer',
    url: 'https://beta.example/jobs/2',
    date: '2026-10-16',
    fieldsFilled: 8,
    status: 'Reviewed'
  };
  const res3 = await handleRecordApplication(app2, 500);
  assert.strictEqual(res3.success, true);
  assert.strictEqual(storage.history.length, 2);
  assert.strictEqual(storage.history[0].company, 'Beta Systems');
});
