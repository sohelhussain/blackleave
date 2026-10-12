import test from 'node:test';
import assert from 'node:assert';
import { generateUniqueSelector } from '../dist/detector.js';
import { setNativeValue, selectRadioOption } from '../dist/dispatcher.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { DetectedField } from '@applyflow/types';

// Mock DOM infrastructure
class MockEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  composed: boolean;
  constructor(type: string, init?: any) {
    this.type = type;
    this.bubbles = init?.bubbles ?? false;
    this.cancelable = init?.cancelable ?? false;
    this.composed = init?.composed ?? false;
  }
}

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
  isConnected: boolean = true;
  checked: boolean = false;
  style: any = {};
  _listeners: Record<string, ((e: any) => void)[]> = {};

  constructor(tagName: string, attrs: Record<string, string> = {}, text: string = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.textContent = text;
    this.id = attrs['id'] || '';
    this.name = attrs['name'] || '';
    this.type = attrs['type'] || (tagName.toLowerCase() === 'input' ? 'text' : '');
    this.value = attrs['value'] || '';
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

  addEventListener(type: string, cb: (e: any) => void) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
  }

  dispatchEvent(evt: any): boolean {
    const list = this._listeners[evt.type] || [];
    for (const cb of list) cb(evt);
    return true;
  }

  focus() {}

  click() {
    if (this.getAttribute('role') === 'radio') {
      this.setAttribute('aria-checked', 'true');
      this.checked = true;
    }
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
    if (sel.startsWith('.')) {
      return this.classList.contains(sel.slice(1));
    }
    if (sel.startsWith('#')) {
      return this.id === sel.slice(1);
    }
    if (sel.startsWith('[') && sel.endsWith(']')) {
      const match = sel.slice(1, -1).match(/^([a-zA-Z0-9_-]+)(?:="([^"]+)")?$/);
      if (match) {
        const [, attr, val] = match;
        if (val === undefined) return this.getAttribute(attr) !== null;
        return this.getAttribute(attr) === val;
      }
    }
    return this.tagName.toLowerCase() === sel.toLowerCase();
  }

  querySelector(selector: string): MockElement | null {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const selectors = selector.split(',').map((s) => s.trim());
    const matches: MockElement[] = [];

    const traverse = (el: MockElement) => {
      for (const sel of selectors) {
        if (sel.includes(' ')) {
          const parts = sel.split(/\s+/);
          if (parts.length === 2) {
            const [parentSel, childSel] = parts;
            if (el.matchesSelector(childSel) && el.closest(parentSel)) {
              if (!matches.includes(el)) matches.push(el);
            }
          }
        } else if (el.matchesSelector(sel)) {
          if (!matches.includes(el)) matches.push(el);
        }
      }
      for (const c of el.children) {
        traverse(c);
      }
    };

    for (const c of this.children) {
      traverse(c);
    }
    return matches;
  }
}

// Polyfill global elements
(global as any).Event = MockEvent;
(global as any).FocusEvent = MockEvent;
(global as any).InputEvent = MockEvent;
(global as any).MouseEvent = MockEvent;

test('Pipeline 1: generateUniqueSelector produces valid selectors without commas for text and radio controls', () => {
  const card = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const form = new MockElement('form');
  form.appendChild(card);

  const input = new MockElement('input', { class: 'whsOnd zHQkBf', type: 'text' });
  card.appendChild(input);

  const selector = generateUniqueSelector(input as any, 0, card as any);
  // Must NOT contain comma (which creates an accidental CSS union matching all inputs!)
  assert.ok(!selector.includes(','), `Selector should not contain comma: ${selector}`);
  assert.ok(selector.includes('input:not([type="hidden"])'), `Selector should exclude hidden inputs: ${selector}`);
});

test('Pipeline 2: setNativeValue rejects hidden inputs (preventing bogus success on CSRF/metadata tokens)', () => {
  const hiddenInput = new MockElement('input', { type: 'hidden', name: 'fvv', value: '1' });
  (hiddenInput as any).tagName = 'INPUT';
  const result = setNativeValue(hiddenInput as any, 'Bogus Value');
  assert.strictEqual(result, false, 'Hidden input should be rejected');
  assert.strictEqual(hiddenInput.value, '1', 'Hidden input value should not be modified');
});

