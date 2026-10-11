import test from 'node:test';
import assert from 'node:assert';
import { GoogleFormsAdapter } from '../dist/adapters/google-forms.js';
import { getAdapterForPage } from '../dist/adapters/index.js';
import { detectFormFields } from '../dist/detector.js';
import { mapFieldToProfile, mapAllFields, normalizeOptionText, matchCandidateDegreeToOption, matchCgpaToOption } from '../dist/mapper.js';
import { setNativeValue, selectRadioOption } from '../dist/dispatcher.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { UserProfile } from '@applyflow/types';

// Robust lightweight DOM node for Node.js test runner
class MockElement {
  tagName: string;
  id: string = '';
  name: string = '';
  type: string = 'text';
  value: string = '';
  textContent: string = '';
  classList: { contains: (c: string) => boolean; add: (c: string) => void; list: string[] };
  attributes: Record<string, string> = {};
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  offsetParent: any = {};
  isConnected: boolean = true;
  checked: boolean = false;
  options?: any[];
  style: any = {};

  constructor(tagName: string, attrs: Record<string, string> = {}, text: string = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.textContent = text;
    this.id = attrs['id'] || '';
    this.name = attrs['name'] || '';
    this.type = attrs['type'] || 'text';
    const classes = (attrs['class'] || '').split(/\s+/).filter(Boolean);
    this.classList = {
      list: classes,
      contains: (c: string) => classes.includes(c),
      add: (c: string) => { if (!classes.includes(c)) classes.push(c); }
    };
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
    if (name === 'aria-checked') {
      this.checked = value === 'true';
    }
  }

  appendChild(child: MockElement) {
    child.parentElement = this;
    this.children.push(child);
  }

  contains(other: MockElement): boolean {
    if (this === other) return true;
    for (const c of this.children) {
      if (c.contains(other)) return true;
    }
    return false;
  }

  cloneNode(deep: boolean = true): MockElement {
    const clone = new MockElement(this.tagName, this.attributes, this.textContent);
    clone.id = this.id;
    clone.name = this.name;
    clone.type = this.type;
    clone.value = this.value;
    if (deep) {
      for (const c of this.children) {
        clone.appendChild(c.cloneNode(true));
      }
    }
    return clone;
  }

