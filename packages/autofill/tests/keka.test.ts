import test from 'node:test';
import assert from 'node:assert';
import { KekaAdapter } from '../dist/adapters/keka.js';
import { getAdapterForPage } from '../dist/adapters/index.js';
import { setNativeValue } from '../dist/dispatcher.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';

// Lightweight DOM element for testing Keka ATS
class MockElement {
  tagName: string;
  id: string = '';
  name: string = '';
  type: string = 'text';
  value: string = '';
  textContent: string = '';
  readOnly: boolean = false;
  checked: boolean = false;
  selectedIndex: number = -1;
  options: Array<{ value: string; text: string; label?: string }> = [];
  attributes: Record<string, string> = {};
  children: MockElement[] = [];
  parentElement: MockElement | null = null;
  offsetParent: any = {};
  isConnected: boolean = true;
  style: any = {};
  classList: {
    contains: (c: string) => boolean;
    add: (c: string) => void;
  };

  constructor(tagName: string, attrs: Record<string, string> = {}, text: string = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.textContent = text;
    this.id = attrs['id'] || '';
    this.name = attrs['name'] || '';
    this.type = attrs['type'] || (tagName.toLowerCase() === 'select' ? 'select' : 'text');
    this.readOnly = attrs['readonly'] !== undefined;
    this.value = attrs['value'] || '';

    const classes = (attrs['class'] || '').split(/\s+/).filter(Boolean);
    this.classList = {
      contains: (c: string) => classes.includes(c),
      add: (c: string) => { if (!classes.includes(c)) classes.push(c); }
    };
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  appendChild(child: MockElement) {
    child.parentElement = this;
    this.children.push(child);
  }

  cloneNode(deep: boolean = true): MockElement {
    const clone = new MockElement(this.tagName, this.attributes, this.textContent);
    clone.id = this.id;
    clone.name = this.name;
    clone.type = this.type;
    clone.value = this.value;
    clone.readOnly = this.readOnly;
    clone.checked = this.checked;
    clone.selectedIndex = this.selectedIndex;
    clone.options = [...this.options];
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
  click() {}
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
    if (sel.startsWith('.')) {
      return this.classList.contains(sel.substring(1));
    }
    if (sel.startsWith('#')) {
      const idPart = sel.substring(1).replace(/\\/g, '');
      return this.id === idPart;
    }
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
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const selectors = selector.split(',').map((s) => s.trim());
    const matches: MockElement[] = [];

    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        let isMatch = false;
        for (const sel of selectors) {
          if (child.matchesSelector(sel)) {
            isMatch = true;
            break;
          }
        }
        if (isMatch) matches.push(child);
        traverse(child);
      }
    };

    traverse(this);
    return matches;
  }
}

class MockDocument {
  body: MockElement;
  title: string = 'Apply for Frontend Engineer - Keka Hire';
  constructor() {
    this.body = new MockElement('BODY');
  }

  querySelector(selector: string): MockElement | null {
    if (this.body.matchesSelector(selector)) return this.body;
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector: string): MockElement[] {
    const results = this.body.querySelectorAll(selector);
    if (this.body.matchesSelector(selector)) results.unshift(this.body);
    return results;
  }

  getElementById(id: string): MockElement | null {
    return this.querySelector(`#${id}`);
  }
}

