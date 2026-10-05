import test from 'node:test';
import assert from 'node:assert';
import { GoogleFormsAdapter } from '../dist/adapters/google-forms.js';
import { getAdapterForPage } from '../dist/adapters/index.js';
import { detectFormFields, resolveLabel } from '../dist/detector.js';
import { setNativeValue } from '../dist/dispatcher.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';

// Lightweight DOM node implementation for zero-dependency Node.js tests
class SimpleDOMElement {
  tagName: string;
  id: string = '';
  name: string = '';
  type: string = 'text';
  value: string = '';
  textContent: string = '';
  classList: { contains: (c: string) => boolean; add: (c: string) => void; list: string[] };
  attributes: Record<string, string> = {};
  children: SimpleDOMElement[] = [];
  parentElement: SimpleDOMElement | null = null;
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
  }

  appendChild(child: SimpleDOMElement) {
    child.parentElement = this;
    this.children.push(child);
  }

  cloneNode(deep: boolean = true): SimpleDOMElement {
    const clone = new SimpleDOMElement(this.tagName, this.attributes, this.textContent);
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
    }
  }

  dispatchEvent(event: any): boolean {
    return true;
  }

  closest(selector: string): SimpleDOMElement | null {
    let curr: SimpleDOMElement | null = this;
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
      const className = sel.substring(1);
      return this.classList.contains(className);
    }
    if (sel.startsWith('#')) {
      return this.id === sel.substring(1);
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

  querySelector(selector: string): SimpleDOMElement | null {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector: string): SimpleDOMElement[] {
    const selectors = selector.split(',').map((s) => s.trim());
    const matches: SimpleDOMElement[] = [];

    const traverse = (node: SimpleDOMElement) => {
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

// Build Google Form mock DOM matching test-pages/google-form.html
function buildGoogleFormDOM() {
  const root = new SimpleDOMElement('DIV');

  // Header Card
  const headerCard = new SimpleDOMElement('DIV', { class: 'form-card header-card' });
  const headerTitle = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '1', class: 'header-title F9vfv' }, 'Software Engineer Intern');
  const headerDesc = new SimpleDOMElement('DIV', { class: 'header-desc I3Scbe' }, 'ApplyFlow AI test form');
  headerCard.appendChild(headerTitle);
  headerCard.appendChild(headerDesc);
  root.appendChild(headerCard);

  // Form
  const form = new SimpleDOMElement('FORM', { id: 'mG61Hd', action: 'https://docs.google.com/forms/sample/formResponse', method: 'POST' });

  // 1. Full Name
  const q1 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '1' });
  const h1 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i1' }, 'Full Name *');
  const o1 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const input1 = new SimpleDOMElement('INPUT', {
    type: 'text',
    class: 'whsOnd zHQkBf',
    name: 'entry.1000001',
    'aria-labelledby': 'i1 i2',
    placeholder: 'Your answer'
  });
  input1.setAttribute('required', 'true');
  o1.appendChild(input1);
  q1.appendChild(h1);
  q1.appendChild(o1);
  form.appendChild(q1);

  // 2. Email Address
  const q2 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '2' });
  const h2 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i3' }, 'Email Address *');
  const o2 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const input2 = new SimpleDOMElement('INPUT', {
    type: 'email',
    class: 'whsOnd zHQkBf',
    name: 'entry.1000002',
    'aria-labelledby': 'i3 i4',
    placeholder: 'Your answer'
  });
  o2.appendChild(input2);
  q2.appendChild(h2);
  q2.appendChild(o2);
  form.appendChild(q2);

  // 3. Phone Number
  const q3 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '3' });
  const h3 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i5' }, 'Phone Number *');
  const o3 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const input3 = new SimpleDOMElement('INPUT', {
    type: 'tel',
    class: 'whsOnd zHQkBf',
    name: 'entry.1000003',
    'aria-labelledby': 'i5 i6',
    placeholder: 'Your answer'
  });
  o3.appendChild(input3);
  q3.appendChild(h3);
  q3.appendChild(o3);
  form.appendChild(q3);

  // 4. If selected, how soon would you be able to join?
  const q4 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '4' });
  const h4 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i7' }, 'If selected, how soon would you be able to join? *');
  const o4 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const radioGroup = new SimpleDOMElement('DIV', { role: 'radiogroup', 'aria-labelledby': 'i7', class: 'radiogroup' });

  const rOpt1 = new SimpleDOMElement('DIV', { role: 'radio', class: 'radio-option', 'aria-checked': 'false', 'aria-label': '15 days', 'data-value': '15 days' }, '15 days');
  const rOpt2 = new SimpleDOMElement('DIV', { role: 'radio', class: 'radio-option', 'aria-checked': 'false', 'aria-label': '30 days', 'data-value': '30 days' }, '30 days');
  const rOpt3 = new SimpleDOMElement('DIV', { role: 'radio', class: 'radio-option', 'aria-checked': 'false', 'aria-label': 'Immediate', 'data-value': 'Immediate' }, 'Immediate');
  radioGroup.appendChild(rOpt1);
  radioGroup.appendChild(rOpt2);
  radioGroup.appendChild(rOpt3);
  o4.appendChild(radioGroup);
  q4.appendChild(h4);
  q4.appendChild(o4);
  form.appendChild(q4);

  // 5. Why are you interested in Product Management?
  const q5 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '5' });
  const h5 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i9' }, 'Why are you interested in Product Management?');
  const o5 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const textarea1 = new SimpleDOMElement('TEXTAREA', {
    class: 'KHxj8b RDeBfm',
    name: 'entry.1000005',
    'aria-labelledby': 'i9 i10',
    placeholder: 'Your answer'
  });
  o5.appendChild(textarea1);
  q5.appendChild(h5);
  q5.appendChild(o5);
  form.appendChild(q5);

  // 6. Anything else you would like us to know?
  const q6 = new SimpleDOMElement('DIV', { role: 'listitem', class: 'form-card question-card Qr7Oae', 'data-item-id': '6' });
  const h6 = new SimpleDOMElement('DIV', { role: 'heading', 'aria-level': '3', class: 'question-title M7eMe', id: 'i11' }, 'Anything else you would like us to know?');
  const o6 = new SimpleDOMElement('DIV', { class: 'oJeWuf' });
  const textarea2 = new SimpleDOMElement('TEXTAREA', {
    class: 'KHxj8b RDeBfm',
    name: 'entry.1000006',
    'aria-labelledby': 'i11 i12',
    placeholder: 'Your answer'
  });
  o6.appendChild(textarea2);
  q6.appendChild(h6);
  q6.appendChild(o6);
  form.appendChild(q6);

  root.appendChild(form);

  return { root, form, input1, input2, input3, radioGroup, rOpt1, rOpt2, rOpt3, textarea1, textarea2 };
}

