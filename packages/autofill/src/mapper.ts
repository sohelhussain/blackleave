import {
  DetectedField,
  UserProfile,
  FieldCategory,
  ConfidenceLevel,
  FieldSource
} from '@applyflow/types';

export const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'given name', 'forename', 'fname', 'first_name', 'candidate_first_name'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'lname', 'last_name', 'candidate_last_name'],
  fullName: ['full name', 'legal name', 'candidate name', 'your name', 'name'],
  email: ['email', 'email address', 'e-mail', 'electronic mail'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'contact number', 'cell'],
  city: ['city', 'current city', 'town'],
  state: ['state', 'province', 'region'],
  country: ['country', 'nation'],
  pincode: ['zip', 'zip code', 'postal code', 'pincode', 'pin code'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link'],
  github: ['github', 'github url', 'github profile', 'github link'],
  portfolio: ['portfolio', 'portfolio url', 'personal website', 'website', 'personal url', 'portfolio link'],
  degree: ['degree', 'highest degree', 'highest education', 'degree level', 'education level', 'course name'],
  branch: ['major', 'branch', 'field of study', 'discipline', 'area of study'],
  university: ['university', 'school', 'college', 'institution', 'university name', 'college name'],
  graduationYear: ['graduation year', 'expected graduation', 'completion year', 'end year', 'year of graduation'],
  cgpa: ['cgpa', 'gpa', 'grade point average'],
  noticePeriod: ['notice period', 'availability', 'available to start', 'how soon can you start'],
  willingToRelocate: ['willing to relocate', 'open to relocation', 'relocation', 'comfort with the job location'],
  usAuthorized: ['authorized to work in the united states', 'legally authorized to work in us', 'us work authorization', 'eligible to work in us'],
  usSponsorshipRequired: ['require visa sponsorship', 'need sponsorship', 'will you require sponsorship', 'visa sponsorship'],
  indiaAuthorized: ['authorized to work in india', 'work authorization india', 'eligible to work in india']
};

/**
 * Normalizes option text handling case, unicode dashes, slashes, punctuation,
 * and collapsing whitespace.
 */
export function normalizeOptionText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-') // Unicode hyphens/en-dash/em-dash to '-'
    .replace(/\s*-\s*/g, '-') // collapse spaces around hyphens e.g. "8 - 8.99" -> "8-8.99"
    .replace(/\s*\/\s*/g, '/') // collapse spaces around slashes e.g. "BE / B.Tech" -> "be/b.tech"
    .replace(/[:*.]/g, '') // strip colons, asterisks, dots
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches candidate's verified degree against multiple-choice options.
 * Returns null if no option matches (never assumes BE/B.Tech, MBA or Other).
 */
export function matchCandidateDegreeToOption(
  options: Array<{ label: string; value: string }>,
  profile: UserProfile
): { label: string; value: string } | null {
  const candidateDegrees = (profile.education || []).map((e) => `${e.degree} ${e.branch || ''}`.trim());
  if (candidateDegrees.length === 0) return null;

  for (const deg of candidateDegrees) {
    const normDeg = normalizeOptionText(deg);

    for (const opt of options) {
      const normOpt = normalizeOptionText(opt.label);
      if (normOpt === 'other') continue; // Never auto-match "Other"

      // 1. BE / B.Tech (excluding dual degree or MBA)
      if (
        (normOpt.includes('btech') || normOpt.includes('be') || normOpt.includes('bachelor of technology') || normOpt.includes('bachelor of engineering')) &&
        !normOpt.includes('mba')
      ) {
        if (/b\.?tech|b\.?e\b|bachelor\s*of\s*(?:engineering|technology)/i.test(deg) && !/b\.?pharma/i.test(deg)) {
          return opt;
        }
      }

      // 2. MBA (excluding dual degree)
      if (normOpt.includes('mba') && !normOpt.includes('btech') && !normOpt.includes('be')) {
        if (/\bmba\b|master\s*of\s*business\s*administration/i.test(deg)) {
          return opt;
        }
      }

      // 3. BE/B.Tech + MBA (Dual degree)
      if (
        (normOpt.includes('btech') || normOpt.includes('be')) &&
        normOpt.includes('mba')
      ) {
        if (/(?:b\.?tech|be).*?(?:mba)|dual\s*degree/i.test(deg)) {
          return opt;
        }
      }

      // 4. MCA
      if (normOpt.includes('mca') || normOpt.includes('master of computer applications')) {
        if (/\bmca\b|master\s*of\s*computer\s*applications/i.test(deg)) {
          return opt;
        }
      }

      // 5. BCA
      if (normOpt.includes('bca') || normOpt.includes('bachelor of computer applications')) {
        if (/\bbca\b|bachelor\s*of\s*computer\s*applications/i.test(deg)) {
          return opt;
        }
      }

      // 6. Pharmacy / B.Pharma
      if (normOpt.includes('pharma') || normOpt.includes('pharmacy')) {
        if (/pharma|pharmacy/i.test(deg)) {
          return opt;
        }
      }

      // 7. Exact or high-confidence substring match (non-other)
      if (normOpt === normDeg || (normOpt.length > 3 && normDeg.includes(normOpt))) {
        return opt;
      }
    }
  }

  return null;
}