function setupMockKekaDOM(): { doc: MockDocument; form: MockElement } {
  const doc = new MockDocument();

  // Job details header
  const headerContainer = new MockElement('DIV', { class: 'banner' });
  const h1 = new MockElement('H1', { class: 'font-large-5 kch-text-heading', title: 'Frontend Engineer' }, 'Frontend Engineer');
  headerContainer.appendChild(h1);
  const orgLogo = new MockElement('IMG', { class: 'org-logo', alt: 'Nubra' });
  headerContainer.appendChild(orgLogo);
  const metaDesc = new MockElement('META', { name: 'description', content: 'Frontend Engineer at Nubra / Zanskar. 1-3 years experience.' });
  headerContainer.appendChild(metaDesc);
  doc.body.appendChild(headerContainer);

  // Form container
  const form = new MockElement('FORM', { id: 'jobApplicationForm', name: 'jobApplicationForm' });
  doc.body.appendChild(form);

  const addField = (parent: MockElement, labelText: string, dataContent: string, inputEl: MockElement, forAttr?: string) => {
    const group = new MockElement('DIV', { class: 'form-group mb-4 col-sm-6' });
    const validation = new MockElement('DIV', { class: 'validation' });
    const label = new MockElement('LABEL', { for: forAttr || inputEl.id || '', 'data-content': dataContent }, labelText);
    validation.appendChild(label);
    validation.appendChild(inputEl);
    group.appendChild(validation);
    parent.appendChild(group);
  };

  // 1. First Name
  const firstName = new MockElement('INPUT', { type: 'text', id: 'firstName', name: 'firstName', class: 'form-control' });
  addField(form, 'First Name *', 'First Name', firstName, 'firstName');

  // 2. Middle Name
  const middleName = new MockElement('INPUT', { type: 'text', id: 'middleName', name: 'middleName', class: 'form-control' });
  addField(form, 'Middle Name', 'Middle Name', middleName, 'middleName');

  // 3. Last Name
  const lastName = new MockElement('INPUT', { type: 'text', id: 'lastName', name: 'lastName', class: 'form-control' });
  addField(form, 'Last Name *', 'Last Name', lastName, 'lastName');

  // 4. Mobile Phone (Country code select + Phone input)
  const phoneGroup = new MockElement('DIV', { class: 'form-group mb-4 col-sm-6' });
  const phoneValidation = new MockElement('DIV', { class: 'validation' });
  const phoneLabel = new MockElement('LABEL', { for: 'phone', 'data-content': 'Mobile Phone' }, 'Mobile Phone *');
  phoneValidation.appendChild(phoneLabel);

  const countrySelect = new MockElement('SELECT', { id: 'mobilePhone.countryCode', name: 'mobilePhone.countryCode', class: 'countryCode' });
  countrySelect.options = [
    { value: '', text: 'Select' },
    { value: '+91', text: '+91', label: 'India' },
    { value: '+1', text: '+1', label: 'United States' },
    { value: '+44', text: '+44', label: 'United Kingdom' }
  ];
  const s2Rendered = new MockElement('SPAN', { id: 'select2-mobilePhone.countryCode-container', class: 'select2-selection__rendered' }, 'Select');
  phoneValidation.appendChild(countrySelect);
  phoneValidation.appendChild(s2Rendered);

  const phoneInput = new MockElement('INPUT', { type: 'text', id: 'mobilePhone.number', name: 'mobilePhone.number', placeholder: 'Mobile Phone' });
  phoneValidation.appendChild(phoneInput);
  phoneGroup.appendChild(phoneValidation);
  form.appendChild(phoneGroup);

  // 5. Email
  const email = new MockElement('INPUT', { type: 'email', id: 'email', name: 'email', class: 'form-control' });
  addField(form, 'Email *', 'Email', email, 'email');

  // 6. Gender
  const genderSelect = new MockElement('SELECT', { id: 'gender', name: 'gender', class: 'form-control' });
  genderSelect.options = [
    { value: '', text: 'Select' },
    { value: '1', text: 'Male' },
    { value: '2', text: 'Female' },
    { value: '3', text: 'Non-binary' },
    { value: '4', text: "Don't want to disclose" }
  ];
  addField(form, 'Gender', 'Gender', genderSelect, 'field_Identifier');

  // 7. Nationality
  const nationalitySelect = new MockElement('SELECT', { id: 'nationality', name: 'standardFields.nationality.answer', class: 'form-control' });
  nationalitySelect.options = [
    { value: '', text: 'Select' },
    { value: 'e5f1f0a1-india-guid', text: 'India' },
    { value: 'caa688d1-canada-guid', text: 'Canada' },
    { value: '9f83b709-germany-guid', text: 'Germany' }
  ];
  addField(form, 'Nationality', 'Nationality', nationalitySelect, 'field_Identifier');

  // 8. Experience (Years & Months)
  const expGroup = new MockElement('DIV', { class: 'form-group mb-4 col-sm-6' });
  const expValidation = new MockElement('DIV', { class: 'validation' });
  const expLabel = new MockElement('LABEL', { for: 'workExperience', 'data-content': 'Experience (in years)' }, 'Experience (in years)');
  expValidation.appendChild(expLabel);

  const expYears = new MockElement('INPUT', { type: 'text', id: 'workExperience', name: 'workExperience.years' });
  expValidation.appendChild(expYears);
  const yearsStatic = new MockElement('INPUT', { value: 'Years', readonly: 'true' });
  expValidation.appendChild(yearsStatic);

  const expMonths = new MockElement('SELECT', { name: 'workExperience.months', class: 'workExperienceMonths' });
  expMonths.options = Array.from({ length: 12 }, (_, i) => ({ value: String(i), text: String(i) }));
  expValidation.appendChild(expMonths);
  const monthsStatic = new MockElement('INPUT', { value: 'Months', readonly: 'true' });
  expValidation.appendChild(monthsStatic);

  expGroup.appendChild(expValidation);
  form.appendChild(expGroup);

  // 9. Expected Salary (Currency + Amount)
  const expSalGroup = new MockElement('DIV', { class: 'form-group mb-4 col-sm-6' });
  const expSalVal = new MockElement('DIV', { class: 'validation' });
  const expSalLabel = new MockElement('LABEL', { for: 'expectedSalary', 'data-content': 'Expected Salary' }, 'Expected Salary *');
  expSalVal.appendChild(expSalLabel);

  const expSalCurr = new MockElement('INPUT', { id: 'expectedSalary.currency', name: 'expectedSalary.currency', value: 'INR', readonly: 'true' });
  expSalVal.appendChild(expSalCurr);
  const expSalAmt = new MockElement('INPUT', { type: 'text', id: 'expectedSalary', name: 'expectedSalary.amount' });
  expSalVal.appendChild(expSalAmt);
  expSalGroup.appendChild(expSalVal);
  form.appendChild(expSalGroup);

  // 10. Current Salary (Currency + Amount)
  const curSalGroup = new MockElement('DIV', { class: 'form-group mb-4 col-sm-6' });
  const curSalVal = new MockElement('DIV', { class: 'validation' });
  const curSalLabel = new MockElement('LABEL', { for: 'currentSalary', 'data-content': 'Current Salary' }, 'Current Salary *');
  curSalVal.appendChild(curSalLabel);

  const curSalCurr = new MockElement('SELECT', { id: 'currentSalary.currency', name: 'currentSalary.currency', class: 'currentSalary' });
  curSalCurr.options = [
    { value: '', text: 'Select' },
    { value: 'INR', text: 'INR' },
    { value: 'USD', text: 'USD' }
  ];
  curSalVal.appendChild(curSalCurr);
  const curSalAmt = new MockElement('INPUT', { type: 'text', id: 'currentSalary', name: 'currentSalary.amount' });
  curSalVal.appendChild(curSalAmt);
  curSalGroup.appendChild(curSalVal);
  form.appendChild(curSalGroup);

  // 11. Location Preference
  const locPrefSelect = new MockElement('SELECT', { id: 'locationPreference', name: 'standardFields.locationPreference.answer' });
  locPrefSelect.options = [
    { value: '', text: 'Select an option' },
    { value: 'Bangalore', text: 'Bangalore' }
  ];
  addField(form, 'Preferred Location', 'Preferred Location', locPrefSelect, 'field_Identifier');

  // 12. Available to Join (in days)
  const availInput = new MockElement('INPUT', { type: 'number', id: 'availability', name: 'standardFields.availability.answer' });
  addField(form, 'Available To Join (in days) *', 'Available To Join (in days)', availInput, 'availability');

  // 13. Current Location
  const currLocInput = new MockElement('INPUT', { type: 'text', id: 'currentLocation', name: 'standardFields.currentLocation.answer' });
  addField(form, 'Current Location', 'Current Location', currLocInput, 'currentLocation');

  // 14. Skills
  const skillsInput = new MockElement('INPUT', { type: 'text', id: 'skills', name: '', placeholder: 'Add new skill' });
  addField(form, 'Skills', 'Skills', skillsInput, 'skills');

  // 15. Invariants: Candidate Consent
  const consent = new MockElement('INPUT', { type: 'checkbox', id: 'candidateConsent', name: 'candidateConsent', value: '1' });
  form.appendChild(consent);

  // 16. Invariants: Captcha
  const captcha = new MockElement('INPUT', { type: 'text', id: 'captcha', name: 'captcha', placeholder: 'Captcha' });
  form.appendChild(captcha);

  // 17. Submit button
  const submitBtn = new MockElement('BUTTON', { id: 'jobApplicationSubmitButton' }, 'Apply Now');
  form.appendChild(submitBtn);

  // Select2 helper elements
  const s2Helper = new MockElement('INPUT', { class: 'select2-search__field', role: 'searchbox' });
  form.appendChild(s2Helper);

  // Setup globals for node test environment
  (global as any).document = doc as any;
  (global as any).HTMLElement = MockElement as any;
  (global as any).HTMLInputElement = MockElement as any;
  (global as any).HTMLSelectElement = MockElement as any;
  (global as any).HTMLTextAreaElement = MockElement as any;
  (global as any).Event = class { constructor(type: string) {} };
  (global as any).FocusEvent = class { constructor(type: string) {} };
  (global as any).CustomEvent = class { constructor(type: string, opts?: any) {} };

  return { doc, form };
}

