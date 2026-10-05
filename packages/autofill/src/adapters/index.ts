import { DetectedField, UserProfile } from '@applyflow/types';
import { detectFormFields } from '../detector.js';
import { mapAllFields } from '../mapper.js';
import { GoogleFormsAdapter } from './google-forms.js';

export interface SiteAdapter {
  name: string;
  matches(url: string, document: Document): boolean;
  extractJobInfo?(document: Document): { company?: string; title?: string; description?: string } | null;
  detectAndMap(document: Document, profile: UserProfile): DetectedField[];
  findResumeInput?(document: Document): HTMLInputElement | null;
}

export class GenericAdapter implements SiteAdapter {
  name = 'Generic';

  matches(): boolean {
    return true; // Fallback matches all
  }

  extractJobInfo(document: Document): { company?: string; title?: string; description?: string } | null {
    const title =
      document.querySelector('h1')?.textContent?.trim() ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.title;

    const company =
      document.querySelector('[data-company-name]')?.textContent?.trim() ||
      document.querySelector('.company-name, .employer, .organization')?.textContent?.trim() ||
      document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');

    const descEl = document.querySelector(
      '.job-description, #job-description, [data-automation-id="jobPostingDescription"], .description'
    );
    const description = descEl?.textContent?.trim() || document.body.innerText.substring(0, 3000);

    return {
      title: title || undefined,
      company: company || undefined,
      description: description || undefined
    };
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }

  findResumeInput(document: Document): HTMLInputElement | null {
    return (
      (document.querySelector(
        'input[type="file"][name*="resume" i], input[type="file"][id*="resume" i], input[type="file"][aria-label*="resume" i]'
      ) as HTMLInputElement) || null
    );
  }
}

export class GreenhouseAdapter implements SiteAdapter {
  name = 'Greenhouse';

  matches(url: string, document: Document): boolean {
    return (
      url.includes('greenhouse.io') ||
      url.includes('boards.greenhouse.io') ||
      !!document.querySelector('#application_form, #embedded_job_board')
    );
  }

  extractJobInfo(document: Document) {
    const title = document.querySelector('.app-title, .job-title, h1.heading')?.textContent?.trim();
    const company = document.querySelector('.company-name, .company')?.textContent?.trim();
    const description = document.querySelector('#content')?.textContent?.trim();
    return { title, company, description };
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }

  findResumeInput(document: Document): HTMLInputElement | null {
    return (
      (document.querySelector(
        'input[type="file"][id="resume"], input[type="file"][name*="resume"]'
      ) as HTMLInputElement) || null
    );
  }
}

export class LeverAdapter implements SiteAdapter {
  name = 'Lever';

  matches(url: string, document: Document): boolean {
    return (
      url.includes('jobs.lever.co') ||
      !!document.querySelector('.application-form, .application-page')
    );
  }

  extractJobInfo(document: Document) {
    const title = document.querySelector('.posting-headline h2, h2.posting-headline')?.textContent?.trim();
    const company = document.querySelector('.main-header-logo img')?.getAttribute('alt');
    const description = document.querySelector('.section-wrapper.page-full-width')?.textContent?.trim();
    return { title, company: company || undefined, description };
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }

  findResumeInput(document: Document): HTMLInputElement | null {
    return (
      (document.querySelector(
        'input[type="file"][name="resume"]'
      ) as HTMLInputElement) || null
    );
  }
}

export class WorkdayAdapter implements SiteAdapter {
  name = 'Workday';

  matches(url: string, document: Document): boolean {
    return (
      url.includes('myworkdayjobs.com') ||
      url.includes('workday') ||
      !!document.querySelector('[data-automation-id="workdayApplication"]')
    );
  }

  extractJobInfo(document: Document) {
    const title = document.querySelector('[data-automation-id="jobPostingHeader"] h2')?.textContent?.trim();
    const company = document.querySelector('[data-automation-id="jobPostingHeader"] span')?.textContent?.trim();
    const description = document.querySelector('[data-automation-id="jobPostingDescription"]')?.textContent?.trim();
    return { title, company, description };
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }
}

export class LinkedInAdapter implements SiteAdapter {
  name = 'LinkedIn';

  matches(url: string): boolean {
    return url.includes('linkedin.com/jobs');
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }
}

export class AshbyAdapter implements SiteAdapter {
  name = 'Ashby';

  matches(url: string, document: Document): boolean {
    return url.includes('ashbyhq.com') || !!document.querySelector('#ashby_application_form');
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }
}

export class SmartRecruitersAdapter implements SiteAdapter {
  name = 'SmartRecruiters';

  matches(url: string, document: Document): boolean {
    return url.includes('smartrecruiters.com') || !!document.querySelector('#st-applyForm');
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }
}

export const ALL_ADAPTERS: SiteAdapter[] = [
  new GoogleFormsAdapter(),
  new GreenhouseAdapter(),
  new LeverAdapter(),
  new WorkdayAdapter(),
  new LinkedInAdapter(),
  new AshbyAdapter(),
  new SmartRecruitersAdapter(),
  new GenericAdapter() // generic fallback must be last
];

export function getAdapterForPage(url: string, document: Document): SiteAdapter {
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.matches(url, document)) {
      return adapter;
    }
  }
  return new GenericAdapter();
}
