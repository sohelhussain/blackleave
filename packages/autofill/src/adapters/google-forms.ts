import { DetectedField, UserProfile } from '@applyflow/types';
import { SiteAdapter } from './index.js';
import { detectFormFields } from '../detector.js';
import { mapAllFields } from '../mapper.js';

export class GoogleFormsAdapter implements SiteAdapter {
  name = 'Google Forms';

  matches(url: string, document: Document): boolean {
    return (
      url.includes('docs.google.com/forms') ||
      url.includes('forms.gle') ||
      !!document.querySelector(
        'form[action*="formResponse"], form[action*="docs.google.com/forms"], [jsmodel*="v3DuG"], .freebirdFormviewerViewFormCard, .Qr7Oae'
      )
    );
  }

  extractJobInfo(document: Document): { company?: string; title?: string; description?: string } | null {
    // 1. Title from heading or document title
    const titleEl =
      document.querySelector('[role="heading"][aria-level="1"]') ||
      document.querySelector('.F9vfv') ||
      document.querySelector('.freebirdFormviewerViewHeaderTitle') ||
      document.querySelector('h1');

    let title = titleEl?.textContent?.trim();
    if (!title && document.title) {
      title = document.title.replace(/\s*-\s*Google Forms\s*$/i, '').trim();
    }

    // 2. Form description
    const descEl =
      document.querySelector('.freebirdFormviewerViewHeaderDescription') ||
      document.querySelector('.I3Scbe') ||
      document.querySelector('.geS5n') ||
      document.querySelector('[role="heading"][aria-level="1"] + div');

    const description = descEl?.textContent?.trim() || undefined;

    return {
      title: title || 'Software Engineer Intern',
      company: 'Google Forms Job Application',
      description
    };
  }

  detectAndMap(document: Document, profile: UserProfile): DetectedField[] {
    const rawFields = detectFormFields(document);
    return mapAllFields(rawFields, profile);
  }
}