/**
 * Matches numeric CGPA to option range (e.g. 8 matches 8–8.99).
 */
export function matchCgpaToOption(
  options: Array<{ label: string; value: string }>,
  cgpa: number
): { label: string; value: string } | null {
  for (const opt of options) {
    const raw = opt.label;

    // Range: "9–10", "8–8.99", "7–7.99", "9-10", "8 - 8.99", "9 to 10"
    const rangeMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      if (cgpa >= min && cgpa <= max) {
        return opt;
      }
    }

    // Below: "Below 7", "< 7", "Under 7", "Less than 7"
    const belowMatch = raw.match(/(?:below|<|under|less\s*than)\s*(\d+(?:\.\d+)?)/i);
    if (belowMatch) {
      const threshold = parseFloat(belowMatch[1]);
      if (cgpa < threshold) {
        return opt;
      }
    }

    // Above: "Above 9", "> 9", "9+", ">= 9"
    const aboveMatch = raw.match(/(?:above|>|more\s*than)\s*(\d+(?:\.\d+)?)/i) || raw.match(/(\d+(?:\.\d+)?)\s*\+/);
    if (aboveMatch) {
      const threshold = parseFloat(aboveMatch[1]);
      if (cgpa >= threshold) {
        return opt;
      }
    }

    // Direct single number match
    const singleMatch = raw.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (singleMatch && parseFloat(singleMatch[1]) === cgpa) {
      return opt;
    }
  }

  return null;
}

/**
 * Matches graduation year to available options.
 */
export function matchGraduationYearToOption(
  options: Array<{ label: string; value: string }>,
  gradYear: string
): { label: string; value: string } | null {
  const normTarget = normalizeOptionText(gradYear);
  for (const opt of options) {
    const normOpt = normalizeOptionText(opt.label);
    if (normOpt === normTarget || normOpt.includes(normTarget) || opt.value === gradYear) {
      return opt;
    }
  }
  return null;
}

/**
 * Matches Yes/No options for boolean preferences.
 */
export function matchYesNoOption(
  options: Array<{ label: string; value: string }>,
  desiredBool: boolean
): { label: string; value: string } | null {
  for (const opt of options) {
    const norm = normalizeOptionText(opt.label);
    if (desiredBool && /^(?:yes|y|true|agree|comfortable|available)$/i.test(norm)) {
      return opt;
    }
    if (!desiredBool && /^(?:no|n|false|disagree|uncomfortable|unavailable)$/i.test(norm)) {
      return opt;
    }
  }
  return null;
}

interface MappingRule {
  patterns: RegExp[];
  profileField: string;
  category: FieldCategory;
  getValue: (profile: UserProfile, field: DetectedField) => string | boolean | null;
  confidence: number;
}

