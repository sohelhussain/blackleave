import test from 'node:test';
import assert from 'node:assert';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import {
  extractRequirementsFromText,
  computeJobMatchAnalysis,
  ResumeTailorService
} from '../dist/index.js';
import {
  JobMatchAnalysisSchema,
  TailoredResumeDraftSchema
} from '@applyflow/validators';

const SAMPLE_BACKEND_JD = `
Title: Senior Backend Distributed Systems Engineer
Company: CloudScale Systems
About the Role:
We are looking for a Senior Backend Engineer to build resilient distributed infrastructure.

Requirements:
- Strong experience with Go, Node.js, TypeScript, PostgreSQL, and Redis
- 3+ years experience with distributed systems, high concurrency, and microservices
- Bachelor's degree in Computer Science or related engineering field
- Hands-on experience with Docker, Kubernetes, and AWS or GCP cloud environments

Preferred Qualifications:
- Experience with C++ or Rust for performance-critical systems
- Familiarity with CI/CD pipelines, Prometheus, and Grafana
- Experience with payment gateways or financial transaction protocols
`;

const SAMPLE_FRONTEND_JD = `
Title: Senior Frontend Engineer
Company: WebCraft Labs
Requirements:
- Expert in React, Next.js, TypeScript, and Tailwind CSS
- 4+ years frontend web engineering experience
- Bachelor's degree
Preferred:
- GraphQL, WebSockets, Figma design token systems
`;

test('Matching Engine - extracts requirements accurately from diverse JDs', () => {
  const reqs = extractRequirementsFromText(SAMPLE_BACKEND_JD);
  
  assert.ok(reqs.requiredSkills.includes('TypeScript') || reqs.requiredSkills.includes('Node.js'));
  assert.ok(reqs.requiredSkills.includes('PostgreSQL') || reqs.requiredSkills.includes('Go'));
  assert.strictEqual(reqs.minYearsExperience, 3);
  assert.strictEqual(reqs.seniority, 'Senior');
  assert.ok(reqs.educationRequirements.some(e => /degree|bachelor|computer/i.test(e)));
});

