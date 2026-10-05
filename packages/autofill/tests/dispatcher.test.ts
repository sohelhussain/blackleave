import test from 'node:test';
import assert from 'node:assert';
import { setNativeValue } from '../dist/dispatcher.js';

// Minimal DOM mock simulating HTMLInputElement and EventTarget
class MockEvent {
  type: string;
  bubbles: boolean;
  constructor(type: string, init?: { bubbles?: boolean }) {
    this.type = type;
    this.bubbles = init?.bubbles ?? false;
  }
}

class MockEventTarget {
  private listeners: Record<string, ((e: any) => void)[]> = {};

  addEventListener(type: string, callback: (e: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }

  dispatchEvent(event: MockEvent): boolean {
    const handlers = this.listeners[event.type] || [];
    for (const handler of handlers) {
      handler(event);
    }
    return true;
  }
}

class MockHTMLInputElement extends MockEventTarget {
  type: string = 'text';
  value: string = '';
  checked: boolean = false;
  _valueTracker: any = null;

  constructor(type: string = 'text', value: string = '') {
    super();
    this.type = type;
    this.value = value;
  }
}

class MockHTMLTextAreaElement extends MockEventTarget {
  value: string = '';
  _valueTracker: any = null;

  constructor(value: string = '') {
    super();
    this.value = value;
  }
}

class MockHTMLSelectElement extends MockEventTarget {
  selectedIndex: number = 0;
  options: { value: string; text: string }[] = [];

  constructor(options: { value: string; text: string }[]) {
    super();
    this.options = options;
  }
}

// Global polyfills for test runner
(global as any).Event = MockEvent;
(global as any).FocusEvent = MockEvent;
(global as any).HTMLInputElement = MockHTMLInputElement;
(global as any).HTMLTextAreaElement = MockHTMLTextAreaElement;
(global as any).HTMLSelectElement = MockHTMLSelectElement;

test('Dispatcher - Sets text input value and dispatches input/change/blur events', () => {
  const input = new MockHTMLInputElement('text', '');
  const eventsDispatched: string[] = [];

  input.addEventListener('input', (e) => eventsDispatched.push(e.type));
  input.addEventListener('change', (e) => eventsDispatched.push(e.type));
  input.addEventListener('blur', (e) => eventsDispatched.push(e.type));

  const result = setNativeValue(input as any, 'Sohel');

  assert.strictEqual(result, true);
  assert.strictEqual(input.value, 'Sohel');
  assert.deepStrictEqual(eventsDispatched, ['input', 'change', 'blur']);
});

test('Dispatcher - Syncs React 16+ _valueTracker', () => {
  const input = new MockHTMLInputElement('text', '');
  let trackerValue = '';
  input._valueTracker = {
    setValue: (val: string) => {
      trackerValue = val;
    }
  };

  setNativeValue(input as any, 'NewReactVal');
  assert.strictEqual(input.value, 'NewReactVal');
  assert.strictEqual(trackerValue, 'NewReactVal');
});

test('Dispatcher - Sets textarea value and dispatches events', () => {
  const textarea = new MockHTMLTextAreaElement('');
  const eventsDispatched: string[] = [];

  textarea.addEventListener('input', (e) => eventsDispatched.push(e.type));
  textarea.addEventListener('change', (e) => eventsDispatched.push(e.type));

  const result = setNativeValue(textarea as any, 'Built DPI Engine in Go.');

  assert.strictEqual(result, true);
  assert.strictEqual(textarea.value, 'Built DPI Engine in Go.');
  assert.ok(eventsDispatched.includes('input'));
  assert.ok(eventsDispatched.includes('change'));
});

test('Dispatcher - Selects dropdown option by matching text or value', () => {
  const select = new MockHTMLSelectElement([
    { value: '', text: '-- Please Select --' },
    { value: 'B.Tech', text: 'Bachelor of Technology' },
    { value: 'MCA', text: 'Master of Computer Applications' }
  ]);

  const result = setNativeValue(select as any, 'Master of Computer Applications');
  assert.strictEqual(result, true);
  assert.strictEqual(select.selectedIndex, 2);
});

test('Dispatcher - Toggles checkbox correctly', () => {
  const checkbox = new MockHTMLInputElement('checkbox', '');
  checkbox.checked = false;

  setNativeValue(checkbox as any, true);
  assert.strictEqual(checkbox.checked, true);

  setNativeValue(checkbox as any, false);
  assert.strictEqual(checkbox.checked, false);
});

test('Zero Auto-Submit Guarantee - Dispatcher NEVER clicks or triggers form submit', () => {
  const mockForm = {
    submitted: false,
    submit() {
      this.submitted = true;
    }
  };

  const input = new MockHTMLInputElement('text', '');
  (input as any).form = mockForm;

  setNativeValue(input as any, 'TestValue');
  assert.strictEqual(mockForm.submitted, false, 'Dispatcher must never call form.submit()');
});