test('Keka Adapter - Matches URL and DOM structure accurately', () => {
  const { doc } = setupMockKekaDOM();
  const adapter = getAdapterForPage('https://zanskar.keka.com/careers/applyjob/85665', doc as any);
  assert.strictEqual(adapter.name, 'Keka', 'Must resolve to KekaAdapter');

  const info = adapter.extractJobInfo ? adapter.extractJobInfo(doc as any) : null;
  assert.strictEqual(info?.title, 'Frontend Engineer');
  assert.strictEqual(info?.company, 'Nubra');
});

test('Keka Adapter - Excludes Select2 search inputs and decorative readonly tags', () => {
  const { doc } = setupMockKekaDOM();
  const adapter = new KekaAdapter();
  const fields = adapter.detectAndMap(doc as any, INITIAL_SOHEL_PROFILE);

  // Must not include "Years" or "Months" static decorative inputs
  const hasStaticYears = fields.some((f) => f.detectedLabel === 'Years' || f.detectedLabel === 'Months');
  assert.strictEqual(hasStaticYears, false, 'Decorative readonly inputs must not be detected as fields');

  // Must not include select2 searchbox
  const hasSelect2Search = fields.some((f) => f.targetRole === 'searchbox');
  assert.strictEqual(hasSelect2Search, false, 'Select2 search inputs must be excluded');
});