  remove() {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) this.parentElement.children.splice(idx, 1);
      this.parentElement = null;
    }
  }

  focus() {}

  click() {
    if (this.getAttribute('role') === 'radio') {
      this.setAttribute('aria-checked', 'true');
      this.checked = true;
    }
  }

  dispatchEvent(event: any): boolean {
    return true;
  }

  closest(selector: string): MockElement | null {
    let curr: MockElement | null = this;
    const selectors = selector.split(',').map((s) => s.trim());
    while (curr) {
      for (const sel of selectors) {
        if (curr.matchesSelector(sel)) return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  matchesSelector(sel: string): boolean {
    sel = sel.trim();
    if (sel.includes(':not(')) {
      const notParts = sel.match(/:not\(([^)]+)\)/g);
      if (notParts) {
        for (const notPart of notParts) {
          const inner = notPart.slice(5, -1);
          if (this.matchesSelector(inner)) return false;
        }
      }
      sel = sel.replace(/:not\([^)]+\)/g, '').trim();
    }
    if (!sel) return true;
    if (sel.startsWith('#')) return this.id === sel.substring(1);
    if (sel.startsWith('.')) return this.classList.contains(sel.substring(1));
    if (sel.startsWith('[')) {
      const endBracket = sel.indexOf(']');
      const content = sel.slice(1, endBracket);
      if (content.includes('=')) {
        const [k, v] = content.split('=').map((s) => s.replace(/["']/g, '').trim());
        return this.getAttribute(k) === v;
      }
      return this.getAttribute(content) !== null;
    }
    return this.tagName.toLowerCase() === sel.toLowerCase();
  }

  querySelector(selector: string): MockElement | null {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const selectors = selector.split(',').map((s) => s.trim());

    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        let matched = false;
        for (const sel of selectors) {
          if (child.matchesSelector(sel)) {
            results.push(child);
            matched = true;
            break;
          }
          if (sel.includes(' ')) {
            const parts = sel.split(/\s+/);
            if (parts.length === 2 && node.matchesSelector(parts[0]) && child.matchesSelector(parts[1])) {
              results.push(child);
              matched = true;
              break;
            }
          }
        }
        traverse(child);
      }
    };

    traverse(this);
    return results;
  }
}

// Global setup
(global as any).HTMLElement = MockElement;
(global as any).HTMLInputElement = MockElement;
(global as any).HTMLTextAreaElement = MockElement;
(global as any).HTMLSelectElement = MockElement;
(global as any).Event = class { type: string; constructor(type: string) { this.type = type; } };
(global as any).MouseEvent = class { type: string; constructor(type: string) { this.type = type; } };
(global as any).FocusEvent = class { type: string; constructor(type: string) { this.type = type; } };

function buildRealisticGoogleForm() {
  const root = new MockElement('DIV', { id: 'root' });
  (root as any).getElementById = (id: string) => root.querySelector('#' + id);
  (global as any).document = root as any;

  const form = new MockElement('FORM', {
    action: 'https://docs.google.com/forms/u/0/d/e/sample/formResponse',
    method: 'POST',
    class: 'freebirdFormviewerViewFormCard'
  });

  // Helper to build text question
  function addTextQuestion(id: string, titleText: string, inputType: string = 'text', entryName: string) {
    const card = new MockElement('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': id });
    const heading = new MockElement('DIV', { role: 'heading', 'aria-level': '3', class: 'M7eMe', id: `h_${id}` }, titleText);
    const wrapper = new MockElement('DIV', { class: 'oJeWuf' });
    const input = new MockElement('INPUT', {
      type: inputType,
      name: entryName,
      class: 'whsOnd zHQkBf',
      'aria-labelledby': `h_${id}`,
      placeholder: 'Your answer'
    });
    wrapper.appendChild(input);
    card.appendChild(heading);
    card.appendChild(wrapper);
    form.appendChild(card);
    return { card, input };
  }

  // Helper to build realistic Google Forms radio question with ARIA and Other option
  function addRadioQuestion(id: string, titleText: string, options: string[], hasOther: boolean = false) {
    const card = new MockElement('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': id });
    const heading = new MockElement('DIV', { role: 'heading', 'aria-level': '3', class: 'M7eMe', id: `h_${id}` }, titleText);
    const wrapper = new MockElement('DIV', { class: 'oJeWuf' });
    const radioGroup = new MockElement('DIV', { role: 'radiogroup', 'aria-labelledby': `h_${id}`, class: 'SGSLda' });

    const radioNodes: MockElement[] = [];

    options.forEach((optText, idx) => {
      const optContainer = new MockElement('DIV', { class: 'nWQGrd zwllIb' });
      const labelContainer = new MockElement('LABEL', { class: 'docssharedWizToggleLabeledContainer' });
      const optId = `i_${id}_${idx}`;
      const radio = new MockElement('DIV', {
        role: 'radio',
        class: 'Od2Fe',
        'aria-checked': 'false',
        'aria-label': optText,
        'data-value': optText,
        'aria-labelledby': optId
      });
      const textSpan = new MockElement('SPAN', { id: optId, class: 'aDTYNe snByac' }, optText);

      labelContainer.appendChild(radio);
      labelContainer.appendChild(textSpan);
      optContainer.appendChild(labelContainer);
      radioGroup.appendChild(optContainer);
      radioNodes.push(radio);
    });

    if (hasOther) {
      const otherContainer = new MockElement('DIV', { class: 'nWQGrd zwllIb' });
      const otherLabel = new MockElement('LABEL', { class: 'docssharedWizToggleLabeledContainer' });
      const otherRadio = new MockElement('DIV', {
        role: 'radio',
        class: 'Od2Fe',
        'aria-checked': 'false',
        'aria-label': 'Other:',
        'data-value': '__other_option__'
      });
      const otherText = new MockElement('SPAN', { class: 'aDTYNe snByac' }, 'Other:');
      const otherInput = new MockElement('INPUT', {
        type: 'text',
        class: 'Hvn9fb zHQkBf',
        'aria-label': 'Other response',
        placeholder: 'Your answer'
      });
      otherLabel.appendChild(otherRadio);
      otherLabel.appendChild(otherText);
      otherLabel.appendChild(otherInput);
      otherContainer.appendChild(otherLabel);
      radioGroup.appendChild(otherContainer);
      radioNodes.push(otherRadio);
    }

    wrapper.appendChild(radioGroup);
    card.appendChild(heading);
    card.appendChild(wrapper);
    form.appendChild(card);
    return { card, radioGroup, radioNodes };
  }

  // 1. Email
  const qEmail = addTextQuestion('1', 'Email *', 'email', 'entry.101');
  // 2. Name
  const qName = addTextQuestion('2', 'Full Name *', 'text', 'entry.102');
  // 3. Contact Number
  const qPhone = addTextQuestion('3', 'Contact number *', 'tel', 'entry.103');
  // 4. College Name
  const qCollege = addTextQuestion('4', 'College name *', 'text', 'entry.104');

  // 5. Course name (BE/B.Tech, MBA, BE/B.Tech + MBA, Other)
  const qCourse = addRadioQuestion('5', 'Course name *', ['BE/B.Tech', 'MBA', 'BE/B.Tech + MBA'], true);

  // 6. CGPA (9–10, 8–8.99, 7–7.99, Below 7)
  const qCgpa = addRadioQuestion('6', 'CGPA *', ['9–10', '8–8.99', '7–7.99', 'Below 7']);

  // 7. Year of graduation (2027, 2026, 2025)
  const qGrad = addRadioQuestion('7', 'Year of graduation *', ['2027', '2026', '2025']);

  // 8. Comfort with the job location (Yes, No)
  const qLocation = addRadioQuestion('8', 'Comfort with the job location *', ['Yes', 'No']);

  // 9. Availability for six months of office work (Yes, No)
  const qSixMonths = addRadioQuestion('9', 'Availability for six months of office work *', ['Yes', 'No']);

  // Submit button (to verify Zero Auto-Submit invariant)
  const submitBtn = new MockElement('BUTTON', { type: 'submit', class: 'uArJbe' }, 'Submit');
  form.appendChild(submitBtn);

  root.appendChild(form);

  return {
    root,
    form,
    qEmail,
    qName,
    qPhone,
    qCollege,
    qCourse,
    qCgpa,
    qGrad,
    qLocation,
    qSixMonths,
    submitBtn
  };
}

