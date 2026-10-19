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
  minYearsExperience: number;
  educationRequirements: string[];
}

export interface MatchingEngineOptions {
  isVerified?: boolean;
}

/**
 * Normalizes text for case-insensitive matching.
 */
function clean(str: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Checks if a candidate skill or text matches a target skill, supporting tech synonyms.
 */
function isSkillMatch(candidateSkill: string, targetSkill: string): boolean {
  const c = clean(candidateSkill);
  const t = clean(targetSkill);

  if (!c || !t) return false;
  if (c === t || c.includes(t) || t.includes(c)) return true;

  // Synonyms and aliases
  const synonyms: Record<string, string[]> = {
    'react': ['react.js', 'reactjs'],
    'node.js': ['node', 'nodejs'],
    'typescript': ['ts'],
    'javascript': ['js', 'es6', 'es6+'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'golang': ['go'],
    'kubernetes': ['k8s'],
    'docker': ['containerization', 'containers'],
    'amazon web services': ['aws'],
    'google cloud platform': ['gcp', 'google cloud'],
    'ci/cd': ['continuous integration', 'github actions', 'jenkins', 'pipelines'],
    'rest': ['restful', 'rest api', 'rest apis', 'api integration'],
    'performance': ['web performance', 'performance optimization', 'core web vitals', 'lighthouse', 'speed optimization', 'latency'],
    'cross-browser': ['cross-browser compatibility', 'cross browser', 'browser compatibility', 'cross-platform web'],
    'responsive': ['responsive design', 'responsive web', 'mobile-first', 'adaptive design'],
    'state management': ['redux', 'zustand', 'recoil', 'mobx', 'context api'],
    'testing': ['automated testing', 'unit testing', 'jest', 'cypress', 'playwright', 'e2e testing']
  };

  for (const [canonical, aliases] of Object.entries(synonyms)) {
    const family = [canonical, ...aliases];
    const cMatches = family.some((f) => c === f || c.includes(f));
    const tMatches = family.some((f) => t === f || t.includes(f));
    if (cMatches && tMatches) {
      return true;
    }
  }

  return false;
}

interface DomainCompetencyDef {
  label: string;
  testRegex: RegExp;
  evidenceKeywords: RegExp;
}

const DOMAIN_COMPETENCIES: DomainCompetencyDef[] = [
  {
    label: 'Cross-Browser Compatibility',
    testRegex: /cross[\s-]browser(?:[\s-]compatibility)?|browser\s+compatibility|different\s+browsers|rendering\s+engines/i,
    evidenceKeywords: /cross[\s-]browser|safari|firefox|webkit|browser\s+compatibility|rendering\s+engine|can-i-use|browser\s+quirk/i
  },
  {
    label: 'Frontend Performance Optimization',
    testRegex: /(?:frontend|web)?\s*performance(?:\s+optimization)?|speed\s+and\s+scalability|load\s+times|latency|core\s+web\s+vitals/i,
    evidenceKeywords: /performance|load\s+time|bundle\s+size|core\s+web\s+vitals|latency|lighthouse|profiling|code\s+splitting|lazy\s+load|caching|asset\s+optimiz/i
  },
  {
    label: 'Responsive Design',
    testRegex: /responsive(?:\s+web)?(?:\s+design)?|mobile[\s-]first|fluid\s+layouts|device\s+viewports/i,
    evidenceKeywords: /responsive|mobile[\s-]first|media\s+quer(?:y|ies)|adaptive|fluid|viewport|flexbox|grid|tailwind/i
  },
  {
    label: 'REST APIs',
    testRegex: /rest(?:ful)?\s+apis?|api\s+integration|client[\s-]server\s+communication/i,
    evidenceKeywords: /rest(?:ful)?|api\s+integration|endpoints|axios|fetch|async|http/i
  },
  {
    label: 'State Management',
    testRegex: /state\s+management|redux|zustand|context\s+api|recoil/i,
    evidenceKeywords: /state\s+management|redux|zustand|context\s+api|recoil|mobx|flux/i
  },
  {
    label: 'Automated Testing',
    testRegex: /automated\s+(?:unit\s+)?testing|unit\s+testing|e2e\s+testing|jest|cypress|playwright|testing\s+libraries/i,
    evidenceKeywords: /test|testing|jest|cypress|playwright|vitest|react\s+testing\s+library|unit\s+test|e2e/i
  }
];

/**
 * Rule-based requirement parser from raw Job Description text.
 */
export function extractRequirementsFromText(
  jobText: string,
  jobTitleOverride?: string,
  companyOverride?: string
): ExtractedJobRequirements {
  const text = jobText || '';
  const lower = text.toLowerCase();

  // 1. Role / Title
  let jobTitle = jobTitleOverride || '';
  if (!jobTitle) {
    if (/staff\s*platform\s*engineer/i.test(text)) jobTitle = 'Staff Platform Engineer';
    else if (/software\s*engineer,\s*web|frontend\s*(?:software\s*)?engineer|frontend\s*developer/i.test(text)) jobTitle = 'Frontend Engineer';
    else if (/backend\s*(?:software\s*)?engineer/i.test(text)) jobTitle = 'Backend Engineer';
    else if (/full\s*stack\s*(?:developer|engineer)/i.test(text)) jobTitle = 'Full Stack Developer';
    else if (/blockchain\s*developer/i.test(text) || /web3\s*engineer/i.test(text)) jobTitle = 'Blockchain Developer';
    else if (/devops\s*engineer/i.test(text) || /cloud\s*engineer/i.test(text)) jobTitle = 'DevOps / Cloud Engineer';
    else if (/intern/i.test(text)) jobTitle = 'Software Engineer Intern';
    else jobTitle = 'Software Engineer';
  }

  // 2. Company
  let company = companyOverride || '';
  if (!company) {
    const explicitMatch = text.match(/(?:company|organization|employer):\s*([A-Za-z0-9&.\- ]+)/i);
    if (explicitMatch && explicitMatch[1].trim()) {
      company = explicitMatch[1].trim();
    } else {
      const compMatch = text.match(/(?:at|join)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)/);
      company = compMatch ? compMatch[1] : 'Hiring Company';
    }
  }

  // 3. Seniority
  let seniority: ExtractedJobRequirements['seniority'] = 'Mid';
  if (/\bintern(?:ship)?\b/i.test(lower)) seniority = 'Intern';
  else if (/\b(?:junior|entry[\s-]level|associate|graduate)\b|0-2\s*years/i.test(lower)) seniority = 'Junior';
  else if (/\b(?:lead|staff|principal|architect)\b/i.test(lower)) seniority = 'Lead';
  else if (/\b(?:senior|sr\.?)\b|[5-9]\+\s*years/i.test(lower)) seniority = 'Senior';

  // 4. Split Required vs Preferred sections
  const preferredIndex = lower.search(/(?:nice to have|preferred|bonus|plus|good to have|preferred qualifications)/);
  const reqPart = preferredIndex !== -1 ? lower.slice(0, preferredIndex) : lower;
  const prefPart = preferredIndex !== -1 ? lower.slice(preferredIndex) : '';

  const knownTech: Array<{ name: string; label: string; regex: RegExp }> = [
    { name: 'react', label: 'React', regex: /(?:^|[^a-zA-Z0-9+#])react(?:\.js|js)?(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'typescript', label: 'TypeScript', regex: /(?:^|[^a-zA-Z0-9+#])typescript(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'javascript', label: 'JavaScript', regex: /(?:^|[^a-zA-Z0-9+#])javascript(?:\s*\(es6\+\))?|es6\+?(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'html5_css3', label: 'HTML5 & CSS3', regex: /html5|css3|modern\s+css|html\s+and\s+css/i },
    { name: 'next.js', label: 'Next.js', regex: /(?:^|[^a-zA-Z0-9+#])next(?:\.js|js)?(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'node.js', label: 'Node.js', regex: /(?:^|[^a-zA-Z0-9+#])node(?:\.js|js)?(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'tailwind css', label: 'Tailwind CSS', regex: /tailwind(?:\s+css)?/i },
    { name: 'websockets', label: 'WebSockets', regex: /websockets?/i },
    { name: 'postgresql', label: 'PostgreSQL', regex: /postgres(?:ql)?/i },
    { name: 'docker', label: 'Docker', regex: /docker/i },
    { name: 'kubernetes', label: 'Kubernetes', regex: /kubernetes|k8s/i },
    { name: 'aws', label: 'AWS', regex: /\baws\b|amazon\s+web\s+services/i },
    { name: 'graphql', label: 'GraphQL', regex: /graphql/i },
    { name: 'c++', label: 'C++', regex: /(?:^|[^a-zA-Z0-9+#])c\+\+(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'golang', label: 'Go', regex: /(?:^|[^a-zA-Z0-9+#])(?:golang|go)(?:$|[^a-zA-Z0-9+#])/i },
    { name: 'python', label: 'Python', regex: /python/i }
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  for (const tech of knownTech) {
    if (tech.regex.test(reqPart)) {
      if (!requiredSkills.includes(tech.label)) requiredSkills.push(tech.label);
    } else if (prefPart && tech.regex.test(prefPart)) {
      if (!preferredSkills.includes(tech.label)) preferredSkills.push(tech.label);
    }
  }

  // Extract domain competencies (Performance, Cross-browser, Responsive, etc.)
  for (const comp of DOMAIN_COMPETENCIES) {
    if (comp.testRegex.test(reqPart)) {
      if (!requiredSkills.includes(comp.label)) requiredSkills.push(comp.label);
    } else if (prefPart && comp.testRegex.test(prefPart)) {
      if (!preferredSkills.includes(comp.label)) preferredSkills.push(comp.label);
    }
  }

  // Fallbacks if no explicit tech matched
  if (requiredSkills.length === 0) {
    requiredSkills.push('React', 'TypeScript', 'JavaScript');
  }

  // 5. Min years of experience
  let minYearsExperience = 0;
  const expMatch = lower.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*years?(?:\s+of)?(?:\s+[a-z-]+)*\s+experience/i);
  if (expMatch) {
    minYearsExperience = parseInt(expMatch[1], 10);
  } else if (seniority === 'Senior') {
    minYearsExperience = 5;
  } else if (seniority === 'Mid') {
    minYearsExperience = 2;
  } else if (seniority === 'Junior') {
    minYearsExperience = 1;
  }

  // 6. Education requirements
  const educationRequirements: string[] = [];
  if (/bachelor|master|degree\s+in\s+cs|computer\s+science|engineering/i.test(lower)) {
    educationRequirements.push('Bachelor’s or Master’s degree in Computer Science, Engineering, or related technical discipline');
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
 * Parses year and month from diverse date formats:
 * - YYYY-MM or YYYY-MM-DD
 * - YYYY
 * - "Month YYYY" (e.g. "July 2022")
 * - MM/YYYY
 */
export function parseYearMonth(dateStr?: string | null): { year: number; month: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  if (!s || /^(present|current|ongoing|now)$/i.test(s)) return null;

  // Match YYYY-MM or YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) };
  }

  // Match YYYY only
  const yearMatch = s.match(/^(\d{4})$/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[1], 10), month: 1 };
  }

  // Match "Month YYYY" or "Mon YYYY"
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const textMatch = s.match(/([a-zA-Z]+)[\s,]+(\d{4})/);
  if (textMatch) {
    const mStr = textMatch[1].slice(0, 3).toLowerCase();
    const mIdx = monthNames.indexOf(mStr);
    const month = mIdx !== -1 ? mIdx + 1 : 1;
    return { year: parseInt(textMatch[2], 10), month };
  }

  // Match MM/YYYY
  const mmyyyy = s.match(/^(\d{1,2})[-/](\d{4})/);
  if (mmyyyy) {
    return { year: parseInt(mmyyyy[2], 10), month: parseInt(mmyyyy[1], 10) };
  }

  return null;
}

export interface ExperienceDurationResult {
  totalMonths: number;
  totalYears: number;
  hasSupportedDates: boolean;
  unverifiedRolesCount: number;
  explanation: string;
}

/**
 * Calculates total professional experience strictly from supported employment dates.
 * Merges overlapping intervals to prevent double counting.
 */
export function calculateExperienceDuration(experience: any[]): ExperienceDurationResult {
  if (!Array.isArray(experience) || experience.length === 0) {
    return {
      totalMonths: 0,
      totalYears: 0,
      hasSupportedDates: false,
      unverifiedRolesCount: 0,
      explanation: 'No professional experience entries provided in profile.'
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let totalMonths = 0;
  let unverifiedCount = 0;
  const verifiedIntervals: Array<{ start: number; end: number }> = [];

  for (const role of experience) {
    const start = parseYearMonth(role.startDate);
    if (!start) {
      unverifiedCount++;
      continue;
    }

    let end = parseYearMonth(role.endDate);
    if (!end) {
      if (role.current || !role.endDate || /present|current|now/i.test(String(role.endDate))) {
        end = { year: currentYear, month: currentMonth };
      } else {
        unverifiedCount++;
        continue;
      }
    }

    const startIdx = start.year * 12 + (start.month - 1);
    const endIdx = end.year * 12 + (end.month - 1);

    if (endIdx >= startIdx) {
      verifiedIntervals.push({ start: startIdx, end: endIdx });
    } else {
      unverifiedCount++;
    }
  }

  if (verifiedIntervals.length === 0) {
    return {
      totalMonths: 0,
      totalYears: 0,
      hasSupportedDates: false,
      unverifiedRolesCount: experience.length,
      explanation: `Candidate has ${experience.length} listed role(s), but none contain valid, supported employment dates.`
    };
  }

  // Merge overlapping intervals to prevent double-counting
  verifiedIntervals.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of verifiedIntervals) {
    if (merged.length === 0) {
      merged.push({ ...interval });
    } else {
      const last = merged[merged.length - 1];
      if (interval.start <= last.end) {
        last.end = Math.max(last.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }
  }

  for (const interval of merged) {
    totalMonths += (interval.end - interval.start + 1);
  }

  const totalYears = Number((totalMonths / 12).toFixed(1));

  let explanation = `Supported employment dates confirm ${totalYears} year(s) (${totalMonths} months) of professional experience.`;
  if (unverifiedCount > 0) {
    explanation += ` (${unverifiedCount} role(s) omitted due to missing or invalid employment dates).`;
  }

  return {
    totalMonths,
    totalYears,
    hasSupportedDates: true,
    unverifiedRolesCount: unverifiedCount,
    explanation
  };
}

/**
 * Searches candidate profile for evidence of a specific required competency.
 */
function evaluateRequirementEvidence(
  reqName: string,
  allCandidateSkills: string[],
  profile: UserProfile,
  isVerified: boolean
): { status: MatchQualificationStatus; evidence: string; sourceIds?: string[] } {
  const reqLower = clean(reqName);
  const provenanceLabel = isVerified ? 'Verified' : 'Reported';

  // 1. Check if it's a domain competency with special evidence regex
  const domainComp = DOMAIN_COMPETENCIES.find((dc) => clean(dc.label) === reqLower || isSkillMatch(dc.label, reqName));
  const evidenceRegex = domainComp ? domainComp.evidenceKeywords : null;

  // Search experience responsibilities & bullets for concrete demonstration
  const matchingExp: any[] = [];
  if (profile.experience) {
    for (const exp of profile.experience) {
      const hasTechMatch = exp.technologies?.some((t: string) => isSkillMatch(t, reqName));
      const hasBulletMatch = exp.responsibilities?.some((r: string) =>
        evidenceRegex ? evidenceRegex.test(r) : clean(r).includes(reqLower)
      );

      if (hasBulletMatch || hasTechMatch) {
        matchingExp.push({ exp, hasBulletMatch });
      }
    }
  }

  // Search project descriptions, features, and tech
  const matchingProj: any[] = [];
  if (profile.projects) {
    for (const proj of profile.projects) {
      const hasTechMatch = proj.technologies?.some((t: string) => isSkillMatch(t, reqName));
      const hasDescMatch = evidenceRegex
        ? evidenceRegex.test(proj.description || '') || proj.features?.some((f: string) => evidenceRegex.test(f))
        : clean(proj.description || '').includes(reqLower);

      if (hasDescMatch || hasTechMatch) {
        matchingProj.push({ proj, hasDescMatch });
      }
    }
  }

  // Check direct skills inventory
  const directSkillMatch = allCandidateSkills.find((cs) => isSkillMatch(cs, reqName));

  // Determine qualification status based on actual evidence
  if (matchingExp.some((m) => m.hasBulletMatch)) {
    const primary = matchingExp.find((m) => m.hasBulletMatch).exp;
    const bullet = primary.responsibilities.find((r: string) => evidenceRegex ? evidenceRegex.test(r) : clean(r).includes(reqLower));
    return {
      status: 'SUPPORTED',
      evidence: `${provenanceLabel} in work experience at ${primary.company}: "${bullet.length > 90 ? bullet.slice(0, 87) + '...' : bullet}".`,
      sourceIds: [primary.id]
    };
  }

  if (matchingProj.some((m) => m.hasDescMatch)) {
    const primary = matchingProj.find((m) => m.hasDescMatch).proj;
    return {
      status: 'SUPPORTED',
      evidence: `${provenanceLabel} in portfolio project ${primary.title}: practical implementation demonstrated.`,
      sourceIds: [primary.id]
    };
  }

  if (matchingExp.length > 0) {
    const primary = matchingExp[0].exp;
    return {
      status: 'SUPPORTED',
      evidence: `${provenanceLabel} technology utilized at ${primary.company} (${primary.title}).`,
      sourceIds: [primary.id]
    };
  }

  if (matchingProj.length > 0) {
    const primary = matchingProj[0].proj;
    return {
      status: 'SUPPORTED',
      evidence: `${provenanceLabel} in ${primary.title} project stack (${primary.technologies.slice(0, 3).join(', ')}).`,
      sourceIds: [primary.id]
    };
  }

  if (directSkillMatch) {
    return {
      status: 'PARTIAL',
      evidence: `Listed in profile skills inventory (${directSkillMatch}), but no concrete implementation cited in role responsibilities or project descriptions.`
    };
  }

  // No evidence found anywhere
  return {
    status: 'MISSING',
    evidence: `No evidence of ${reqName} found in candidate profile skills, experience accomplishments, or projects.`
  };
}

/**
 * Calculates a mathematically transparent compatibility match analysis
 * between an extracted job description and a candidate profile.
 * Accurately calculates verified duration from employment dates and
 * rejects unevidenced competencies.
 */
export function computeJobMatchAnalysis(
  requirements: ExtractedJobRequirements,
  profile: UserProfile,
  options?: MatchingEngineOptions
): JobMatchAnalysis {
  const isVerified = Boolean(options?.isVerified);
  const provenancePrefix = isVerified ? 'Verified' : 'Reported';

  // Collect all candidate skills
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

  // 1. Evaluate Required Skills & Competencies (Weight: 35%)
  let reqPoints = 0;
  let reqMatchedCount = 0;

  for (const reqSkill of requirements.requiredSkills) {
    const evalResult = evaluateRequirementEvidence(reqSkill, allCandidateSkills, profile, isVerified);

    if (evalResult.status === 'SUPPORTED') {
      reqPoints += 1.0;
      reqMatchedCount++;
      matchingSkills.push(reqSkill);
    } else if (evalResult.status === 'PARTIAL') {
      reqPoints += 0.6;
      reqMatchedCount++;
      matchingSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }

    qualifications.push({
      name: reqSkill,
      type: 'skill',
      status: evalResult.status,
      required: true,
      evidence: evalResult.evidence,
      sourceIds: evalResult.sourceIds
    });
  }

  const reqTotal = Math.max(1, requirements.requiredSkills.length);
  const requiredSkillsScore = Math.min(100, Math.round((reqPoints / reqTotal) * 100));

  // 2. Evaluate Preferred Skills (Weight: 15%)
  let prefPoints = 0;
  let prefMatchedCount = 0;

  for (const prefSkill of requirements.preferredSkills) {
    const evalResult = evaluateRequirementEvidence(prefSkill, allCandidateSkills, profile, isVerified);

    if (evalResult.status === 'SUPPORTED') {
      prefPoints += 1.0;
      prefMatchedCount++;
      if (!matchingSkills.includes(prefSkill)) matchingSkills.push(prefSkill);
    } else if (evalResult.status === 'PARTIAL') {
      prefPoints += 0.6;
      prefMatchedCount++;
      if (!matchingSkills.includes(prefSkill)) matchingSkills.push(prefSkill);
    }

    qualifications.push({
      name: prefSkill,
      type: 'skill',
      status: evalResult.status,
      required: false,
      evidence: evalResult.evidence,
      sourceIds: evalResult.sourceIds
    });
  }

  const prefTotal = Math.max(1, requirements.preferredSkills.length);
  const preferredSkillsScore =
    requirements.preferredSkills.length === 0 ? 100 : Math.min(100, Math.round((prefPoints / prefTotal) * 100));

  // 3. Evaluate Experience Depth & Verified Duration (Weight: 20%)
  const candidateRoles = profile.experience || [];
  const durationResult = calculateExperienceDuration(candidateRoles);

  let experienceScore = 0;
  let expStatus: MatchQualificationStatus = 'MISSING';
  let expExplanation = '';

  if (candidateRoles.length === 0) {
    experienceScore = 0;
    expStatus = 'MISSING';
    expExplanation = 'No professional experience entries provided in candidate profile.';
    qualifications.push({
      name: 'Professional Work Experience',
      type: 'experience',
      status: 'MISSING',
      required: true,
      evidence: 'No professional experience records in profile.'
    });
  } else if (!durationResult.hasSupportedDates) {
    // Roles listed, but NO verifiable employment dates!
    experienceScore = 30; // Max baseline for having role titles without dates
    expStatus = 'UNVERIFIED';
    expExplanation = `Candidate lists ${candidateRoles.length} role(s), but employment duration cannot be verified because start/end dates are missing or invalid.`;
    qualifications.push({
      name: `Years of Experience (${requirements.minYearsExperience > 0 ? `${requirements.minYearsExperience}+ Years Required` : 'Verifiable Duration'})`,
      type: 'experience',
      status: 'UNVERIFIED',
      required: true,
      evidence: durationResult.explanation
    });
  } else {
    // Valid dates present! Compare against requirements.minYearsExperience
    const reqYears = requirements.minYearsExperience;
    const verifiedYears = durationResult.totalYears;

    const hasRelevantRoleTitle = candidateRoles.some(
      (r: any) =>
        clean(r.title).includes(clean(requirements.jobTitle)) ||
        clean(requirements.jobTitle).includes(clean(r.title)) ||
        (clean(requirements.jobTitle).includes('engineer') && clean(r.title).includes('engineer'))
    );

    if (reqYears === 0 || verifiedYears >= reqYears) {
      experienceScore = hasRelevantRoleTitle ? 100 : 85;
      expStatus = 'SUPPORTED';
      expExplanation = `${durationResult.explanation} Fully satisfies required ${reqYears > 0 ? `${reqYears}+ years` : 'experience'}.`;
    } else {
      // Proportional score for verified duration
      const durationRatio = verifiedYears / Math.max(1, reqYears);
      experienceScore = Math.max(25, Math.min(85, Math.round(durationRatio * 80)));
      expStatus = 'PARTIAL';
      expExplanation = `${durationResult.explanation} Falls short of the required ${reqYears}+ years.`;
    }

    qualifications.push({
      name: `Experience Duration (${reqYears > 0 ? `${reqYears}+ Years Required` : 'Professional Experience'})`,
      type: 'experience',
      status: expStatus,
      required: true,
      evidence: expExplanation,
      sourceIds: candidateRoles.map((r: any) => r.id).filter(Boolean)
    });
  }

  // 4. Evaluate Demonstrated Projects (Weight: 15%)
  const candidateProjects = profile.projects || [];
  let projectsScore = 0;
  let projExplanation = '';

  if (candidateProjects.length === 0) {
    projectsScore = 0;
    projExplanation = 'No portfolio projects provided in candidate profile.';
  } else {
    // Count projects utilizing any matching required or preferred tech/competency
    const relevantProjects = candidateProjects.filter((p: any) =>
      p.technologies?.some((t: string) =>
        requirements.requiredSkills.some((rs) => isSkillMatch(t, rs)) ||
        requirements.preferredSkills.some((ps) => isSkillMatch(t, ps))
      )
    );

    if (relevantProjects.length >= 2) {
      projectsScore = 100;
      projExplanation = `Multiple projects (${relevantProjects.map((p: any) => p.title).join(', ')}) demonstrate application of required technologies.`;
      relevantProjects.forEach((p: any) => {
        qualifications.push({
          name: `${p.title} Project`,
          type: 'project',
          status: 'SUPPORTED',
          required: false,
          evidence: `${provenancePrefix} in ${p.title} (${p.technologies?.slice(0, 3).join(', ')}).`,
          sourceIds: [p.id]
        });
      });
    } else if (relevantProjects.length === 1) {
      projectsScore = 70;
      projExplanation = `Project ${relevantProjects[0].title} demonstrates practical implementation of required technologies.`;
      qualifications.push({
        name: `${relevantProjects[0].title} Project`,
        type: 'project',
        status: 'SUPPORTED',
        required: false,
        evidence: `${provenancePrefix} in ${relevantProjects[0].title} (${relevantProjects[0].technologies?.slice(0, 3).join(', ')}).`,
        sourceIds: [relevantProjects[0].id]
      });
    } else {
      projectsScore = 30;
      projExplanation = `Candidate lists ${candidateProjects.length} project(s), but none actively cite required role technologies.`;
    }
  }

  // 5. Evaluate Education Fit (Weight: 10%)
  const educationList = profile.education || [];
  let educationScore = 100;
  let eduExplanation = '';

  if (requirements.educationRequirements.length === 0) {
    educationScore = 100;
    eduExplanation = 'No strict degree prerequisites specified in job description.';
  } else if (educationList.length === 0) {
    educationScore = 0;
    eduExplanation = 'No education credentials listed in candidate profile.';
    qualifications.push({
      name: 'Degree Prerequisite',
      type: 'education',
      status: 'MISSING',
      required: true,
      evidence: 'Degree credentials not listed in profile.'
    });
  } else {
    const topEdu = educationList[0];
    const degreeText = clean(topEdu.degree);
    const branchText = clean(topEdu.branch || '');

    const degreeMatches = /bachelor|master|mca|b\.?tech|b\.?e\.?|bs|ms/i.test(degreeText);
    const branchMatches = /computer|software|information\s+technology|it|engineering|science/i.test(branchText);

    if (degreeMatches && branchMatches) {
      educationScore = 100;
      eduExplanation = `${provenancePrefix} ${topEdu.degree} in ${topEdu.branch} from ${topEdu.university} satisfies the technical degree requirement.`;
      qualifications.push({
        name: `${topEdu.degree}`,
        type: 'education',
        status: 'SUPPORTED',
        required: true,
        evidence: `${provenancePrefix} degree conferred by ${topEdu.university} (${topEdu.branch}).`,
        sourceIds: [topEdu.id]
      });
    } else if (degreeMatches && !branchMatches) {
      educationScore = 50;
      eduExplanation = `${topEdu.degree} from ${topEdu.university} does not confirm required Computer Science / technical specialization (branch: ${topEdu.branch || 'unspecified'}).`;
      qualifications.push({
        name: `${topEdu.degree}`,
        type: 'education',
        status: 'PARTIAL',
        required: true,
        evidence: `Degree branch (${topEdu.branch || 'unspecified'}) does not explicitly match Computer Science or Engineering requirement.`,
        sourceIds: [topEdu.id]
      });
    } else {
      educationScore = 20;
      eduExplanation = `Reported education (${topEdu.degree || 'Degree'}) does not meet technical degree prerequisites.`;
      qualifications.push({
        name: `${topEdu.degree || 'Degree'}`,
        type: 'education',
        status: 'MISSING',
        required: true,
        evidence: `Degree does not satisfy technical degree requirements.`,
        sourceIds: [topEdu.id]
      });
    }
  }

  // 6. Seniority Alignment (Weight: 5%)
  let seniorityScore = 70;
  let seniorityExplanation = '';
  if (requirements.seniority === 'Junior') {
    seniorityScore = 95;
    seniorityExplanation = 'Role level (Junior / Entry-Level) is well-suited to candidate profile.';
  } else if (requirements.seniority === 'Mid') {
    seniorityScore = durationResult.totalYears >= 1 ? 90 : 60;
    seniorityExplanation = `Role seniority (Mid) aligns with candidate career trajectory (${durationResult.totalYears} verified years).`;
  } else if (requirements.seniority === 'Senior') {
    seniorityScore = durationResult.totalYears >= 5 ? 100 : durationResult.totalYears >= 3 ? 75 : 50;
    seniorityExplanation = `Role seniority (Senior) requires 5+ years; candidate demonstrates ${durationResult.totalYears} verified years.`;
  } else {
    seniorityScore = 80;
    seniorityExplanation = `Seniority fit matches candidate software engineering background.`;
  }

  const scoreBreakdown: MatchScoreCategory[] = [
    {
      id: 'requiredSkills',
      label: 'Required Core Skills',
      weight: 0.35,
      score: requiredSkillsScore,
      matchedCount: reqMatchedCount,
      totalCount: reqTotal,
      explanation: `${reqMatchedCount} of ${reqTotal} mandatory qualifications evidenced in profile (${requiredSkillsScore}%).`
    },
    {
      id: 'preferredSkills',
      label: 'Preferred / Bonus Skills',
      weight: 0.15,
      score: preferredSkillsScore,
      matchedCount: prefMatchedCount,
      totalCount: prefTotal,
      explanation: `${prefMatchedCount} of ${prefTotal} preferred bonus qualifications demonstrated (${preferredSkillsScore}%).`
    },
    {
      id: 'experience',
      label: 'Experience & Domain Relevance',
      weight: 0.20,
      score: experienceScore,
      matchedCount: expStatus === 'SUPPORTED' ? 1 : 0,
      totalCount: 1,
      explanation: expExplanation
    },
    {
      id: 'projects',
      label: 'Demonstrated Projects',
      weight: 0.15,
      score: projectsScore,
      matchedCount: Math.min(candidateProjects.length, 2),
      totalCount: 2,
      explanation: projExplanation
    },
    {
      id: 'education',
      label: 'Education & Degree Fit',
      weight: 0.10,
      score: educationScore,
      matchedCount: educationScore >= 80 ? 1 : 0,
      totalCount: 1,
      explanation: eduExplanation
    },
    {
      id: 'seniority',
      label: 'Seniority Alignment',
      weight: 0.05,
      score: seniorityScore,
      matchedCount: seniorityScore >= 70 ? 1 : 0,
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
    strengths.push(`Evidenced core competencies: ${matchingSkills.slice(0, 4).join(', ')}.`);
  }
  if (candidateProjects.length > 0) {
    strengths.push(`Portfolio projects demonstrate practical implementation (${candidateProjects.map((p: any) => p.title).join(', ')}).`);
  }
  if (missingSkills.length > 0) {
    gaps.push(`Missing verified qualifications for: ${missingSkills.join(', ')}.`);
    recommendedFocus.push(`Add concrete achievements or project demonstrations for ${missingSkills.slice(0, 2).join(' and ')}.`);
  }
  if (!durationResult.hasSupportedDates) {
    gaps.push('Experience records lack verifiable start and end dates.');
    recommendedFocus.push('Add employment start and end dates to enable verified experience duration scoring.');
  } else if (requirements.minYearsExperience > 0 && durationResult.totalYears < requirements.minYearsExperience) {
    gaps.push(`Verified experience (${durationResult.totalYears} yrs) is less than stated requirement (${requirements.minYearsExperience}+ yrs).`);
  }

  const scoringFormula = 'Overall Score = (Required Skills × 0.35) + (Preferred Skills × 0.15) + (Experience × 0.20) + (Projects × 0.15) + (Education × 0.10) + (Seniority × 0.05)';

  const summary = `Candidate matches ${overallScore}% of requirements for ${requirements.jobTitle} at ${requirements.company}.${strengths.length > 0 ? ` ${strengths[0]}` : ''}${gaps.length > 0 ? ` Attention needed: ${gaps[0]}` : ''}`;

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
