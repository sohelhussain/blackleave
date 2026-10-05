import test from 'node:test';
import assert from 'node:assert';
import { GeminiService } from '../dist/gemini.service.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { AIAnswerResultSchema } from '@applyflow/validators';

const service = new GeminiService(); // Evaluates factual local synthesis satisfying AI rules

const REALISTIC_QUESTIONS = [
  {
    q: 'Why are you interested in this position?',
    category: 'ROLE_MOTIVATION' as const,
    expectedKeywords: ['robust', 'scalable', 'skills', 'role', 'position', 'distributed systems']
  },
  {
    q: 'Why do you want to work at this company?',
    category: 'COMPANY_MOTIVATION' as const,
    expectedKeywords: ['contribute', 'scalable', 'environment']
  },
  {
    q: 'Tell us about a challenging technical problem you solved.',
    category: 'BEHAVIORAL' as const,
    expectedKeywords: ['Saurce', 'REST', 'mismatches', 'QA']
  },
  {
    q: 'Describe a project you are proud of.',
    category: 'PROJECT' as const,
    expectedKeywords: ['DPI Engine', 'MediVault']
  },
  {
    q: 'Describe your experience with Java.',
    category: 'SKILLS' as const,
    expectedKeywords: ['Java', 'Spring Boot', 'UPI Without Internet', '500+']
  },
  {
    q: 'Describe your experience with distributed systems.',
    category: 'TECHNICAL' as const,
    expectedKeywords: ['DPI Engine', 'thread pools', 'flow hashing']
  },
  {
    q: 'What is your experience with cloud infrastructure?',
    category: 'TECHNICAL' as const,
    expectedKeywords: ['Docker', 'docker-compose', 'AWS S3']
  },
  {
    q: 'Tell us about a time you worked under pressure.',
    category: 'BEHAVIORAL' as const,
    expectedKeywords: ['Fibon Hack', 'hackathon', '36-hour']
  },
  {
    q: 'What is your greatest technical achievement?',
    category: 'TECHNICAL' as const,
    expectedKeywords: ['DPI Engine', 'C++17', 'payload decryption']
  },
  {
    q: 'What are your career goals?',
    category: 'COMPANY_MOTIVATION' as const,
    expectedKeywords: ['backend', 'distributed systems', 'software engineer']
  },
  {
    q: 'What motivates you?',
    category: 'COMPANY_MOTIVATION' as const,
    expectedKeywords: ['backend', 'distributed systems']
  },
  {
    q: 'Why should we hire you?',
    category: 'COMPANY_MOTIVATION' as const,
    expectedKeywords: ['MCA', 'Saurce', 'TypeScript', 'C++']
  },
  {
    q: 'Describe a bug that took you hours or days to track down.',
    category: 'BEHAVIORAL' as const,
    expectedKeywords: ['Saurce', 'REST', 'endpoints']
  },
  {
    q: 'How do you approach learning new technologies?',
    category: 'BEHAVIORAL' as const,
    expectedKeywords: ['Saurce']
  },
  {
    q: 'Tell us about an open source or community contribution.',
    category: 'PROJECT' as const,
    expectedKeywords: ['DPI Engine', 'MediVault']
  },
  {
    q: 'Describe a time you collaborated with peers on a fast deadline.',
    category: 'BEHAVIORAL' as const,
    expectedKeywords: ['Fibon Hack', 'hackathon']
  },
  {
    q: 'Describe your frontend development capabilities.',
    category: 'SKILLS' as const,
    expectedKeywords: ['React', 'TypeScript']
  },
  {
    q: 'Explain your understanding of blockchain smart contracts.',
    category: 'PROJECT' as const,
    expectedKeywords: ['MediVault', 'Solana', 'Anchor']
  },
  {
    q: 'What is your experience with containerization and DevOps?',
    category: 'TECHNICAL' as const,
    expectedKeywords: ['Docker', 'docker-compose']
  },
  {
    q: 'Describe your highest impact software achievement.',
    category: 'TECHNICAL' as const,
    expectedKeywords: ['DPI Engine', 'throughput']
  }
];

test('Realistic 20 Application Questions - Validates classification, sources, no hallucinations', async () => {
  for (let i = 0; i < REALISTIC_QUESTIONS.length; i++) {
    const item = REALISTIC_QUESTIONS[i];
    const res = await service.generateAnswer({
      fieldLabel: item.q,
      fieldType: 'textarea',
      category: item.category,
      jobTitle: 'Software Engineer',
      companyName: 'Acme Technologies',
      profileContext: INITIAL_SOHEL_PROFILE
    });

    // 1. Zod schema validation
    const parsed = AIAnswerResultSchema.safeParse(res);
    assert.strictEqual(parsed.success, true, `Question ${i + 1} failed schema validation`);

    // 2. Needs confirmation invariant
    assert.strictEqual(res.needsConfirmation, true, `Question ${i + 1} must require confirmation`);

    // 3. Status must be SUCCESS
    assert.strictEqual(res.status, 'SUCCESS', `Question ${i + 1} must succeed with profile facts`);

    // 4. Relevant source citation
    assert.ok(res.sourceIds.length > 0, `Question ${i + 1} must cite source records`);

    // 5. Verifies at least one expected factual keyword
    const matchesKeyword = item.expectedKeywords.some((kw) =>
      res.answer.toLowerCase().includes(kw.toLowerCase())
    );
    assert.ok(matchesKeyword, `Question "${item.q}" missing expected verified factual context. Answer: ${res.answer}`);
  }
});

test('Unrecorded Question - Strictly returns INSUFFICIENT_INFORMATION', async () => {
  const res = await service.generateAnswer({
    fieldLabel: 'What is your active military security clearance code?',
    fieldType: 'text',
    category: 'DEMOGRAPHIC',
    profileContext: INITIAL_SOHEL_PROFILE
  });

  assert.strictEqual(res.status, 'INSUFFICIENT_INFORMATION');
  assert.strictEqual(res.answer, 'INSUFFICIENT_INFORMATION');
  assert.strictEqual(res.confidence, 0.0);
});

test('Role Motivation - "Why are you interested in Product Management?" links engineering background truthfully', async () => {
  const res = await service.generateAnswer({
    fieldLabel: 'Why are you interested in Product Management?',
    fieldType: 'textarea',
    category: 'ROLE_MOTIVATION',
    jobTitle: 'Associate Product Manager',
    companyName: 'Acme Corp',
    profileContext: INITIAL_SOHEL_PROFILE
  });

  assert.strictEqual(res.status, 'SUCCESS');
  assert.strictEqual(res.classification, 'ROLE_MOTIVATION');
  assert.strictEqual(res.needsConfirmation, true);
  assert.ok(res.sourceIds.length > 0);
  assert.ok(res.answer.includes('software engineering') || res.answer.includes('Saurce'));
  // Ensure we do not claim unverified prior PM titles
  assert.ok(!res.answer.includes('as a Product Manager') && !res.answer.includes('worked as PM'));
});
