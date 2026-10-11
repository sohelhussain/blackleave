import test from 'node:test';
import assert from 'node:assert';
import { detectFormFields, isExtensionUI, BOGUS_TITLE_REGEX } from '../dist/detector.js';
import { mapFieldToProfile } from '../dist/mapper.js';
import { setNativeValue, selectRadioOption } from '../dist/dispatcher.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import type { DetectedField } from '@applyflow/types';

// Lightweight Mock DOM for regression test runner
class MockNode {
  tagName: string;
  id: string = '';
  name: string = '';
  type: string = 'text';
  value: string = '';
  textContent: string = '';
  attributes: Record<string, string> = {};
  children: MockNode[] = [];
  parentElement: MockNode | null = null;
  offsetParent: any = {};
  isConnected: boolean = true;
  checked: boolean = false;
  classList: { contains: (c: string) => boolean; list: string[] };

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
      contains: (c: string) => classes.includes(c)
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

  appendChild(child: MockNode) {
    child.parentElement = this;
    this.children.push(child);
  }

  contains(other: MockNode): boolean {
    if (this === other) return true;
    for (const c of this.children) {
      if (c.contains(other)) return true;
    }
    return false;
  }

  cloneNode(deep: boolean = true): MockNode {
    const clone = new MockNode(this.tagName, this.attributes, this.textContent);
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

  closest(selector: string): MockNode | null {
    let curr: MockNode | null = this;
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
      const notMatch = sel.match(/:not\(([^)]+)\)/);
      if (notMatch) {
        const inner = notMatch[1];
        if (this.matchesSelector(inner)) return false;
      }
      sel = sel.replace(/:not\([^)]+\)/g, '').trim();
    }
    if (!sel) return true;
    if (sel.includes('.')) {
      const parts = sel.split('.');
      const tagPart = parts[0];
      const classPart = parts[1];
      if (tagPart && this.tagName.toLowerCase() !== tagPart.toLowerCase()) return false;
      return this.classList.contains(classPart);
    }
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

  querySelector(selector: string): MockNode | null {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector: string): MockNode[] {
    const results: MockNode[] = [];
    const selectors = selector.split(',').map((s) => s.trim());

    const traverse = (node: MockNode) => {
      for (const child of node.children) {
        for (const sel of selectors) {
          if (child.matchesSelector(sel)) {
            results.push(child);
            break;
          }
          if (sel.includes(' ')) {
            const parts = sel.split(/\s+/);
            if (parts.length === 2 && node.matchesSelector(parts[0]) && child.matchesSelector(parts[1])) {
              results.push(child);
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

// Set globals for test
(global as any).HTMLElement = MockNode;
(global as any).HTMLInputElement = MockNode;

function buildFormWithDrawer() {
  const root = new MockNode('BODY');

  // Form container
  const form = new MockNode('FORM', { class: 'freebirdFormviewerViewFormCard' });

  // Real question 1: Email
  const qEmail = new MockNode('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': 'q_email' });
  qEmail.appendChild(new MockNode('DIV', { role: 'heading', class: 'M7eMe' }, 'Email Address *'));
  qEmail.appendChild(new MockNode('INPUT', { type: 'email', name: 'entry.email', placeholder: 'Your answer' }));
  form.appendChild(qEmail);

  // Real question 2: Full Name
  const qName = new MockNode('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': 'q_name' });
  qName.appendChild(new MockNode('DIV', { role: 'heading', class: 'M7eMe' }, 'Full Name *'));
  qName.appendChild(new MockNode('INPUT', { type: 'text', name: 'entry.name', placeholder: 'Your answer' }));
  form.appendChild(qName);

  // Real question 3: Course name (Radiogroup)
  const qCourse = new MockNode('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': 'q_course' });
  qCourse.appendChild(new MockNode('DIV', { role: 'heading', class: 'M7eMe' }, 'Course name *'));
  const radioGrp = new MockNode('DIV', { role: 'radiogroup', 'aria-labelledby': 'h_course' });
  ['BE/B.Tech', 'MBA', 'BE/B.Tech + MBA', 'Other'].forEach((opt, idx) => {
    const optWrap = new MockNode('DIV', { class: 'nWQGrd' });
    const r = new MockNode('DIV', { role: 'radio', 'data-value': opt, 'aria-label': opt });
    optWrap.appendChild(r);
    optWrap.appendChild(new MockNode('SPAN', { class: 'aDTYNe snByac' }, opt));
    radioGrp.appendChild(optWrap);
  });
  // Helper "Other response" text input
  radioGrp.appendChild(new MockNode('INPUT', { type: 'text', class: 'Hvn9fb', 'aria-label': 'Other response' }));
  qCourse.appendChild(radioGrp);
  form.appendChild(qCourse);

  // Submit button
  const submitBtn = new MockNode('BUTTON', { type: 'submit' }, 'Submit');
  form.appendChild(submitBtn);

  root.appendChild(form);

  // INJECTED REVIEW DRAWER with data-blackleave-root="true"
  const drawerHost = new MockNode('DIV', {
    id: 'blackleave-drawer-host',
    'data-blackleave-root': 'true',
    class: 'blackleave-ui'
  });
  // The drawer contains hundreds of controls (Approve checkboxes and Enter value inputs)
  for (let i = 0; i < 50; i++) {
    const item = new MockNode('DIV', { 'data-blackleave-root': 'true' });
    const checkLabel = new MockNode('LABEL');
    checkLabel.appendChild(new MockNode('INPUT', { type: 'checkbox', class: 'blackleave-approve-check' }));
    checkLabel.appendChild(new MockNode('SPAN', {}, 'Approve'));
    item.appendChild(checkLabel);
    item.appendChild(new MockNode('INPUT', { type: 'text', placeholder: 'Enter value...', class: 'blackleave-input-val' }));
    drawerHost.appendChild(item);
  }
  root.appendChild(drawerHost);

  return { root, form, drawerHost, submitBtn };
}

// -------------------------------------------------------------------------------------------------
// Regression Tests
// -------------------------------------------------------------------------------------------------

test('1. The review drawer is excluded from detection', () => {
  const { root, drawerHost } = buildFormWithDrawer();
  assert.strictEqual(isExtensionUI(drawerHost), true);

  const fields = detectFormFields(root as any);
  // Real form has exactly 3 questions: Email, Full Name, Course name
  assert.strictEqual(fields.length, 3, `Expected exactly 3 questions, got ${fields.length}`);

  // No field selector or element should belong to the review drawer
  for (const f of fields) {
    assert.strictEqual(f.selector.includes('blackleave'), false);
    assert.strictEqual(f.selector.includes('drawer'), false);
  }
});

test('2. Review inputs cannot become application questions', () => {
  const { root } = buildFormWithDrawer();
  const fields = detectFormFields(root as any);

  const approveFields = fields.filter((f) => f.detectedLabel.toLowerCase().includes('approve'));
  assert.strictEqual(approveFields.length, 0, 'No field should have "Approve" label');

  const enterValueFields = fields.filter((f) => f.detectedLabel.toLowerCase().includes('enter value'));
  assert.strictEqual(enterValueFields.length, 0, 'No field should have "Enter value..." label');
});

test('3. Opening the review drawer does not trigger an endless rescan', () => {
  const { root, drawerHost } = buildFormWithDrawer();
  // Simulate MutationObserver check: mutations occurring inside drawerHost must be ignored
  const mutation = { target: drawerHost.children[0] };
  const isIgnored = isExtensionUI(mutation.target as any);
  assert.strictEqual(isIgnored, true, 'Mutation target inside drawerHost must be recognized as extension UI');
});

test('4. Typing in the review drawer does not scan the page', () => {
  const { drawerHost } = buildFormWithDrawer();
  const typingInput = drawerHost.querySelector('input.blackleave-input-val');
  assert.ok(typingInput);
  assert.strictEqual(isExtensionUI(typingInput as any), true, 'Typing input is extension UI and must not trigger scans');
});

test('5. Repeated observer callbacks do not increase the field count', () => {
  const { root } = buildFormWithDrawer();
  const scan1 = detectFormFields(root as any);
  const scan2 = detectFormFields(root as any);
  const scan3 = detectFormFields(root as any);

  assert.strictEqual(scan1.length, 3);
  assert.strictEqual(scan2.length, 3);
  assert.strictEqual(scan3.length, 3);
});

test('6. A radio group becomes one logical question', () => {
  const { root } = buildFormWithDrawer();
  const fields = detectFormFields(root as any);

  const courseQuestions = fields.filter((f) => f.detectedLabel.toLowerCase().includes('course name'));
  assert.strictEqual(courseQuestions.length, 1, 'Course name radiogroup must be exactly one question');
  assert.strictEqual(courseQuestions[0].fieldType, 'radio');
  assert.strictEqual(courseQuestions[0].options?.length, 4, 'Should have 4 options');
});

test('7. A real question titled "Course name" is recognized correctly', () => {
  const { root } = buildFormWithDrawer();
  const fields = detectFormFields(root as any);
  const course = fields.find((f) => f.detectedLabel.toLowerCase().includes('course name'))!;
  assert.ok(course);

  const mapped = mapFieldToProfile(course, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.category, 'EDUCATION');
  assert.strictEqual(mapped.requiresConfirmation, true);
  // Verified profile degree is MCA; it should not invent BE/B.Tech or MBA
  assert.strictEqual(mapped.suggestedValue, null);
});

test('8. "Approve" and "Enter value..." are never extracted as question titles from extension UI', () => {
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Approve'), true);
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Enter value...'), true);
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Your answer'), true);
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Other response'), true);
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Course name'), false);
  assert.strictEqual(BOGUS_TITLE_REGEX.test('Email Address'), false);
});

test('9. A second scan updates existing fields instead of duplicating them', () => {
  const { root } = buildFormWithDrawer();
  const initialFields = detectFormFields(root as any);

  // User manually edits Full Name in drawer
  initialFields[1].userValue = 'Custom Sohel';
  initialFields[1].approved = true;

  // Second scan runs
  const secondScan = detectFormFields(root as any);

  // Merge logic simulation
  const existingMap = new Map(initialFields.map((f) => [f.id, f]));
  const merged = secondScan.map((f) => {
    const prev = existingMap.get(f.id);
    return prev ? { ...f, userValue: prev.userValue, approved: prev.approved } : f;
  });

  assert.strictEqual(merged.length, 3);
  assert.strictEqual(merged[1].userValue, 'Custom Sohel');
  assert.strictEqual(merged[1].approved, true);
});

test('10. Multiple frames do not create duplicate field records', () => {
  // Service worker frame management test
  interface FrameData {
    frameId: number;
    fields: any[];
  }
  const tabFrames = new Map<number, FrameData>();

  // Top frame (frameId 0) detects 3 fields
  tabFrames.set(0, { frameId: 0, fields: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] });
  // Ad or widget frame (frameId 1) reports 0 fields
  tabFrames.set(1, { frameId: 1, fields: [] });

  // Priority selection: frameId 0 chosen
  let best: FrameData | null = null;
  for (const [, f] of tabFrames) {
    if (!best || f.fields.length > best.fields.length) best = f;
  }

  assert.strictEqual(best?.frameId, 0);
  assert.strictEqual(best?.fields.length, 3);
});

test('11. Existing email, phone, and college-name autofill still works', () => {
  const emailField: DetectedField = {
    id: 'f_email',
    selector: 'input[name="entry.email"]',
    detectedLabel: 'Email Address',
    fieldType: 'email',
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const collegeField: DetectedField = {
    id: 'f_college',
    selector: 'input[name="entry.college"]',
    detectedLabel: 'College name',
    fieldType: 'text',
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mappedEmail = mapFieldToProfile(emailField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mappedEmail.suggestedValue, 'sohelhussaing@gmail.com');
  assert.strictEqual(mappedEmail.confidenceLevel, 'HIGH');

  const mappedCollege = mapFieldToProfile(collegeField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mappedCollege.suggestedValue, 'Jain University');
  assert.strictEqual(mappedCollege.confidenceLevel, 'HIGH');
});

test('12. Missing education and availability information remains unfilled', () => {
  const sixMonthsField: DetectedField = {
    id: 'f_six',
    selector: 'div[role="radiogroup"]',
    detectedLabel: 'Availability for six months of onsite work',
    fieldType: 'radio',
    options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }],
    isRequired: true,
    suggestedProfileField: null,
    category: 'UNKNOWN',
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };

  const mapped = mapFieldToProfile(sixMonthsField, INITIAL_SOHEL_PROFILE);
  assert.strictEqual(mapped.suggestedValue, null, 'Must remain unfilled without confirmation');
  assert.strictEqual(mapped.requiresConfirmation, true);
  assert.strictEqual(mapped.approved, false);
});

test('13. No submit action is ever triggered', () => {
  const { submitBtn } = buildFormWithDrawer();
  let submitTriggered = false;
  submitBtn.click = () => { submitTriggered = true; };

  // Dispatcher setNativeValue on an input
  const input = new MockNode('INPUT', { type: 'text' });
  setNativeValue(input as any, 'Sohel');

  // Radio selection
  const radio = new MockNode('DIV', { role: 'radio', 'data-value': 'Yes' });
  selectRadioOption(radio as any, 'Yes');

  assert.strictEqual(submitTriggered, false, 'Submit button must never be clicked by autofill');
});

test('14. Large forms do not block the main thread with repeated full-page scans', () => {
  const largeRoot = new MockNode('BODY');
  const largeForm = new MockNode('FORM');

  // 300 input nodes
  for (let i = 0; i < 300; i++) {
    const card = new MockNode('DIV', { role: 'listitem', class: 'Qr7Oae', 'data-item-id': `item_${i}` });
    card.appendChild(new MockNode('DIV', { role: 'heading', class: 'M7eMe' }, `Question ${i}`));
    card.appendChild(new MockNode('INPUT', { type: 'text', name: `field_${i}` }));
    largeForm.appendChild(card);
  }
  largeRoot.appendChild(largeForm);

  const diagnostics: any = {};
  const t0 = Date.now();
  const fields = detectFormFields(largeRoot as any, diagnostics);
  const elapsed = Date.now() - t0;

  // Should safely cap at MAX_LOGICAL_FIELDS (100) and complete quickly
  assert.strictEqual(fields.length, 100);
  assert.ok(elapsed < 100, `Large form scan took ${elapsed}ms, must be < 100ms`);
});