const DETERMINISTIC_RULES: MappingRule[] = [
  // First Name
  {
    patterns: [
      /^(?:first\s*name|given\s*name|fname|first_name|candidate_first_name)$/i,
      /\bfirst\s*name\b/i,
      /\bgiven\s*name\b/i
    ],
    profileField: 'personal.firstName',
    category: 'PERSONAL',
    getValue: (p) => p.personal.firstName,
    confidence: 0.99
  },
  // Last Name
  {
    patterns: [
      /^(?:last\s*name|surname|family\s*name|lname|last_name|candidate_last_name)$/i,
      /\blast\s*name\b/i,
      /\bsurname\b/i,
      /\bfamily\s*name\b/i
    ],
    profileField: 'personal.lastName',
    category: 'PERSONAL',
    getValue: (p) => p.personal.lastName,
    confidence: 0.99
  },
  // Full Name
  {
    patterns: [
      /^(?:full\s*name|legal\s*name|candidate\s*name|your\s*name|name)$/i,
      /\bfull\s*name\b/i,
      /\blegal\s*name\b/i
    ],
    profileField: 'personal.fullName',
    category: 'PERSONAL',
    getValue: (p) => p.personal.fullName,
    confidence: 0.98
  },
  // Email
  {
    patterns: [
      /^(?:email|email\s*address|e-mail|electronic\s*mail)$/i,
      /\bemail\b/i,
      /\be-mail\b/i
    ],
    profileField: 'personal.email',
    category: 'PERSONAL',
    getValue: (p) => p.personal.email,
    confidence: 0.99
  },
  // Phone
  {
    patterns: [
      /^(?:phone|phone\s*number|mobile|mobile\s*number|telephone|contact\s*number|cell)$/i,
      /\bphone\b/i,
      /\bmobile\b/i,
      /\bcontact\s*number\b/i
    ],
    profileField: 'personal.phone',
    category: 'PERSONAL',
    getValue: (p) => p.personal.phone,
    confidence: 0.99
  },
  // Address / Street Address
  {
    patterns: [
      /^(?:address|street\s*address|address\s*line\s*1|residential\s*address)$/i,
      /\bstreet\s*address\b/i,
      /\baddress\s*line\s*1\b/i,
      /\bcurrent\s*address\b/i
    ],
    profileField: 'personal.address',
    category: 'LOCATION',
    getValue: (p) => `${p.personal.city}, ${p.personal.state}, ${p.personal.country} - ${p.personal.pincode}`,
    confidence: 0.92
  },
  // City
  {
    patterns: [
      /^(?:city|current\s*city|town)$/i,
      /\bcurrent\s*city\b/i,
      /\bcity\b/i
    ],
    profileField: 'personal.city',
    category: 'LOCATION',
    getValue: (p) => p.personal.city,
    confidence: 0.95
  },
  // State
  {
    patterns: [
      /^(?:state|province|region)$/i,
      /\bstate\b/i,
      /\bprovince\b/i
    ],
    profileField: 'personal.state',
    category: 'LOCATION',
    getValue: (p) => p.personal.state,
    confidence: 0.95
  },
  // Country
  {
    patterns: [
      /^(?:country|nation)$/i,
      /\bcountry\b/i
    ],
    profileField: 'personal.country',
    category: 'LOCATION',
    getValue: (p) => p.personal.country,
    confidence: 0.95
  },
  // Pincode / Zip
  {
    patterns: [
      /^(?:zip|zip\s*code|postal\s*code|pincode|pin\s*code)$/i,
      /\bpostal\s*code\b/i,
      /\bpincode\b/i,
      /\bzip\s*code\b/i
    ],
    profileField: 'personal.pincode',
    category: 'LOCATION',
    getValue: (p) => p.personal.pincode,
    confidence: 0.96
  },
  // LinkedIn
  {
    patterns: [
      /^(?:linkedin|linkedin\s*url|linkedin\s*profile|linkedin\s*link)$/i,
      /\blinkedin\b/i
    ],
    profileField: 'personal.linkedin',
    category: 'PERSONAL',
    getValue: (p) => p.personal.linkedin,
    confidence: 0.99
  },
  // GitHub
  {
    patterns: [
      /^(?:github|github\s*url|github\s*profile|github\s*link)$/i,
      /\bgithub\b/i
    ],
    profileField: 'personal.github',
    category: 'PERSONAL',
    getValue: (p) => p.personal.github,
    confidence: 0.99
  },
  // Portfolio / Website
  {
    patterns: [
      /^(?:portfolio|portfolio\s*url|personal\s*website|website|personal\s*url|portfolio\s*link)$/i,
      /\bportfolio\b/i,
      /\bpersonal\s*website\b/i
    ],
    profileField: 'personal.portfolio',
    category: 'PERSONAL',
    getValue: (p) => p.personal.portfolio,
    confidence: 0.97
  },
  // Degree / Highest Education
  {
    patterns: [
      /^(?:degree|highest\s*degree|highest\s*education|degree\s*level|education\s*level)$/i,
      /\bhighest\s*degree\b/i,
      /\bdegree\b/i
    ],
    profileField: 'education.degree',
    category: 'EDUCATION',
    getValue: (p) => p.education[0]?.degree || null,
    confidence: 0.94
  },
  // Major / Branch / Field of Study
  {
    patterns: [
      /^(?:major|branch|field\s*of\s*study|discipline|area\s*of\s*study)$/i,
      /\bfield\s*of\s*study\b/i,
      /\bmajor\b/i,
      /\bbranch\b/i
    ],
    profileField: 'education.branch',
    category: 'EDUCATION',
    getValue: (p) => p.education[0]?.branch || null,
    confidence: 0.94
  },
  // University / School / College
  {
    patterns: [
      /^(?:university|school|college|institution|university\s*name|college\s*name)$/i,
      /\buniversity\b/i,
      /\bcollege\b/i,
      /\binstitution\b/i
    ],
    profileField: 'education.university',
    category: 'EDUCATION',
    getValue: (p) => p.education[0]?.university || null,
    confidence: 0.94
  },
  // Graduation Year
  {
    patterns: [
      /^(?:graduation\s*year|expected\s*graduation|completion\s*year|end\s*year)$/i,
      /\bgraduation\s*year\b/i,
      /\bexpected\s*graduation\b/i
    ],
    profileField: 'education.expectedGraduation',
    category: 'EDUCATION',
    getValue: (p) => p.education[0]?.expectedGraduation || null,
    confidence: 0.92
  },
  // GPA / CGPA
  {
    patterns: [
      /^(?:cgpa|gpa|grade\s*point\s*average)$/i,
      /\bcgpa\b/i,
      /\bgpa\b/i
    ],
    profileField: 'education.cgpa',
    category: 'EDUCATION',
    getValue: (p) => (p.education[0]?.cgpa ? String(p.education[0].cgpa) : null),
    confidence: 0.92
  },
  // Notice Period / Availability / Joining Date
  {
    patterns: [
      /^(?:notice\s*period|availability|available\s*to\s*start|how\s*soon\s*can\s*you\s*start)$/i,
      /\bnotice\s*period\b/i,
      /how\s*soon\s*(?:would\s*you\s*be\s*able\s*to|can\s*you)\s*(?:to\s*)?join/i,
      /how\s*soon\s*(?:would\s*you\s*be\s*available|can\s*you\s*(?:join|start))/i,
      /when\s*(?:would\s*you\s*be\s*available|can\s*you)\s*(?:to\s*)?(?:start|join)/i,
      /what\s*is\s*your\s*(?:notice\s*period|availability)/i,
      /(?:earliest|expected)\s*(?:joining\s*date|start\s*date)/i,
      /availability\s*to\s*(?:join|start)/i,
      /how\s*many\s*days\s*notice\s*do\s*you\s*need/i,
      /if\s*selected,?\s*how\s*soon\s*(?:would\s*you\s*be\s*able\s*to|can\s*you)\s*join/i
    ],
    profileField: 'jobPreferences.noticePeriod',
    category: 'AVAILABILITY',
    getValue: (p) => p.jobPreferences.noticePeriod,
    confidence: 0.98
  },
  // Willing to Relocate
  {
    patterns: [
      /^(?:willing\s*to\s*relocate|open\s*to\s*relocation|relocation)$/i,
      /\bwilling\s*to\s*relocate\b/i,
      /\brelocation\b/i
    ],
    profileField: 'jobPreferences.willingToRelocate',
    category: 'LOCATION',
    getValue: (p, field) => {
      const bool = p.jobPreferences.willingToRelocate;
      return field.fieldType === 'checkbox' ? bool : bool ? 'Yes' : 'No';
    },
    confidence: 0.94
  },
  // US Work Authorization (Legally authorized to work in US)
  {
    patterns: [
      /\b(?:authorized|legally\s*authorized).*?(?:united\s*states|u\.?s\.?)\b/i,
      /\b(?:work\s*authorization|eligible\s*to\s*work).*?(?:united\s*states|u\.?s\.?)\b/i,
      /\bare\s*you\s*legally\s*authorized\s*to\s*work\s*in\s*the\s*united\s*states\b/i
    ],
    profileField: 'workAuthorization.usAuthorized',
    category: 'WORK_AUTHORIZATION',
    getValue: (p, field) => {
      const bool = p.workAuthorization.usAuthorized;
      return field.fieldType === 'checkbox' ? bool : bool ? 'Yes' : 'No';
    },
    confidence: 0.98
  },
  // US Visa Sponsorship (Will you require visa sponsorship in US)
  {
    patterns: [
      /\b(?:require|need).*?(?:visa\s*sponsorship|sponsorship).*?(?:united\s*states|u\.?s\.?|now\s*or\s*in\s*the\s*future)\b/i,
      /\bwill\s*you\s*(?:now\s*or\s*in\s*the\s*future\s*)?require\s*sponsorship\b/i,
      /\bvisa\s*sponsorship\b/i
    ],
    profileField: 'workAuthorization.usSponsorshipRequired',
    category: 'SPONSORSHIP',
    getValue: (p, field) => {
      const bool = p.workAuthorization.usSponsorshipRequired;
      return field.fieldType === 'checkbox' ? bool : bool ? 'Yes' : 'No';
    },
    confidence: 0.98
  },
  // India Work Authorization
  {
    patterns: [
      /\b(?:authorized|eligible|legally\s*authorized).*?india\b/i,
      /\bwork\s*authorization.*?india\b/i
    ],
    profileField: 'workAuthorization.indiaAuthorized',
    category: 'WORK_AUTHORIZATION',
    getValue: (p, field) => {
      const bool = p.workAuthorization.indiaAuthorized;
      return field.fieldType === 'checkbox' ? bool : bool ? 'Yes' : 'No';
    },
    confidence: 0.98
  },
  // Student Status
  {
    patterns: [
      /\b(?:are\s*you\s*(?:currently\s*)?(?:a\s*)?student|are\s*you\s*(?:currently\s*)?(?:enrolled\s*as\s*a\s*)?student|current\s*student\s*status)\b/i,
      /\bcurrently\s*enrolled\s*(?:in|as\s*a\s*student)\b/i
    ],
    profileField: 'studentEnrollment.isCurrentlyEnrolled',
    category: 'EDUCATION',
    getValue: (p, field) => {
      const bool = Boolean(
        p.jobPreferences?.studentEnrollment?.isCurrentlyEnrolled ??
        p.jobPreferences?.employmentStatus === 'STUDENT'
      );
      return field.fieldType === 'checkbox' ? bool : bool ? 'Yes' : 'No';
    },
    confidence: 0.95
  }
];