test('Google Forms Adapter - Detects, Maps, and Fills DOM Form Correctly', () => {
  const { root, input1, radioGroup, rOpt1 } = buildGoogleFormDOM();

  // Setup globals for test
  (root as any).getElementById = (id: string) => root.querySelector('#' + id);
  (global as any).document = root as any;
  (global as any).HTMLElement = SimpleDOMElement as any;
  (global as any).HTMLInputElement = SimpleDOMElement as any;
  (global as any).HTMLTextAreaElement = SimpleDOMElement as any;
  (global as any).HTMLSelectElement = SimpleDOMElement as any;
  (global as any).Event = class { constructor(type: string) {} };
  (global as any).FocusEvent = class { constructor(type: string) {} };

  // 1. Adapter resolution
  const adapter = getAdapterForPage('https://docs.google.com/forms/d/e/sample/viewform', root as any);
  assert.strictEqual(adapter.name, 'Google Forms', 'Must resolve to GoogleFormsAdapter');

  // 2. Job / Form Title Extraction
  const jobInfo = adapter.extractJobInfo ? adapter.extractJobInfo(root as any) : null;
  assert.strictEqual(jobInfo?.title, 'Software Engineer Intern');

  // 3. Detect and Map Fields
  const fields = adapter.detectAndMap(root as any, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(fields.length, 6, `Expected exactly 6 fields detected, found ${fields.length}`);

  // Field 1: Full Name
  const f1 = fields.find((f) => f.detectedLabel === 'Full Name');
  assert.ok(f1, 'Full Name field must be detected');
  assert.strictEqual(f1.suggestedValue, 'Sohel Hussain');
  assert.strictEqual(f1.confidenceLevel, 'HIGH');
  assert.strictEqual(f1.source, 'deterministic');

  // Field 2: Email Address
  const f2 = fields.find((f) => f.detectedLabel === 'Email Address');
  assert.ok(f2, 'Email Address field must be detected');
  assert.strictEqual(f2.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(f2.confidenceLevel, 'HIGH');

  // Field 3: Phone Number
  const f3 = fields.find((f) => f.detectedLabel === 'Phone Number');
  assert.ok(f3, 'Phone Number field must be detected');
  assert.strictEqual(f3.suggestedValue, '+91 9694428769');
  assert.strictEqual(f3.confidenceLevel, 'HIGH');

  // Field 4: If selected, how soon would you be able to join?
  const f4 = fields.find((f) => f.detectedLabel.includes('how soon would you be able to join'));
  assert.ok(f4, 'Joining availability question must be detected');
  assert.strictEqual(f4.fieldType, 'radio');
  assert.strictEqual(f4.suggestedValue, '15 days');
  assert.strictEqual(f4.confidenceLevel, 'HIGH');
  assert.strictEqual(f4.source, 'deterministic');
  assert.ok(f4.options && f4.options.length === 3, 'Must detect 3 radio options');

  // Field 5: Why are you interested in Product Management?
  const f5 = fields.find((f) => f.detectedLabel.includes('Product Management'));
  assert.ok(f5, 'Role motivation question must be detected');
  assert.strictEqual(f5.category, 'ROLE_MOTIVATION');
  assert.strictEqual(f5.source, 'ai');
  assert.strictEqual(f5.confidenceLevel, 'MEDIUM');
  assert.strictEqual(f5.requiresConfirmation, true);

  // Field 6: Anything else you would like us to know?
  const f6 = fields.find((f) => f.detectedLabel.includes('Anything else'));
  assert.ok(f6, 'Generic open-ended question must be detected');
  assert.strictEqual(f6.category, 'UNKNOWN');
  assert.strictEqual(f6.source, 'unmapped');
  assert.strictEqual(f6.confidenceLevel, 'LOW');
  assert.strictEqual(f6.requiresConfirmation, true);
  assert.strictEqual(f6.suggestedValue, null);

  // 4. Test Autofill Execution (setNativeValue) on controls
  const nameSuccess = setNativeValue(input1 as any, f1.suggestedValue!);
  assert.strictEqual(nameSuccess, true);
  assert.strictEqual(input1.value, 'Sohel Hussain');

  const radioSuccess = setNativeValue(radioGroup as any, f4.suggestedValue!);
  assert.strictEqual(radioSuccess, true);
  assert.strictEqual(rOpt1.getAttribute('aria-checked'), 'true');
});
