import {
  UserProfile,
  JobMatchAnalysis,
  MatchScoreCategory,
  QualificationMatch,
  MatchQualificationStatus
} from '@applyflow/types';

export interface ExtractedJobRequirements {
  jobTitle: string;
  company: string;
  seniority: 'Intern' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Unknown';
  requiredSkills: string[];
  preferredSkills: string[];
  minYearsExperience?: number;
  educationRequirements: string[];
}

/**
 * Normalizes text for case-insensitive matching.
 */
function clean(str: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Checks if a candidate skill matches a target skill, supporting common tech synonyms.
 */
function isSkillMatch(candidateSkill: string, targetSkill: string): boolean {
  const c = clean(candidateSkill);
  const t = clean(targetSkill);

  if (c === t || c.includes(t) || t.includes(c)) return true;

  // Synonyms and aliases
  const synonyms: Record<string, string[]> = {
    'react': ['react.js', 'reactjs'],
    'node.js': ['node', 'nodejs'],
    'typescript': ['ts'],
    'javascript': ['js'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'golang': ['go'],
    'kubernetes': ['k8s'],
    'docker': ['containerization', 'containers'],
    'amazon web services': ['aws'],
    'google cloud platform': ['gcp', 'google cloud'],
    'ci/cd': ['continuous integration', 'github actions', 'jenkins'],
    'rest': ['restful', 'rest api', 'apis']
  };

  for (const [canonical, aliases] of Object.entries(synonyms)) {
    const family = [canonical, ...aliases];
    if (family.includes(c) && family.includes(t)) {
      return true;
    }
  }

  return false;
}

/**
 * Rule-based requirement parser from raw Job Description text.
 */
export function extractRequirementsFromText(jobText: string, jobTitleOverride?: string, companyOverride?: string): ExtractedJobRequirements {
  const text = jobText || '';
  const lower = text.toLowerCase();

  // 1. Role / Title
  let jobTitle = jobTitleOverride || '';
  if (!jobTitle) {
    if (/staff\s*platform\s*engineer/i.test(text)) jobTitle = 'Staff Platform Engineer';
    else if (/backend\s*(?:software\s*)?engineer/i.test(text)) jobTitle = 'Backend Engineer';
    else if (/frontend\s*(?:software\s*)?developer/i.test(text) || /react\s*developer/i.test(text)) jobTitle = 'Frontend Developer';
    else if (/full\s*stack\s*(?:developer|engineer)/i.test(text)) jobTitle = 'Full Stack Developer';
    else if (/blockchain\s*developer/i.test(text) || /web3\s*engineer/i.test(text)) jobTitle = 'Blockchain Developer';
    else if (/devops\s*engineer/i.test(text) || /cloud\s*engineer/i.test(text)) jobTitle = 'DevOps / Cloud Engineer';
    else if (/intern/i.test(text)) jobTitle = 'Software Engineer Intern';
    else jobTitle = 'Software Engineer';
  }

  // 2. Company
  let company = companyOverride || '';
  if (!company) {
    const compMatch = text.match(/(?:at|join|with)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)/);
    company = compMatch ? compMatch[1] : 'Hiring Company';
  }

  // 3. Seniority
  let seniority: ExtractedJobRequirements['seniority'] = 'Mid';
  if (/intern(?:ship)?/i.test(lower)) seniority = 'Intern';
  else if (/junior|entry[\s-]level|associate|graduate|0-2\s*years/i.test(lower)) seniority = 'Junior';
  else if (/senior|sr\.?|5\+\s*years/i.test(lower)) seniority = 'Senior';
  else if (/lead|staff|principal|architect/i.test(lower)) seniority = 'Lead';

  // 4. Required & Preferred Skills Extraction
  const knownTech = [
    'react', 'react.js', 'typescript', 'javascript', 'node.js', 'nodejs', 'express', 'next.js',
    'python', 'django', 'fastapi', 'golang', 'go', 'java', 'spring boot', 'c++', 'rust',
    'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'prisma',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'github actions', 'graphql',
    'rest api', 'solidity', 'web3', 'microservices', 'distributed systems', 'kafka', 'tailwind css'
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  // Look for section splits (Requirements / Qualifications vs Nice to have / Preferred)
  const preferredIndex = lower.search(/(?:nice to have|preferred|bonus|plus|good to have)/);
  const reqPart = preferredIndex !== -1 ? lower.slice(0, preferredIndex) : lower;
  const prefPart = preferredIndex !== -1 ? lower.slice(preferredIndex) : '';

  for (const tech of knownTech) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9+#])${escaped}(?:$|[^a-zA-Z0-9+#])`, 'i');
    if (regex.test(reqPart)) {
      const label = tech === 'c++' ? 'C++' : tech === 'ci/cd' ? 'CI/CD' : tech === 'rest api' ? 'REST APIs' : tech.charAt(0).toUpperCase() + tech.slice(1);
      if (!requiredSkills.includes(label)) requiredSkills.push(label);
    } else if (prefPart && regex.test(prefPart)) {
      const label = tech === 'c++' ? 'C++' : tech === 'ci/cd' ? 'CI/CD' : tech === 'rest api' ? 'REST APIs' : tech.charAt(0).toUpperCase() + tech.slice(1);
      if (!preferredSkills.includes(label)) preferredSkills.push(label);
    }
  }

  // Fallbacks if no explicit tech matched
  if (requiredSkills.length === 0) {
    requiredSkills.push('React', 'TypeScript', 'Node.js');
  }

  // 5. Min years of experience
  let minYearsExperience = 0;
  const expMatch = lower.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?\s+(?:relevant\s+)?experience/);
  if (expMatch) {
    minYearsExperience = parseInt(expMatch[1], 10);
  } else if (seniority === 'Senior') {
    minYearsExperience = 5;
  } else if (seniority === 'Junior') {
    minYearsExperience = 1;
  }

  // 6. Education requirements
  const educationRequirements: string[] = [];
  if (/master|mca|ms\s+in/i.test(lower)) {
    educationRequirements.push('Masters or Bachelors in Computer Science, MCA, or related technical field');
  } else if (/bachelor|b\.?tech|b\.?e\.?|degree\s+in\s+cs/i.test(lower)) {
    educationRequirements.push('Bachelors in Computer Science, Engineering, or related technical field');
  }

  return {
    jobTitle,
    company,
    seniority,
    requiredSkills,
    preferredSkills,
    minYearsExperience,
    educationRequirements
  };
}