// -------------------------------------------------------------------------------------------------
// Regression Tests
// -------------------------------------------------------------------------------------------------

test('1. Detecting a radio group as one question and ignoring helper Other inputs', () => {
  const { root } = buildRealisticGoogleForm();
  const fields = detectFormFields(root as any);

  // There are 4 text fields and 5 radio fields = exactly 9 fields detected
  assert.strictEqual(fields.length, 9, `Expected exactly 9 fields, found ${fields.length}`);

  const courseField = fields.find((f) => f.detectedLabel.toLowerCase().includes('course name'));
  assert.ok(courseField, 'Course name question must be detected');
  assert.strictEqual(courseField.fieldType, 'radio', 'Course name must be classified as radio');

  // Ensure helper text input for "Other response" was NOT detected as a 10th separate question
  const otherRogueField = fields.find((f) => f.detectedLabel.toLowerCase().includes('other response'));
  assert.strictEqual(otherRogueField, undefined, 'Helper "Other response" input must not be a separate question');
});

test('2. Extracting available options accurately from Google Forms DOM', () => {
  const { root } = buildRealisticGoogleForm();
  const fields = detectFormFields(root as any);

  const courseField = fields.find((f) => f.detectedLabel.toLowerCase().includes('course name'));
  assert.ok(courseField?.options, 'Course field must have extracted options');
  assert.strictEqual(courseField.options.length, 4, 'Must extract 4 options including Other');
  assert.strictEqual(courseField.options[0].label, 'BE/B.Tech');
  assert.strictEqual(courseField.options[1].label, 'MBA');
  assert.strictEqual(courseField.options[2].label, 'BE/B.Tech + MBA');
  assert.strictEqual(courseField.options[3].label, 'Other');

  const cgpaField = fields.find((f) => f.detectedLabel.toLowerCase().includes('cgpa'));
  assert.ok(cgpaField?.options, 'CGPA field must have options');
  assert.strictEqual(cgpaField.options.length, 4);
  assert.strictEqual(cgpaField.options[0].label, '9–10');
  assert.strictEqual(cgpaField.options[1].label, '8–8.99');
});

