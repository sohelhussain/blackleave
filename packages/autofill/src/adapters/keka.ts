import { DetectedField, UserProfile } from '@applyflow/types';
import { SiteAdapter } from './index.js';
import { detectFormFields } from '../detector.js';
import { mapAllFields, normalizeOptionText, calculateTotalExperienceYearsAndMonths } from '../mapper.js';

export class KekaAdapter implements SiteAdapter {
  name = 'Keka';

  matches(url: string, document: Document): boolean {
    return (
      url.includes('keka.com') ||
      url.includes('keka.io') ||
      url.includes('kekahire.com') ||
      !!document.querySelector(
        '#jobApplicationForm, #experienceDetails, #educationDetails, [name="jobApplicationForm"], .kch-text-heading, .org-logo[alt*="Keka"]'
      )
    );
  }

  extractJobInfo(document: Document): { company?: string; title?: string; description?: string } | null {
    // 1. Job Title
    const titleEl = document.querySelector('.kch-text-heading, h1.font-large-5, h1');
    let title = titleEl?.textContent?.trim();
    if (!title && document.title) {
      title = document.title.replace(/\s*-\s*Keka.*$/i, '').trim();
    }

    // 2. Company Name
    let company: string | undefined;
    const orgLogo = document.querySelector('.org-logo');
    const logoAlt = orgLogo?.getAttribute('alt');
    if (logoAlt && !/^keka(?:\s*hire)?$/i.test(logoAlt.trim())) {
      company = logoAlt.trim();
    }

    if (!company) {
      const portalMeta = document.querySelector('meta[name="portalName"]')?.getAttribute('content')?.trim();
      if (portalMeta) company = portalMeta;
    }

    if (!company && typeof window !== 'undefined' && window.location?.hostname) {
      const parts = window.location.hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'careers' && parts[0] !== 'jobs') {
        company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    // 3. Job Description
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    const bodyDesc = document.querySelector('.job-details-container')?.textContent?.trim();
    const description = metaDesc || (bodyDesc ? bodyDesc.substring(0, 3000) : undefined);

    return {
      title: title || undefined,
      company: company || 'Keka Hire',
      description
    };
  }

  findResumeInput(document: Document): HTMLInputElement | null {
    return (
      (document.querySelector(
        'input[type="file"]#resume-upload, input[type="file"].resume-upload, input[type="file"][data-field-identifier="resume"]'
      ) as HTMLInputElement) || null
    );
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    const mapped = mapAllFields(rawFields, profile);

    // Keka-specific post-processing and refinement
    return mapped.map((field) => {
      const htmlId = field.htmlId || '';
      const name = field.name || '';

      // Phone country code select
      if (htmlId === 'mobilePhone.countryCode' || name === 'mobilePhone.countryCode') {
        const countryCode = profile.personal?.phoneCountryCode || (profile.personal?.phone?.match(/^\+(\d{1,4})/)?.[0]) || '+91';
        let val = countryCode;
        if (field.options && field.options.length > 0) {
          const matched = field.options.find(
            (o) => o.value === countryCode || o.label === countryCode || normalizeOptionText(o.label).includes('india')
          );
          if (matched) val = matched.value || matched.label;
        }
        return {
          ...field,
          detectedLabel: 'Mobile Phone (Country Code)',
          suggestedProfileField: 'personal.phoneCountryCode',
          category: 'PERSONAL',
          confidence: 0.98,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: val,
          userValue: val,
          requiresConfirmation: false,
          explanation: `Matched phone dialing country code (${countryCode}) from verified profile.`
        };
      }

      // Phone number input
      if (htmlId === 'mobilePhone.number' || name === 'mobilePhone.number') {
        const rawPhone = profile.personal?.phone || '';
        const localPhone = rawPhone.replace(/^\+\d{1,4}\s*/, '');
        return {
          ...field,
          detectedLabel: 'Mobile Phone',
          suggestedProfileField: 'personal.phone',
          category: 'PERSONAL',
          confidence: 0.99,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: localPhone,
          userValue: localPhone,
          requiresConfirmation: false,
          explanation: 'Matched candidate mobile phone number from verified profile.'
        };
      }

      // Work experience years
      if (htmlId === 'workExperience' || name === 'workExperience.years') {
        const dur = calculateTotalExperienceYearsAndMonths(profile.experience || []);
        const yearsStr = String(dur.years);
        return {
          ...field,
          detectedLabel: 'Total Experience (Years)',
          suggestedProfileField: 'experience.years',
          category: 'EXPERIENCE',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: yearsStr,
          userValue: yearsStr,
          requiresConfirmation: false,
          explanation: `Calculated verified total experience years: ${dur.years} years (${dur.totalMonths} months).`
        };
      }

      // Work experience months
      if (name === 'workExperience.months') {
        const dur = calculateTotalExperienceYearsAndMonths(profile.experience || []);
        const monthsStr = String(dur.months);
        let val = monthsStr;
        if (field.options && field.options.length > 0) {
          const matched = field.options.find((o) => o.value === monthsStr || o.label === monthsStr);
          if (matched) val = matched.value || matched.label;
        }
        return {
          ...field,
          detectedLabel: 'Total Experience (Months)',
          suggestedProfileField: 'experience.months',
          category: 'EXPERIENCE',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: val,
          userValue: val,
          requiresConfirmation: false,
          explanation: `Calculated verified experience remaining months: ${dur.months} months.`
        };
      }

      // Expected salary currency
      if (htmlId === 'expectedSalary.currency' || name === 'expectedSalary.currency') {
        const curr = profile.jobPreferences?.salaryCurrency || 'INR';
        return {
          ...field,
          detectedLabel: 'Expected Salary Currency',
          suggestedProfileField: 'jobPreferences.salaryCurrency',
          category: 'SALARY',
          confidence: 0.98,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: curr,
          userValue: curr,
          requiresConfirmation: false,
          explanation: 'Default salary currency INR from job preferences.'
        };
      }

      // Expected salary amount
      if (htmlId === 'expectedSalary' || name === 'expectedSalary.amount') {
        const expMin = profile.jobPreferences?.expectedSalaryMin;
        if (expMin !== null && expMin !== undefined && String(expMin).trim() !== '') {
          return {
            ...field,
            detectedLabel: 'Expected Salary',
            suggestedProfileField: 'jobPreferences.expectedSalaryMin',
            category: 'SALARY',
            confidence: 0.95,
            confidenceLevel: 'HIGH',
            source: 'deterministic',
            suggestedValue: String(expMin),
            userValue: String(expMin),
            requiresConfirmation: false,
            explanation: `Matched verified expected salary: ${expMin}`
          };
        }
        return {
          ...field,
          detectedLabel: 'Expected Salary',
          suggestedProfileField: 'jobPreferences.expectedSalaryMin',
          category: 'SALARY',
          confidence: 0.2,
          confidenceLevel: 'LOW',
          source: 'manual',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: 'Expected salary is not configured in Job Preferences. Please review and enter manually.'
        };
      }

      // Current salary currency
      if (htmlId === 'currentSalary.currency' || name === 'currentSalary.currency') {
        const curr = profile.jobPreferences?.salaryCurrency || 'INR';
        let val = curr;
        if (field.options && field.options.length > 0) {
          const matched = field.options.find(
            (o) => o.value === curr || o.label === curr || normalizeOptionText(o.label).includes(curr.toLowerCase())
          );
          if (matched) val = matched.value || matched.label;
        }
        return {
          ...field,
          detectedLabel: 'Current Salary Currency',
          suggestedProfileField: 'jobPreferences.salaryCurrency',
          category: 'SALARY',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: val,
          userValue: val,
          requiresConfirmation: false,
          explanation: `Matched current salary currency (${curr}) from preferences.`
        };
      }

      // Current salary amount
      if (htmlId === 'currentSalary' || name === 'currentSalary.amount') {
        return {
          ...field,
          detectedLabel: 'Current Salary',
          suggestedProfileField: 'currentSalary',
          category: 'SALARY',
          confidence: 0.2,
          confidenceLevel: 'LOW',
          source: 'manual',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: 'Current salary is not configured in profile. Please review and enter manually.'
        };
      }

      // Nationality dropdown with GUID values
      if (htmlId === 'nationality' || name === 'standardFields.nationality.answer') {
        const country = profile.personal?.country || 'India';
        let val: string | null = null;
        if (field.options && field.options.length > 0) {
          const normCountry = normalizeOptionText(country);
          const matched = field.options.find(
            (o) => normalizeOptionText(o.label) === normCountry || normalizeOptionText(o.value) === normCountry
          );
          if (matched) {
            val = matched.value || matched.label;
          }
        }
        if (val) {
          return {
            ...field,
            detectedLabel: 'Nationality',
            suggestedProfileField: 'personal.country',
            category: 'LOCATION',
            confidence: 0.98,
            confidenceLevel: 'HIGH',
            source: 'deterministic',
            suggestedValue: val,
            userValue: val,
            requiresConfirmation: false,
            explanation: `Matched verified nationality (${country}) to form option.`
          };
        }
      }

      // Gender dropdown with integer option values
      if (htmlId === 'gender' || name === 'gender') {
        const gender = profile.personal?.gender;
        if (gender) {
          let val: string = gender;
          if (field.options && field.options.length > 0) {
            const normGender = normalizeOptionText(gender);
            const matched = field.options.find(
              (o) => normalizeOptionText(o.label) === normGender || normalizeOptionText(o.value) === normGender
            );
            if (matched) {
              val = matched.value || matched.label;
            }
          }
          return {
            ...field,
            detectedLabel: 'Gender',
            suggestedProfileField: 'personal.gender',
            category: 'DEMOGRAPHIC',
            confidence: 0.95,
            confidenceLevel: 'HIGH',
            source: 'deterministic',
            suggestedValue: val,
            userValue: val,
            requiresConfirmation: false,
            explanation: `Matched verified candidate gender (${gender}) from profile.`
          };
        } else {
          return {
            ...field,
            detectedLabel: 'Gender',
            suggestedProfileField: 'personal.gender',
            category: 'DEMOGRAPHIC',
            confidence: 0.1,
            confidenceLevel: 'LOW',
            source: 'manual',
            suggestedValue: null,
            userValue: undefined,
            requiresConfirmation: true,
            approved: false,
            explanation: 'Gender is not specified in candidate profile. Please select manually.'
          };
        }
      }

      // Preferred Location
      if (htmlId === 'locationPreference' || name === 'standardFields.locationPreference.answer') {
        const preferred = profile.jobPreferences?.preferredLocations || [profile.personal?.city || 'Bangalore'];
        let val: string | null = null;
        if (field.options && field.options.length > 0) {
          for (const loc of preferred) {
            const normLoc = normalizeOptionText(loc);
            const matched = field.options.find(
              (o) => normalizeOptionText(o.label) === normLoc || normalizeOptionText(o.value) === normLoc
            );
            if (matched) {
              val = matched.value || matched.label;
              break;
            }
          }
        }
        if (!val && preferred.length > 0) {
          val = preferred[0];
        }
        return {
          ...field,
          detectedLabel: 'Preferred Location',
          suggestedProfileField: 'jobPreferences.preferredLocations',
          category: 'LOCATION',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: val,
          userValue: val || undefined,
          requiresConfirmation: !val,
          explanation: val ? `Matched preferred location (${val}) from profile.` : 'Preferred location not matched in form options.'
        };
      }

      // Available to Join (in days)
      if (htmlId === 'availability' || name === 'standardFields.availability.answer') {
        const np = profile.jobPreferences?.noticePeriod || '15 days';
        const match = np.match(/\d+/);
        const days = match ? match[0] : /immediate/i.test(np) ? '0' : '15';
        return {
          ...field,
          detectedLabel: 'Available To Join (in days)',
          suggestedProfileField: 'jobPreferences.noticePeriod',
          category: 'AVAILABILITY',
          confidence: 0.98,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: days,
          userValue: days,
          requiresConfirmation: false,
          explanation: `Extracted notice period in numeric days (${days}) from verified profile.`
        };
      }

      // Current Location
      if (htmlId === 'currentLocation' || name === 'standardFields.currentLocation.answer') {
        const city = profile.personal?.city || 'Bangalore';
        return {
          ...field,
          detectedLabel: 'Current Location',
          suggestedProfileField: 'personal.city',
          category: 'LOCATION',
          confidence: 0.95,
          confidenceLevel: 'HIGH',
          source: 'deterministic',
          suggestedValue: city,
          userValue: city,
          requiresConfirmation: false,
          explanation: `Matched current city (${city}) from candidate profile.`
        };
      }

      // Invariants: Consent & Captcha must never be auto-filled
      if (htmlId === 'candidateConsent' || name === 'candidateConsent') {
        return {
          ...field,
          detectedLabel: 'Consent to Terms',
          category: 'UNKNOWN',
          confidence: 0.0,
          confidenceLevel: 'LOW',
          source: 'manual',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: 'Data processing terms and consent — must be manually accepted by the candidate.'
        };
      }

      if (htmlId === 'captcha' || name === 'captcha') {
        return {
          ...field,
          detectedLabel: 'CAPTCHA Verification',
          category: 'UNKNOWN',
          confidence: 0.0,
          confidenceLevel: 'LOW',
          source: 'manual',
          suggestedValue: null,
          userValue: undefined,
          requiresConfirmation: true,
          approved: false,
          explanation: 'CAPTCHA challenge — must be completed manually.'
        };
      }

      return field;
    });
  }
}