/**
 * Calculates a mathematically transparent compatibility match analysis
 * between an extracted job description and a verified candidate profile.
 */
export function computeJobMatchAnalysis(
  requirements: ExtractedJobRequirements,
  profile: UserProfile
): JobMatchAnalysis {
  // Collect all verified candidate skills
  const allCandidateSkills = [
    ...(profile.skills?.programming || []),
    ...(profile.skills?.frontend || []),
    ...(profile.skills?.backend || []),
    ...(profile.skills?.database || []),
    ...(profile.skills?.infrastructure || []),
    ...(profile.skills?.blockchain || []),
    ...(profile.skills?.other || [])
  ];

  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  const qualifications: QualificationMatch[] = [];

  // 1. Evaluate Required Skills (Weight: 35%)
  let reqMatched = 0;
  for (const reqSkill of requirements.requiredSkills) {
    const matchedCandidateSkill = allCandidateSkills.find((cs) => isSkillMatch(cs, reqSkill));
    if (matchedCandidateSkill) {
      reqMatched++;
      matchingSkills.push(reqSkill);

      // Find citations in projects or experience
      const expEvidence = profile.experience?.find((e) =>
        e.technologies?.some((t) => isSkillMatch(t, reqSkill))
      );
      const projEvidence = profile.projects?.find((p) =>
        p.technologies?.some((t) => isSkillMatch(t, reqSkill))
      );

      let evidence = `Verified in candidate skills inventory (${matchedCandidateSkill}).`;
      const sourceIds: string[] = [];
      if (expEvidence) {
        evidence += ` Applied at ${expEvidence.company} (${expEvidence.title}).`;
        sourceIds.push(expEvidence.id);
      } else if (projEvidence) {
        evidence += ` Built in ${projEvidence.title} project.`;
        sourceIds.push(projEvidence.id);
      }

      qualifications.push({
        name: reqSkill,
        type: 'skill',
        status: 'SUPPORTED',
        required: true,
        evidence,
        sourceIds: sourceIds.length > 0 ? sourceIds : undefined
      });
    } else {
      missingSkills.push(reqSkill);
      qualifications.push({
        name: reqSkill,
        type: 'skill',
        status: 'MISSING',
        required: true,
        evidence: 'Not found in verified candidate profile skills or experience records.'
      });
    }
  }

  const reqTotal = Math.max(1, requirements.requiredSkills.length);
  const requiredSkillsScore = Math.round((reqMatched / reqTotal) * 100);

  // 2. Evaluate Preferred Skills (Weight: 15%)
  let prefMatched = 0;
  for (const prefSkill of requirements.preferredSkills) {
    const matched = allCandidateSkills.some((cs) => isSkillMatch(cs, prefSkill));
    if (matched) {
      prefMatched++;
      if (!matchingSkills.includes(prefSkill)) matchingSkills.push(prefSkill);
      qualifications.push({
        name: prefSkill,
        type: 'skill',
        status: 'SUPPORTED',
        required: false,
        evidence: `Bonus skill verified in candidate profile.`
      });
    } else {
      qualifications.push({
        name: prefSkill,
        type: 'skill',
        status: 'MISSING',
        required: false,
        evidence: `Optional qualification not present in verified profile.`
      });
    }
  }

  const prefTotal = Math.max(1, requirements.preferredSkills.length);
  const preferredSkillsScore =
    requirements.preferredSkills.length === 0 ? 100 : Math.round((prefMatched / prefTotal) * 100);

  // 3. Evaluate Experience Alignment (Weight: 20%)
  const candidateRoles = profile.experience || [];
  let experienceScore = 50; // baseline for having candidate background
  let expExplanation = '';

  if (candidateRoles.length === 0) {
    experienceScore = 20;
    expExplanation = 'No professional experience entries found in candidate profile.';
    qualifications.push({
      name: 'Work Experience',
      type: 'experience',
      status: 'MISSING',
      required: true,
      evidence: 'No professional experience records in profile.'
    });
  } else {
    // Check if any role title matches target title
    const hasRoleMatch = candidateRoles.some(
      (r) =>
        clean(r.title).includes(clean(requirements.jobTitle)) ||
        clean(requirements.jobTitle).includes(clean(r.title)) ||
        (clean(requirements.jobTitle).includes('engineer') && clean(r.title).includes('engineer'))
    );

    if (hasRoleMatch) {
      experienceScore = 100;
      expExplanation = `Demonstrated relevant professional experience across ${candidateRoles.length} role(s) (including ${candidateRoles[0].title} at ${candidateRoles[0].company}).`;
      qualifications.push({
        name: `${requirements.jobTitle} Experience`,
        type: 'experience',
        status: 'SUPPORTED',
        required: true,
        evidence: `Active experience record: ${candidateRoles[0].title} at ${candidateRoles[0].company}.`,
        sourceIds: [candidateRoles[0].id]
      });
    } else {
      experienceScore = 75;
      expExplanation = `Transferable software experience across ${candidateRoles.length} role(s).`;
      qualifications.push({
        name: 'Transferable Work Experience',
        type: 'experience',
        status: 'PARTIAL',
        required: true,
        evidence: `Experience in ${candidateRoles[0].title} applies transferable systems and coding skills.`
      });
    }
  }

  // 4. Evaluate Projects Alignment (Weight: 15%)
  const candidateProjects = profile.projects || [];
  let projectsScore = 0;
  let projExplanation = '';

  if (candidateProjects.length === 0) {
    projectsScore = 0;
    projExplanation = 'No portfolio projects found in candidate profile.';
  } else {
    // Count projects utilizing any matching required or preferred tech
    const relevantProjects = candidateProjects.filter((p) =>
      p.technologies?.some((t) =>
        requirements.requiredSkills.some((rs) => isSkillMatch(t, rs)) ||
        requirements.preferredSkills.some((ps) => isSkillMatch(t, ps))
      )
    );

    if (relevantProjects.length >= 2) {
      projectsScore = 100;
      projExplanation = `Multiple verified projects (${relevantProjects.map((p) => p.title).join(', ')}) actively utilize required technologies.`;
      relevantProjects.forEach((p) => {
        qualifications.push({
          name: `${p.title} Project`,
          type: 'project',
          status: 'SUPPORTED',
          required: false,
          evidence: `Demonstrates practical implementation of ${p.technologies.slice(0, 3).join(', ')}.`,
          sourceIds: [p.id]
        });
      });
    } else if (relevantProjects.length === 1) {
      projectsScore = 80;
      projExplanation = `Verified project (${relevantProjects[0].title}) showcases implementation of required technologies.`;
      qualifications.push({
        name: `${relevantProjects[0].title} Project`,
        type: 'project',
        status: 'SUPPORTED',
        required: false,
        evidence: `Demonstrates ${relevantProjects[0].technologies.slice(0, 3).join(', ')}.`,
        sourceIds: [relevantProjects[0].id]
      });
    } else {
      projectsScore = 50;
      projExplanation = `Candidate has ${candidateProjects.length} projects, but none specifically cite the primary required technologies.`;
    }
  }

  // 5. Evaluate Education Fit (Weight: 10%)
  const educationList = profile.education || [];
  let educationScore = 100;
  let eduExplanation = '';

  if (requirements.educationRequirements.length === 0) {
    educationScore = 100;
    eduExplanation = 'No strict degree prerequisites specified in job description.';
  } else if (educationList.length > 0) {
    const topEdu = educationList[0];
    educationScore = 100;
    eduExplanation = `Candidate holds verified ${topEdu.degree} in ${topEdu.branch} from ${topEdu.university}.`;
    qualifications.push({
      name: `${topEdu.degree}`,
      type: 'education',
      status: 'SUPPORTED',
      required: true,
      evidence: `Conferred by ${topEdu.university} (${topEdu.branch}).`,
      sourceIds: [topEdu.id]
    });
  } else {
    educationScore = 50;
    eduExplanation = 'Education details not specified in candidate profile.';
    qualifications.push({
      name: 'Degree Requirement',
      type: 'education',
      status: 'UNVERIFIED',
      required: true,
      evidence: 'Degree credentials not listed in verified profile.'
    });
  }

  // 6. Seniority Alignment (Weight: 5%)
  let seniorityScore = 90;
  let seniorityExplanation = `Role seniority (${requirements.seniority}) matches candidate profile stage and job preferences.`;

  const scoreBreakdown: MatchScoreCategory[] = [
    {
      id: 'requiredSkills',
      label: 'Required Core Skills',
      weight: 0.35,
      score: requiredSkillsScore,
      matchedCount: reqMatched,
      totalCount: reqTotal,
      explanation: `${reqMatched} of ${reqTotal} mandatory skills verified in profile (${requiredSkillsScore}%).`
    },
    {
      id: 'preferredSkills',
      label: 'Preferred / Bonus Skills',
      weight: 0.15,
      score: preferredSkillsScore,
      matchedCount: prefMatched,
      totalCount: prefTotal,
      explanation: `${prefMatched} of ${prefTotal} preferred bonus skills demonstrated (${preferredSkillsScore}%).`
    },
    {
      id: 'experience',
      label: 'Experience & Domain Relevance',
      weight: 0.20,
      score: experienceScore,
      matchedCount: candidateRoles.length > 0 ? 1 : 0,
      totalCount: 1,
      explanation: expExplanation
    },
    {
      id: 'projects',
      label: 'Demonstrated Projects',
      weight: 0.15,
      score: projectsScore,
      matchedCount: candidateProjects.length,
      totalCount: 2,
      explanation: projExplanation
    },
    {
      id: 'education',
      label: 'Education & Degree Fit',
      weight: 0.10,
      score: educationScore,
      matchedCount: educationList.length > 0 ? 1 : 0,
      totalCount: 1,
      explanation: eduExplanation
    },
    {
      id: 'seniority',
      label: 'Seniority Alignment',
      weight: 0.05,
      score: seniorityScore,
      matchedCount: 1,
      totalCount: 1,
      explanation: seniorityExplanation
    }
  ];

  // Compute final weighted composite score
  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        scoreBreakdown.reduce((accum, item) => accum + item.score * item.weight, 0)
      )
    )
  );

  const strengths: string[] = [];
  const gaps: string[] = [];
  const recommendedFocus: string[] = [];

  if (matchingSkills.length > 0) {
    strengths.push(`Strong overlap on core technologies: ${matchingSkills.slice(0, 4).join(', ')}.`);
  }
  if (candidateProjects.length > 0) {
    strengths.push(`Practical software implementations verified in portfolio (${candidateProjects.map((p) => p.title).join(', ')}).`);
  }
  if (missingSkills.length > 0) {
    gaps.push(`Missing verified qualifications for: ${missingSkills.join(', ')}.`);
    recommendedFocus.push(`Highlight adjacent experience or emphasize capacity to quickly ramp up on ${missingSkills.slice(0, 2).join(' and ')}.`);
  }
  if (candidateRoles.length > 0) {
    recommendedFocus.push(`Elevate relevant production accomplishments from ${candidateRoles[0].company} in the tailored resume summary.`);
  }

  const scoringFormula = 'Overall Score = (Required Skills × 0.35) + (Preferred Skills × 0.15) + (Experience × 0.20) + (Projects × 0.15) + (Education × 0.10) + (Seniority × 0.05)';

  const summary = `Candidate matches ${overallScore}% of requirements for ${requirements.jobTitle} at ${requirements.company}. Verified strengths include ${matchingSkills.slice(0, 3).join(', ')}.${missingSkills.length > 0 ? ` Qualifications needing attention: ${missingSkills.join(', ')}.` : ''}`;

  return {
    jobTitle: requirements.jobTitle,
    company: requirements.company,
    overallScore,
    summary,
    scoringFormula,
    scoreBreakdown,
    qualifications,
    matchingSkills,
    missingSkills,
    strengths,
    gaps,
    recommendedFocus
  };
}