test('3. Matching a verified degree to an exact option', () => {
  const btechProfile: UserProfile = {
    ...INITIAL_SOHEL_PROFILE,
    education: [
      {
        id: 'edu_btech',
        degree: 'Bachelor of Technology in Computer Science',
        branch: 'Computer Science',
        university: 'Jain University',
        location: 'Bangalore',
        startDate: '08/2021',
        endDate: null,
        expectedGraduation: '2025',
        cgpa: 8.5
      }
    ]
  };

  const options = [
    { label: 'BE/B.Tech', value: 'BE/B.Tech' },
    { label: 'MBA', value: 'MBA' },
    { label: 'BE/B.Tech + MBA', value: 'BE/B.Tech + MBA' },
    { label: 'Other', value: 'Other' }
  ];

  const matched = matchCandidateDegreeToOption(options, btechProfile);
  assert.ok(matched, 'B.Tech candidate must match BE/B.Tech');
  assert.strictEqual(matched.label, 'BE/B.Tech');
});

test('4. Leaving an unmatched degree unanswered (MCA/B.Pharma does not invent BE/B.Tech or Other)', () => {
  // INITIAL_SOHEL_PROFILE has MCA and B.Pharma
  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const courseField = fields.find((f) => f.detectedLabel.toLowerCase().includes('course name'));
  assert.ok(courseField, 'Course field must be mapped');
  assert.strictEqual(courseField.suggestedValue, null, 'Must leave suggestedValue null for unmatched degree');
  assert.strictEqual(courseField.confidenceLevel, 'LOW', 'Must have LOW confidence');
  assert.strictEqual(courseField.requiresConfirmation, true, 'Must require confirmation');
});

test('5. Matching a verified CGPA to its correct range', () => {
  // Sohel has cgpa = 8 in INITIAL_SOHEL_PROFILE
  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const cgpaField = fields.find((f) => f.detectedLabel.toLowerCase().includes('cgpa'));
  assert.ok(cgpaField, 'CGPA field must be found');
  assert.strictEqual(cgpaField.suggestedValue, '8–8.99', 'CGPA 8 must match range 8–8.99');
  assert.strictEqual(cgpaField.confidenceLevel, 'HIGH', 'Confidence must be HIGH');
  assert.strictEqual(cgpaField.source, 'deterministic');
});

test('6. Leaving CGPA unanswered when missing from verified profile', () => {
  const noCgpaProfile: UserProfile = {
    ...INITIAL_SOHEL_PROFILE,
    education: [
      {
        ...INITIAL_SOHEL_PROFILE.education[0],
        cgpa: null
      }
    ]
  };

  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, noCgpaProfile);

  const cgpaField = fields.find((f) => f.detectedLabel.toLowerCase().includes('cgpa'));
  assert.ok(cgpaField, 'CGPA field must be found');
  assert.strictEqual(cgpaField.suggestedValue, null, 'Missing CGPA must leave suggestedValue null');
  assert.strictEqual(cgpaField.confidenceLevel, 'LOW');
  assert.strictEqual(cgpaField.requiresConfirmation, true);
});

test('7. Matching a graduation year only when verified', () => {
  // Sohel has expectedGraduation = 2027 in INITIAL_SOHEL_PROFILE
  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const gradField = fields.find((f) => f.detectedLabel.toLowerCase().includes('year of graduation'));
  assert.ok(gradField, 'Graduation year field must be found');
  assert.strictEqual(gradField.suggestedValue, '2027', 'Must match 2027 option');
  assert.strictEqual(gradField.confidenceLevel, 'HIGH');
});

test('8. Matching Yes/No location comfort from explicit job preferences', () => {
  // Sohel has willingToRelocate = true in jobPreferences
  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const locField = fields.find((f) => f.detectedLabel.toLowerCase().includes('comfort with the job location'));
  assert.ok(locField, 'Location comfort field must be found');
  assert.strictEqual(locField.suggestedValue, 'Yes', 'Comfort with location must match Yes for willingToRelocate');
  assert.strictEqual(locField.confidenceLevel, 'HIGH');
  assert.strictEqual(locField.source, 'deterministic');
});

test('9. Requiring explicit confirmation for six-month onsite availability', () => {
  const { root } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const sixMonthField = fields.find((f) => f.detectedLabel.toLowerCase().includes('six months of office work'));
  assert.ok(sixMonthField, 'Six month availability field must be found');
  assert.strictEqual(sixMonthField.suggestedValue, null, 'Must NOT invent or auto-suggest without confirmation');
  assert.strictEqual(sixMonthField.requiresConfirmation, true, 'Must require confirmation');
  assert.strictEqual(sixMonthField.approved, false, 'Must not be auto-approved');
  assert.strictEqual(sixMonthField.confidenceLevel, 'MEDIUM');
});