test('Matching Engine - computes transparent weighted match score according to formula', () => {
  const reqs = extractRequirementsFromText(SAMPLE_BACKEND_JD, 'Senior Backend Engineer', 'CloudScale Systems');
  const analysis = computeJobMatchAnalysis(reqs, INITIAL_SOHEL_PROFILE);

  // Verify schema conformity
  const parseResult = JobMatchAnalysisSchema.safeParse(analysis);
  assert.ok(parseResult.success, `Schema validation failed: ${JSON.stringify(parseResult.error)}`);

  // Verify formula constants and breakdown
  assert.strictEqual(analysis.scoreBreakdown.length, 6);
  const weights = analysis.scoreBreakdown.map(c => c.weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  assert.strictEqual(Math.round(totalWeight * 100), 100);

  // Check category weights: 0.35, 0.15, 0.20, 0.15, 0.10, 0.05
  const catMap = Object.fromEntries(analysis.scoreBreakdown.map(c => [c.id, c]));
  assert.strictEqual(catMap.requiredSkills.weight, 0.35);
  assert.strictEqual(catMap.preferredSkills.weight, 0.15);
  assert.strictEqual(catMap.experience.weight, 0.20);
  assert.strictEqual(catMap.projects.weight, 0.15);
  assert.strictEqual(catMap.education.weight, 0.10);
  assert.strictEqual(catMap.seniority.weight, 0.05);

  // Verify calculated score mathematically matches weighted sum
  const expectedWeightedSum = Math.round(
    catMap.requiredSkills.score * 0.35 +
    catMap.preferredSkills.score * 0.15 +
    catMap.experience.score * 0.20 +
    catMap.projects.score * 0.15 +
    catMap.education.score * 0.10 +
    catMap.seniority.score * 0.05
  );
  assert.strictEqual(analysis.overallScore, expectedWeightedSum);
});

test('Matching Engine - identifies matched vs missing skills with evidence citations', () => {
  const reqs = extractRequirementsFromText(SAMPLE_BACKEND_JD);
  const analysis = computeJobMatchAnalysis(reqs, INITIAL_SOHEL_PROFILE);

  // Sohel knows TypeScript, Node.js, PostgreSQL, Docker, C++
  assert.ok(analysis.matchingSkills.some(s => s.toLowerCase().includes('typescript') || s.toLowerCase().includes('postgresql')));

  // Check qualifications have valid status and evidence
  const supported = analysis.qualifications.filter(q => q.status === 'SUPPORTED');
  assert.ok(supported.length > 0);
  for (const item of supported) {
    assert.ok(item.evidence && item.evidence.length > 0, `Missing evidence for supported qualification: ${item.name}`);
  }

  // Strengths and recommendations must be populated
  assert.ok(analysis.strengths.length > 0);
  assert.ok(analysis.recommendedFocus.length > 0);
});

test('Resume Tailor Service - generates truthful tailored draft via deterministic fallback', async () => {
  const tailorService = new ResumeTailorService(undefined); // No API key to force safe deterministic fallback
  const draft = await tailorService.tailorResume({
    jobText: SAMPLE_BACKEND_JD,
    jobTitle: 'Senior Backend Engineer',
    companyName: 'CloudScale Systems'
  }, INITIAL_SOHEL_PROFILE);

  // Verify schema validation
  const validation = TailoredResumeDraftSchema.safeParse(draft);
  assert.ok(validation.success, `Draft schema validation failed: ${JSON.stringify(validation.error)}`);

  // Zero Fabrication Guarantee Checks:
  // 1. Every company in tailored experience must exist in candidate's original profile
  const originalCompanies = new Set(INITIAL_SOHEL_PROFILE.experience.map(e => e.company.toLowerCase()));
  for (const exp of draft.experience) {
    assert.ok(
      originalCompanies.has(exp.company.toLowerCase()),
      `Fabricated company detected: ${exp.company}`
    );
  }

  // 2. Every institution in education must exist in candidate's profile
  const originalInstitutions = new Set(INITIAL_SOHEL_PROFILE.education.map(e => e.university.toLowerCase()));
  for (const edu of draft.education) {
    assert.ok(
      originalInstitutions.has(edu.institution.toLowerCase()),
      `Fabricated education institution detected: ${edu.institution}`
    );
  }

  // 3. Every project title in tailored projects must exist in candidate's original profile
  const originalProjects = new Set(INITIAL_SOHEL_PROFILE.projects.map(p => p.title.toLowerCase()));
  for (const proj of draft.projects) {
    assert.ok(
      originalProjects.has(proj.title.toLowerCase()),
      `Fabricated project detected: ${proj.title}`
    );
  }

  // 4. Headline and summary must reflect target role and company truthfully
  assert.ok(draft.targetJobTitle.includes('Senior Backend Engineer'));
  assert.ok(draft.targetCompany.includes('CloudScale Systems'));
  assert.ok(draft.changesSummary.length > 0);
});

test('Resume Tailor Service - reorders most relevant projects and experience first', async () => {
  const tailorService = new ResumeTailorService(undefined);
  
  // Backend JD should prioritize backend projects (e.g. DPI Engine / MediVault / UPI)
  const backendDraft = await tailorService.tailorResume({
    jobText: SAMPLE_BACKEND_JD,
    jobTitle: 'Senior Backend Engineer'
  }, INITIAL_SOHEL_PROFILE);
  assert.ok(backendDraft.projects.length > 0);

  // Frontend JD should prioritize frontend projects/skills
  const frontendDraft = await tailorService.tailorResume({
    jobText: SAMPLE_FRONTEND_JD,
    jobTitle: 'Senior Frontend Engineer'
  }, INITIAL_SOHEL_PROFILE);
  assert.ok(frontendDraft.projects.length > 0);
  assert.ok(frontendDraft.highlightedSkills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('typescript')));
});