test('Keka Adapter - Maps visible candidate profile fields with truthful high confidence', () => {
  const { doc } = setupMockKekaDOM();
  const adapter = new KekaAdapter();
  const fields = adapter.detectAndMap(doc as any, INITIAL_SOHEL_PROFILE);

  const getField = (id: string) => fields.find((f) => f.htmlId === id || f.name === id);

  // 1. First Name
  const fn = getField('firstName');
  assert.ok(fn, 'firstName field must be detected');
  assert.strictEqual(fn?.suggestedValue, 'Sohel');
  assert.strictEqual(fn?.confidenceLevel, 'HIGH');

  // 2. Middle Name
  const mn = getField('middleName');
  assert.ok(mn, 'middleName field must be detected');
  assert.strictEqual(mn?.suggestedValue, '');
  assert.strictEqual(mn?.confidenceLevel, 'HIGH');

  // 3. Last Name
  const ln = getField('lastName');
  assert.ok(ln, 'lastName field must be detected');
  assert.strictEqual(ln?.suggestedValue, 'Hussain');
  assert.strictEqual(ln?.confidenceLevel, 'HIGH');

  // 4. Country Code
  const cc = getField('mobilePhone.countryCode');
  assert.ok(cc, 'mobilePhone.countryCode field must be detected');
  assert.strictEqual(cc?.suggestedValue, '+91');
  assert.strictEqual(cc?.confidenceLevel, 'HIGH');

  // 5. Phone Number
  const phone = getField('mobilePhone.number');
  assert.ok(phone, 'mobilePhone.number field must be detected');
  assert.strictEqual(phone?.suggestedValue, '9694428769');
  assert.strictEqual(phone?.confidenceLevel, 'HIGH');

  // 6. Email
  const em = getField('email');
  assert.ok(em, 'email field must be detected');
  assert.strictEqual(em?.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(em?.confidenceLevel, 'HIGH');

  // 7. Gender
  const gen = getField('gender');
  assert.ok(gen, 'gender field must be detected');
  assert.strictEqual(gen?.suggestedValue, '1', 'Male must map to value 1');
  assert.strictEqual(gen?.confidenceLevel, 'HIGH');

  // 8. Nationality
  const nat = getField('nationality');
  assert.ok(nat, 'nationality field must be detected');
  assert.strictEqual(nat?.suggestedValue, 'e5f1f0a1-india-guid', 'India must map to target GUID');
  assert.strictEqual(nat?.confidenceLevel, 'HIGH');

  // 9. Work Experience (Years & Months)
  const expY = getField('workExperience');
  assert.ok(expY, 'workExperience field must be detected');
  assert.strictEqual(expY?.suggestedValue, '0', 'Experience years calculated from profile');
  assert.strictEqual(expY?.confidenceLevel, 'HIGH');

  const expM = getField('workExperience.months');
  assert.ok(expM, 'workExperience.months field must be detected');
  assert.strictEqual(expM?.suggestedValue, '10', 'Experience remaining months calculated from profile');
  assert.strictEqual(expM?.confidenceLevel, 'HIGH');

  // 10. Expected Salary (Currency is HIGH, Amount is LOW for review if not configured)
  const esCurr = getField('expectedSalary.currency');
  assert.strictEqual(esCurr?.suggestedValue, 'INR');
  assert.strictEqual(esCurr?.confidenceLevel, 'HIGH');

  const esAmt = getField('expectedSalary');
  assert.strictEqual(esAmt?.suggestedValue, null);
  assert.strictEqual(esAmt?.confidenceLevel, 'LOW');
  assert.strictEqual(esAmt?.requiresConfirmation, true);

  // 11. Current Salary
  const csCurr = getField('currentSalary.currency');
  assert.strictEqual(csCurr?.suggestedValue, 'INR');
  assert.strictEqual(csCurr?.confidenceLevel, 'HIGH');

  const csAmt = getField('currentSalary');
  assert.strictEqual(csAmt?.suggestedValue, null);
  assert.strictEqual(csAmt?.confidenceLevel, 'LOW');
  assert.strictEqual(csAmt?.requiresConfirmation, true);

  // 12. Preferred Location
  const loc = getField('locationPreference');
  assert.ok(loc, 'locationPreference field must be detected');
  assert.strictEqual(loc?.suggestedValue, 'Bangalore');
  assert.strictEqual(loc?.confidenceLevel, 'HIGH');

  // 13. Available to Join (numeric days)
  const avail = getField('availability');
  assert.ok(avail, 'availability field must be detected');
  assert.strictEqual(avail?.suggestedValue, '15', 'Numeric days extracted from notice period');
  assert.strictEqual(avail?.confidenceLevel, 'HIGH');

  // 14. Current Location
  const curLoc = getField('currentLocation');
  assert.ok(curLoc, 'currentLocation field must be detected');
  assert.strictEqual(curLoc?.suggestedValue, 'Bangalore');
  assert.strictEqual(curLoc?.confidenceLevel, 'HIGH');

  // 15. Skills
  const sk = getField('skills');
  assert.ok(sk, 'skills field must be detected');
  assert.strictEqual(sk?.confidenceLevel, 'HIGH');
});

test('Keka Adapter - Safety Invariants: Consent and Captcha are NEVER marked ready', () => {
  const { doc } = setupMockKekaDOM();
  const adapter = new KekaAdapter();
  const fields = adapter.detectAndMap(doc as any, INITIAL_SOHEL_PROFILE);

  const consent = fields.find((f) => f.htmlId === 'candidateConsent');
  assert.ok(consent, 'candidateConsent must be detected for user review');
  assert.strictEqual(consent?.suggestedValue, null, 'Consent checkbox must never have pre-filled true');
  assert.strictEqual(consent?.confidenceLevel, 'LOW');
  assert.strictEqual(consent?.requiresConfirmation, true);

  const captcha = fields.find((f) => f.htmlId === 'captcha');
  assert.ok(captcha, 'captcha must be detected for manual completion');
  assert.strictEqual(captcha?.suggestedValue, null, 'Captcha must never be auto-solved');
  assert.strictEqual(captcha?.confidenceLevel, 'LOW');
  assert.strictEqual(captcha?.requiresConfirmation, true);
});

test('DOM Dispatcher - Sets Select2 dropdowns, number inputs, and enforces zero auto-submit invariants', () => {
  const { doc } = setupMockKekaDOM();

  // 1. Country code select
  const countrySelect = doc.getElementById('mobilePhone.countryCode') as unknown as HTMLElement;
  const ccResult = setNativeValue(countrySelect, '+91');
  assert.strictEqual(ccResult, true, 'Must successfully select +91');
  assert.strictEqual((countrySelect as any).value, '+91');
  assert.strictEqual((countrySelect as any).selectedIndex, 1);

  // 2. Gender select with option value 1
  const genderSelect = doc.getElementById('gender') as unknown as HTMLElement;
  const genResult = setNativeValue(genderSelect, '1');
  assert.strictEqual(genResult, true, 'Must select Gender option 1');
  assert.strictEqual((genderSelect as any).value, '1');

  // 3. Nationality select with GUID
  const nationalitySelect = doc.getElementById('nationality') as unknown as HTMLElement;
  const natResult = setNativeValue(nationalitySelect, 'e5f1f0a1-india-guid');
  assert.strictEqual(natResult, true, 'Must select Nationality GUID');
  assert.strictEqual((nationalitySelect as any).value, 'e5f1f0a1-india-guid');

  // 4. Availability number input (sanitizes "15 days" to 15)
  const availInput = doc.getElementById('availability') as unknown as HTMLElement;
  const availResult = setNativeValue(availInput, '15');
  assert.strictEqual(availResult, true, 'Must set availability number input');
  assert.strictEqual((availInput as any).value, '15');

  // 5. Invariant: Dispatcher REJECTS candidateConsent checkbox
  const consent = doc.getElementById('candidateConsent') as unknown as HTMLElement;
  const consentResult = setNativeValue(consent, true);
  assert.strictEqual(consentResult, false, 'Dispatcher MUST reject autofilling candidateConsent');
  assert.strictEqual((consent as any).checked, false, 'Consent checkbox must remain unchecked');

  // 6. Invariant: Dispatcher REJECTS captcha input
  const captcha = doc.getElementById('captcha') as unknown as HTMLElement;
  const captchaResult = setNativeValue(captcha, '1234');
  assert.strictEqual(captchaResult, false, 'Dispatcher MUST reject autofilling captcha');
  assert.strictEqual((captcha as any).value, '', 'Captcha must remain empty');
});