export function mapFieldToProfile(field: DetectedField, profile: UserProfile): DetectedField {
  const label = (field.detectedLabel || '').trim();
  const name = (field.name || '').trim();
  const htmlId = (field.htmlId || '').trim();
  const placeholder = (field.placeholder || '').trim();
  const ariaLabel = (field.ariaLabel || '').trim();

  // Check for open-ended or ambiguous questions that require Gemini AI
  const combinedContext = `${label} ${placeholder} ${field.surroundingText || ''}`.toLowerCase();

  // Dynamic country work authorization check from profile.workAuthorization.countries (for specific non-US countries)
  if (profile.workAuthorization?.countries?.length) {
    const isAuthQ = /\b(?:authorized|eligible|legally\s*authorized|work\s*permit|work\s*authorization)\b/i.test(combinedContext);
    const isSponsorshipQ = /\b(?:require|need).*?(?:visa\s*sponsorship|sponsorship)\b/i.test(combinedContext);

    if (isAuthQ || isSponsorshipQ) {
      for (const auth of profile.workAuthorization.countries) {
        if (auth.countryCode === 'US') continue;
        const countryRegex = new RegExp(`\\b${auth.countryName}\\b`, 'i');
        if (countryRegex.test(combinedContext)) {
          let val: string | boolean | null = null;
          if (isSponsorshipQ) {
            const needsSponsorship = auth.status === 'REQUIRES_SPONSORSHIP';
            val = field.fieldType === 'checkbox' ? needsSponsorship : needsSponsorship ? 'Yes' : 'No';
          } else {
            const isAuth = auth.status === 'AUTHORIZED';
            val = field.fieldType === 'checkbox' ? isAuth : isAuth ? 'Yes' : 'No';
          }
          return {
            ...field,
            suggestedProfileField: `workAuthorization.countries.${auth.countryCode}`,
            category: isSponsorshipQ ? 'SPONSORSHIP' : 'WORK_AUTHORIZATION',
            confidence: 0.95,
            confidenceLevel: 'HIGH',
            source: 'deterministic',
            suggestedValue: val,
            userValue: val,
            requiresConfirmation: false,
            explanation: `Matched verified work authorization for ${auth.countryName} (${auth.status})`
          };
        }
      }
    }
  }

  // 1. Availability for six months of office work / Onsite commitment
  // Per requirements: Never auto-assume or high-confidence answer without explicit candidate preference.
  if (
    /\b(?:availability\s*for\s*(?:six|6)\s*months(?:\s*of\s*(?:office|onsite|in-office)\s*work)?|available\s*for\s*(?:six|6)\s*months(?:\s*(?:of\s*)?(?:office|onsite|in-office|internship|work))?|willing\s*to\s*work\s*(?:from\s*(?:the\s*)?office|onsite)\s*for\s*(?:six|6)\s*months|(?:six|6)\s*months\s*(?:of\s*)?(?:office|onsite|in-office)\s*work|(?:six|6)\s*months\s*(?:in-office|onsite)|(?:six|6)\s*months\s*commitment)\b/i.test(combinedContext)
  ) {
    return {
      ...field,
      suggestedProfileField: 'jobPreferences.workModes',
      category: 'AVAILABILITY',
      confidence: 0.6,
      confidenceLevel: 'MEDIUM',
      source: 'manual',
      suggestedValue: null,
      userValue: undefined,
      requiresConfirmation: true,
      approved: false,
      explanation: 'Requires candidate review and approval for 6-month in-office / onsite commitment.'
    };
  }

  // 2. Comfort with the job location / Relocation preference
  if (
    /\b(?:comfort\s*with\s*(?:the\s*)?(?:job\s*)?location|comfortable\s*(?:with|working\s*in)\s*(?:the\s*)?(?:job\s*)?location|comfortable\s*with\s*(?:this|the)\s*location|location\s*preference|relocation\s*preference)\b/i.test(combinedContext)
  ) {
    const isWilling = profile.jobPreferences?.willingToRelocate ?? true;
    let val: string | boolean = isWilling ? 'Yes' : 'No';
    if (field.fieldType === 'checkbox') {
      val = isWilling;
    } else if (field.options && field.options.length > 0) {
      const matched = matchYesNoOption(field.options, isWilling);
      val = matched ? (matched.value || matched.label) : (isWilling ? 'Yes' : 'No');
    }
    return {
      ...field,
      suggestedProfileField: 'jobPreferences.willingToRelocate',
      category: 'LOCATION',
      confidence: 0.95,
      confidenceLevel: 'HIGH',
      source: 'deterministic',
      suggestedValue: val,
      userValue: val,
      requiresConfirmation: false,
      explanation: 'Matched verified candidate preference: willing to relocate/comfortable with location.'
    };
  }

  // 3. Course Name / Degree
  if (
    /\b(?:course\s*name|degree\s*name|highest\s*degree|program\s*name)\b/i.test(combinedContext) ||
    /^(?:course|degree|qualification)$/i.test(label)
  ) {
    if (field.options && field.options.length > 0) {
      const matchedOpt = matchCandidateDegreeToOption(field.options, profile);
      if (matchedOpt) {
        return {
          ...field,
          suggestedProfileField: 'education.degree',
          category: 'EDUCATION',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: matchedOpt.value || matchedOpt.label,
          userValue: matchedOpt.value || matchedOpt.label,
          requiresConfirmation: false,
          explanation: `Matched verified degree (${matchedOpt.label}) from profile.`
        };
      } else {
        // Do not assume BE/B.Tech or MBA, leave unanswered for review
        return {
          ...field,
          suggestedProfileField: 'education.degree',
          category: 'EDUCATION',
          confidence: 0.3,
          confidenceLevel: 'LOW',
          source: 'unmapped',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: 'Verified degree does not match listed options. Please review and select manually.'
        };
      }
    } else {
      const degVal = profile.education?.[0]?.degree || null;
      return {
        ...field,
        suggestedProfileField: 'education.degree',
        category: 'EDUCATION',
        confidence: degVal ? 0.95 : 0.2,
        confidenceLevel: degVal ? 'HIGH' : 'LOW',
        source: degVal ? 'deterministic' : 'unmapped',
        suggestedValue: degVal,
        userValue: degVal || undefined,
        requiresConfirmation: !degVal,
        explanation: degVal ? 'Matched verified degree from profile.' : 'Degree missing from profile.'
      };
    }
  }

  // 4. CGPA / GPA Range
  if (/\b(?:cgpa|gpa|grade\s*point(?:\s*average)?)\b/i.test(combinedContext)) {
    const rawCgpa = profile.education?.[0]?.cgpa;
    const numCgpa = rawCgpa !== null && rawCgpa !== undefined && String(rawCgpa).trim() !== '' ? parseFloat(String(rawCgpa)) : null;

    if (numCgpa === null || isNaN(numCgpa)) {
      return {
        ...field,
        suggestedProfileField: 'education.cgpa',
        category: 'EDUCATION',
        confidence: 0.2,
        confidenceLevel: 'LOW',
        source: 'unmapped',
        suggestedValue: null,
        userValue: undefined,
        requiresConfirmation: true,
        approved: false,
        explanation: 'CGPA missing from verified profile. Please review and enter manually.'
      };
    }

    if (field.options && field.options.length > 0) {
      const matchedOpt = matchCgpaToOption(field.options, numCgpa);
      if (matchedOpt) {
        return {
          ...field,
          suggestedProfileField: 'education.cgpa',
          category: 'EDUCATION',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: matchedOpt.value || matchedOpt.label,
          userValue: matchedOpt.value || matchedOpt.label,
          requiresConfirmation: false,
          explanation: `Matched verified CGPA (${numCgpa}) to option range (${matchedOpt.label}).`
        };
      } else {
        return {
          ...field,
          suggestedProfileField: 'education.cgpa',
          category: 'EDUCATION',
          confidence: 0.3,
          confidenceLevel: 'LOW',
          source: 'unmapped',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: `Verified CGPA (${numCgpa}) does not match listed ranges. Please review.`
        };
      }
    } else {
      return {
        ...field,
        suggestedProfileField: 'education.cgpa',
        category: 'EDUCATION',
        confidence: 0.95,
        confidenceLevel: 'HIGH',
        source: 'deterministic',
        suggestedValue: String(numCgpa),
        userValue: String(numCgpa),
        requiresConfirmation: false,
        explanation: 'Matched verified CGPA from profile.'
      };
    }
  }

  // 5. Graduation Year
  if (/\b(?:year\s*of\s*graduation|graduation\s*year|passing\s*year|passout\s*year|expected\s*graduation|completion\s*year)\b/i.test(combinedContext)) {
    const gradYear = profile.education?.[0]?.expectedGraduation || profile.jobPreferences?.studentEnrollment?.expectedGraduationDate || null;
    if (!gradYear) {
      return {
        ...field,
        suggestedProfileField: 'education.expectedGraduation',
        category: 'EDUCATION',
        confidence: 0.2,
        confidenceLevel: 'LOW',
        source: 'unmapped',
        suggestedValue: null,
        userValue: undefined,
        requiresConfirmation: true,
        approved: false,
        explanation: 'Graduation year not found in verified profile.'
      };
    }

    if (field.options && field.options.length > 0) {
      const matchedOpt = matchGraduationYearToOption(field.options, String(gradYear));
      if (matchedOpt) {
        return {
          ...field,
          suggestedProfileField: 'education.expectedGraduation',
          category: 'EDUCATION',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: matchedOpt.value || matchedOpt.label,
          userValue: matchedOpt.value || matchedOpt.label,
          requiresConfirmation: false,
          explanation: `Matched verified graduation year (${gradYear}) from profile.`
        };
      } else {
        return {
          ...field,
          suggestedProfileField: 'education.expectedGraduation',
          category: 'EDUCATION',
          confidence: 0.3,
          confidenceLevel: 'LOW',
          source: 'unmapped',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: `Graduation year (${gradYear}) does not match listed options. Please review.`
        };
      }
    } else {
      return {
        ...field,
        suggestedProfileField: 'education.expectedGraduation',
        category: 'EDUCATION',
        confidence: 0.95,
        confidenceLevel: 'HIGH',
        source: 'deterministic',
        suggestedValue: String(gradYear),
        userValue: String(gradYear),
        requiresConfirmation: false,
        explanation: 'Matched verified graduation year from profile.'
      };
    }
  }

  // 6. College Name / University
  if (/\b(?:college\s*name|university\s*name|name\s*of\s*(?:college|university|school|institution)|institution\s*name)\b/i.test(combinedContext)) {
    const university = profile.education?.[0]?.university || null;
    let val: string | null = university;
    if (field.options && field.options.length > 0 && university) {
      const matched = field.options.find(
        (o) => normalizeOptionText(o.label) === normalizeOptionText(university) || normalizeOptionText(o.label).includes(normalizeOptionText(university))
      );
      val = matched ? (matched.value || matched.label) : null;
    }
    return {
      ...field,
      suggestedProfileField: 'education.university',
      category: 'EDUCATION',
      confidence: val ? 0.95 : 0.2,
      confidenceLevel: val ? 'HIGH' : 'LOW',
      source: val ? 'deterministic' : 'unmapped',
      suggestedValue: val,
      userValue: val || undefined,
      requiresConfirmation: !val,
      explanation: val ? 'Matched verified college name from profile.' : 'College name not matched in options.'
    };
  }

  // Try matching with each text source in priority order
  const searchTexts = [
    label,
    ariaLabel,
    name.replace(/[-_]/g, ' '),
    htmlId.replace(/[-_]/g, ' '),
    placeholder
  ].filter(Boolean);

  for (const text of searchTexts) {
    for (const rule of DETERMINISTIC_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          let val = rule.getValue(profile, field);
          let confidence = rule.confidence;
          let confidenceLevel: ConfidenceLevel = 'HIGH';
          let requiresConfirmation = false;

          // If the field has options (radio group, select), normalize and match against available choices
          if (field.options && field.options.length > 0 && val !== null && val !== undefined) {
            if (typeof val === 'boolean') {
              const matchedOpt = matchYesNoOption(field.options, val);
              if (matchedOpt) {
                val = matchedOpt.value || matchedOpt.label;
              }
            } else if (typeof val === 'string') {
              const normTarget = normalizeOptionText(val);
              const matchedOpt = field.options.find((o) => {
                const normOpt = normalizeOptionText(o.label);
                return normOpt === normTarget || normOpt.includes(normTarget) || normTarget.includes(normOpt);
              });
              if (matchedOpt) {
                val = matchedOpt.value || matchedOpt.label;
              } else {
                // Value does not match any available option -> require manual review!
                val = null;
                confidence = 0.3;
                confidenceLevel = 'LOW';
                requiresConfirmation = true;
              }
            }
          }

          return {
            ...field,
            suggestedProfileField: rule.profileField,
            category: rule.category,
            confidence,
            confidenceLevel,
            source: val !== null ? 'deterministic' : 'unmapped',
            suggestedValue: val,
            userValue: val !== null ? val : undefined,
            requiresConfirmation,
            explanation: val !== null
              ? `Matched from verified profile field: ${rule.profileField}`
              : `Profile field ${rule.profileField} does not match available options.`
          };
        }
      }
    }
  }

  // Explicit check for generic open-ended fields that should NOT be answered by AI
  if (
    /anything\s*else(?:\s*you\s*would\s*like\s*us\s*to\s*know)?/i.test(combinedContext) ||
    /additional\s*(?:information|comments|notes|details)/i.test(combinedContext) ||
    /any\s*other\s*(?:comments|information|details)/i.test(combinedContext)
  ) {
    return {
      ...field,
      category: 'UNKNOWN',
      confidence: 0.0,
      confidenceLevel: 'LOW',
      source: 'unmapped',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Unrecognized/open-ended field. Enter manually if desired.'
    };
  }

  // Role Motivation: specific to the role, position, discipline, or opportunity
  if (
    /why\s*(?:are\s*you\s*interested\s*in|do\s*you\s*want)\s*(?:product\s*management|this\s*role|this\s*position|the\s*role|the\s*position|this\s*opportunity|engineering|software\s*engineering)/i.test(
      combinedContext
    ) ||
    /why\s*(?:product\s*management|this\s*role|this\s*position|the\s*role)/i.test(combinedContext) ||
    /interest\s*in\s*(?:product\s*management|this\s*role|this\s*position|software\s*engineering)/i.test(
      combinedContext
    )
  ) {
    return {
      ...field,
      category: 'ROLE_MOTIVATION',
      confidence: 0.80,
      confidenceLevel: 'MEDIUM',
      source: 'ai',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Role motivation question — queued for Gemini AI generation using verified candidate background.'
    };
  }

  // Company Motivation: specific to the company, organization, team, or general hire motivation
  if (
    /why\s*(?:do\s*you\s*want\s*to\s*work|should\s*we\s*hire|join\s*us|are\s*you\s*interested)/i.test(
      combinedContext
    ) ||
    /why\s*(?:this\s*company|our\s*company)/i.test(combinedContext) ||
    /cover\s*letter/i.test(combinedContext)
  ) {
    return {
      ...field,
      category: 'COMPANY_MOTIVATION',
      confidence: 0.75,
      confidenceLevel: 'MEDIUM',
      source: 'ai',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Ambiguous company motivation question — queued for Gemini AI generation using verified profile context.'
    };
  }

  if (
    /tell\s*us\s*about\s*a\s*project/i.test(combinedContext) ||
    /project\s*you(?:'re|\s*are)\s*proud\s*of/i.test(combinedContext) ||
    /describe\s*a\s*(?:technical\s*)?project/i.test(combinedContext)
  ) {
    return {
      ...field,
      category: 'PROJECT',
      confidence: 0.75,
      confidenceLevel: 'MEDIUM',
      source: 'ai',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Project discussion question — queued for Gemini AI project selection and synthesis.'
    };
  }

  if (
    /challenging\s*(?:engineering|technical)?\s*problem/i.test(combinedContext) ||
    /difficult\s*(?:technical|bug|problem)/i.test(combinedContext) ||
    /tell\s*me\s*about\s*a\s*time/i.test(combinedContext) ||
    /describe\s*a\s*time/i.test(combinedContext)
  ) {
    return {
      ...field,
      category: 'BEHAVIORAL',
      confidence: 0.75,
      confidenceLevel: 'MEDIUM',
      source: 'ai',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Behavioral technical question — queued for Gemini AI answering from verified experience.'
    };
  }

  // Demographics or protected categories: NEVER infer, confidence LOW, require user input
  if (
    /veteran|military|disability|race|ethnicity|gender|sexual\s*orientation/i.test(
      combinedContext
    )
  ) {
    return {
      ...field,
      category: 'DEMOGRAPHIC',
      confidence: 0.1,
      confidenceLevel: 'LOW',
      source: 'manual',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Protected demographic question — never inferred by AI. Please answer manually.'
    };
  }

  // Salary expectation
  if (/salary|compensation|desired\s*pay|expected\s*ctc/i.test(combinedContext)) {
    return {
      ...field,
      category: 'SALARY',
      confidence: 0.2,
      confidenceLevel: 'LOW',
      source: 'manual',
      suggestedValue: null,
      requiresConfirmation: true,
      explanation: 'Salary expectation — enter manually or configure in Job Preferences.'
    };
  }

  // Default unmapped field
  return {
    ...field,
    category: 'UNKNOWN',
    confidence: 0.0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: true,
    explanation: 'Unrecognized field. Enter manually if desired.'
  };
}

export function mapAllFields(fields: DetectedField[], profile: UserProfile): DetectedField[] {
  return fields.map((f) => mapFieldToProfile(f, profile));
}