test('10. Selecting the actual Google Forms radio control via dispatcher', () => {
  const { qCgpa } = buildRealisticGoogleForm();

  // Test selecting "8–8.99"
  const success = setNativeValue(qCgpa.radioGroup as any, '8–8.99');
  assert.strictEqual(success, true, 'setNativeValue must succeed');

  const selectedRadio = qCgpa.radioNodes[1];
  assert.strictEqual(selectedRadio.getAttribute('aria-checked'), 'true', 'Selected radio must become aria-checked true');
});

test('11. Verifying the selected option after interaction', () => {
  const { qLocation } = buildRealisticGoogleForm();

  const success = setNativeValue(qLocation.radioGroup as any, 'Yes');
  assert.strictEqual(success, true);

  const yesRadio = qLocation.radioNodes[0];
  const noRadio = qLocation.radioNodes[1];

  assert.strictEqual(yesRadio.getAttribute('aria-checked'), 'true', 'Yes option must be checked');
  assert.strictEqual(noRadio.getAttribute('aria-checked'), 'false', 'No option must be unchecked');
});

test('12. Avoiding selection in the wrong question container', () => {
  const { qLocation, qSixMonths } = buildRealisticGoogleForm();

  // Selecting 'Yes' in Location comfort
  setNativeValue(qLocation.radioGroup as any, 'Yes');

  assert.strictEqual(qLocation.radioNodes[0].getAttribute('aria-checked'), 'true');
  // Radios in the separate six-month question must remain untouched!
  assert.strictEqual(qSixMonths.radioNodes[0].getAttribute('aria-checked'), 'false');
  assert.strictEqual(qSixMonths.radioNodes[1].getAttribute('aria-checked'), 'false');
});

test('13. Preserving existing text-field autofill', () => {
  const { root, qName, qEmail, qPhone, qCollege } = buildRealisticGoogleForm();
  const adapter = new GoogleFormsAdapter();
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);

  const fName = fields.find((f) => f.detectedLabel.toLowerCase().includes('full name'));
  const fEmail = fields.find((f) => f.detectedLabel.toLowerCase().includes('email'));
  const fPhone = fields.find((f) => f.detectedLabel.toLowerCase().includes('contact number'));
  const fCollege = fields.find((f) => f.detectedLabel.toLowerCase().includes('college name'));

  assert.strictEqual(fName?.suggestedValue, 'Sohel Hussain');
  assert.strictEqual(fEmail?.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(fPhone?.suggestedValue, '+91 9694428769');
  assert.strictEqual(fCollege?.suggestedValue, 'Jain University');

  // Verify native dispatching works
  setNativeValue(qName.input as any, fName!.suggestedValue!);
  setNativeValue(qEmail.input as any, fEmail!.suggestedValue!);
  setNativeValue(qPhone.input as any, fPhone!.suggestedValue!);
  setNativeValue(qCollege.input as any, fCollege!.suggestedValue!);

  assert.strictEqual(qName.input.value, 'Sohel Hussain');
  assert.strictEqual(qEmail.input.value, 'sohelhussaing@gmail.com');
  assert.strictEqual(qPhone.input.value, '+91 9694428769');
  assert.strictEqual(qCollege.input.value, 'Jain University');
});

test('14. Preserving Google Forms multi-frame detection', () => {
  const adapter = getAdapterForPage('https://docs.google.com/forms/d/e/sample/viewform', {} as any);
  assert.strictEqual(adapter.name, 'Google Forms', 'Must resolve GoogleFormsAdapter');

  const shortAdapter = getAdapterForPage('https://forms.gle/xyz123', {} as any);
  assert.strictEqual(shortAdapter.name, 'Google Forms', 'Must resolve forms.gle short links');
});

test('15. Zero Auto-Submit Guarantee: Submit button is never activated', () => {
  const { root, submitBtn, qCgpa, qLocation } = buildRealisticGoogleForm();

  let submitClicked = false;
  submitBtn.click = () => {
    submitClicked = true;
  };

  // Perform autofill on radio and text fields
  setNativeValue(qCgpa.radioGroup as any, '8–8.99');
  setNativeValue(qLocation.radioGroup as any, 'Yes');

  assert.strictEqual(submitClicked, false, 'Submit button must NEVER be clicked under any circumstance');
});
