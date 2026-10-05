import test from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../dist/gemini.service.js';
import { JobAnalyzer } from '../dist/job-analyzer.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { AIAnswerResultSchema } from '@applyflow/validators';

test('Gemini Service - Truthful local fallback satisfies AI rules and schema', async () => {
  const service = new GeminiService(); // no api key provided -> verifies safe truthful fallback
  const result = await service.generateAnswer({
    fieldLabel: 'Tell us about a project you are proud of',
    fieldType: 'textarea',
    category: 'PROJECT',
    jobTitle: 'Backend Engineer',
    profileContext: INITIAL_SOHEL_PROFILE
  });

  // Verify Zod validation passes
  const parsed = AIAnswerResultSchema.safeParse(result);
  assert.strictEqual(parsed.success, true);
  assert.strictEqual(result.classification, 'PROJECT');
  assert.strictEqual(result.needsConfirmation, true);
  // Must use real verified project (e.g. DPI Engine or MediVault)
  assert.ok(result.answer.includes('DPI Engine') || result.answer.includes('MediVault'));
});

test('Gemini Service - Missing information returns INSUFFICIENT_INFORMATION', async () => {
  const service = new GeminiService();
  const result = await service.generateAnswer({
    fieldLabel: 'Describe your 10 years of experience managing enterprise SAP systems',
    fieldType: 'textarea',
    category: 'EXPERIENCE',
    profileContext: {
      ...INITIAL_SOHEL_PROFILE,
      experience: [] // empty
    }
  });

  assert.strictEqual(result.answer, 'INSUFFICIENT_INFORMATION');
  assert.strictEqual(result.status, 'INSUFFICIENT_INFORMATION');
});

test('Job Analyzer - Recommends Backend Resume for Backend Job Posting', () => {
  const analyzer = new JobAnalyzer();
  const analysis = analyzer.analyzeJobRuleBased(
    {
      jobText: 'Looking for a Backend Engineer with experience in Java, Spring Boot, and Distributed Systems.'
    },
    INITIAL_SOHEL_PROFILE
  );

  assert.strictEqual(analysis.role, 'Backend Engineer');
  assert.strictEqual(analysis.recommendedResume, 'Backend Resume');
  assert.ok(analysis.relevantUserSkills.includes('Java'));
});