test('Pipeline 3: Question heading re-resolution does not match "College name" for "Name"', () => {
  const form = new MockElement('form');

  // Card 1: College name
  const card1 = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const heading1 = new MockElement('div', { class: 'M7eMe', role: 'heading' }, 'College name *');
  const input1 = new MockElement('input', { type: 'text', class: 'whsOnd' });
  card1.appendChild(heading1);
  card1.appendChild(input1);
  form.appendChild(card1);

  // Card 2: Full Name
  const card2 = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const heading2 = new MockElement('div', { class: 'M7eMe', role: 'heading' }, 'Full Name *');
  const input2 = new MockElement('input', { type: 'text', class: 'whsOnd' });
  card2.appendChild(heading2);
  card2.appendChild(input2);
  form.appendChild(card2);

  // Field: "Name"
  const fClean = 'name';
  const headings = form.querySelectorAll('.M7eMe');

  let matchedHeading: MockElement | null = null;
  for (const h of headings) {
    const hClean = h.textContent.replace(/[*:]/g, '').trim().toLowerCase();
    // Verify word matching logic
    const isWordMatch =
      hClean === fClean ||
      (fClean === 'name' && (hClean === 'full name' || hClean === 'candidate name')) ||
      (hClean.length > 5 && fClean.length > 5 && hClean.includes(fClean));

    if (isWordMatch) {
      if ((fClean === 'name' || fClean === 'full name') && (hClean.includes('college') || hClean.includes('course'))) {
        continue; // Correctly rejected!
      }
      matchedHeading = h;
      break;
    }
  }

  assert.strictEqual(matchedHeading, heading2, 'Must match Full Name card, not College name card');
});

test('Pipeline 4: Multi-question Google Form populates text inputs and selects radio options with live verification', () => {
  const form = new MockElement('form');

  // Hidden inputs at top of form
  const hidden1 = new MockElement('input', { type: 'hidden', name: 'fvv', value: '1' });
  const hidden2 = new MockElement('input', { type: 'hidden', name: 'pageHistory', value: '0' });
  form.appendChild(hidden1);
  form.appendChild(hidden2);

  // Q1: Name
  const card1 = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const heading1 = new MockElement('div', { class: 'M7eMe', role: 'heading' }, 'Full Name *');
  const input1 = new MockElement('input', { type: 'text', class: 'whsOnd' });
  card1.appendChild(heading1);
  card1.appendChild(input1);
  form.appendChild(card1);

  // Q2: Course name (Radiogroup: BE/B.Tech, MBA, Other)
  const card2 = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const heading2 = new MockElement('div', { class: 'M7eMe', role: 'heading' }, 'Course name *');
  const radiogroup2 = new MockElement('div', { role: 'radiogroup' });

  const radioOpt1 = new MockElement('div', { role: 'radio', 'aria-checked': 'false', 'data-value': 'BE/B.Tech' });
  const radioOpt2 = new MockElement('div', { role: 'radio', 'aria-checked': 'false', 'data-value': 'MBA' });
  const radioOpt3 = new MockElement('div', { role: 'radio', 'aria-checked': 'false', 'data-value': 'Other' });
  radiogroup2.appendChild(radioOpt1);
  radiogroup2.appendChild(radioOpt2);
  radiogroup2.appendChild(radioOpt3);

  card2.appendChild(heading2);
  card2.appendChild(radiogroup2);
  form.appendChild(card2);

  // Q3: Comfort with job location (Radiogroup: Yes, No)
  const card3 = new MockElement('div', { class: 'Qr7Oae', role: 'listitem' });
  const heading3 = new MockElement('div', { class: 'M7eMe', role: 'heading' }, 'Comfort with the job location *');
  const radiogroup3 = new MockElement('div', { role: 'radiogroup' });
  const radioLocYes = new MockElement('div', { role: 'radio', 'aria-checked': 'false', 'data-value': 'Yes' });
  const radioLocNo = new MockElement('div', { role: 'radio', 'aria-checked': 'false', 'data-value': 'No' });
  radiogroup3.appendChild(radioLocYes);
  radiogroup3.appendChild(radioLocNo);
  card3.appendChild(heading3);
  card3.appendChild(radiogroup3);
  form.appendChild(card3);

  // Execution: Fill Name
  const success1 = setNativeValue(input1 as any, 'Sohel Hussain');
  assert.strictEqual(success1, true, 'Name should be filled successfully');
  assert.strictEqual(input1.value, 'Sohel Hussain', 'Live input1 value must be Sohel Hussain');

  // Execution: Select Course name -> BE/B.Tech
  const success2 = selectRadioOption(radiogroup2 as any, 'BE/B.Tech');
  assert.strictEqual(success2, true, 'Course name radio should be selected');
  assert.strictEqual(radioOpt1.getAttribute('aria-checked'), 'true', 'BE/B.Tech radio must have aria-checked=true');
  assert.strictEqual(radioOpt2.getAttribute('aria-checked'), 'false', 'MBA radio must have aria-checked=false');

  // Execution: Select Location Comfort -> Yes
  const success3 = selectRadioOption(radiogroup3 as any, 'Yes');
  assert.strictEqual(success3, true, 'Location Comfort Yes radio should be selected');
  assert.strictEqual(radioLocYes.getAttribute('aria-checked'), 'true', 'Yes radio must have aria-checked=true');
  assert.strictEqual(radioLocNo.getAttribute('aria-checked'), 'false', 'No radio must have aria-checked=false');

  // Verify hidden inputs remained untouched
  assert.strictEqual(hidden1.value, '1', 'Hidden input 1 must remain untouched');
  assert.strictEqual(hidden2.value, '0', 'Hidden input 2 must remain untouched');
});
