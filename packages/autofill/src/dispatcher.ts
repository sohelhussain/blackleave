/**
 * Dispatches values to DOM elements in a way that is compatible with React, Vue,
 * Angular, Google Forms Wiz/Closure, and vanilla DOM inputs without breaking framework internal state.
 */

export function setNativeValue(
  element: HTMLElement,
  value: string | boolean
): boolean {
  if (!element) return false;

  try {
    const role = typeof element.getAttribute === 'function' ? element.getAttribute('role')?.toLowerCase() : undefined;

    // 1. Checkbox
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      const boolVal = typeof value === 'boolean' ? value : value === 'true' || value === 'yes';
      if (element.checked !== boolVal) {
        element.checked = boolVal;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }

    if (role === 'checkbox') {
      const boolVal = typeof value === 'boolean' ? value : value === 'true' || value === 'yes';
      const isChecked = element.getAttribute('aria-checked') === 'true';
      if (isChecked !== boolVal) {
        if (typeof element.click === 'function') element.click();
        element.setAttribute('aria-checked', String(boolVal));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return true;
    }

    // 2. Radio buttons & Radiogroups (Google Forms / ARIA)
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      const strVal = String(value).toLowerCase().trim();
      const elemVal = (element.value || '').toLowerCase().trim();
      if (elemVal === strVal || strVal === 'yes' || strVal === 'true') {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    }

    if (role === 'radiogroup' && typeof element.querySelectorAll === 'function') {
      const strVal = String(value).toLowerCase().trim();
      const radios = Array.from(element.querySelectorAll('[role="radio"], input[type="radio"]'));
      for (const r of radios) {
        const rVal = (
          r.getAttribute('data-value') ||
          (r as HTMLInputElement).value ||
          r.getAttribute('aria-label') ||
          r.textContent?.trim() ||
          ''
        ).toLowerCase().trim();

        if (rVal === strVal || rVal.includes(strVal) || strVal.includes(rVal)) {
          if (r instanceof HTMLElement) {
            if (typeof r.click === 'function') r.click();
            if (typeof r.setAttribute === 'function') r.setAttribute('aria-checked', 'true');
            r.dispatchEvent(new Event('change', { bubbles: true }));
            r.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        }
      }
      return false;
    }

    if (role === 'radio') {
      if (typeof element.click === 'function') element.click();
      if (typeof element.setAttribute === 'function') element.setAttribute('aria-checked', 'true');
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // 3. Native Text / Email / Tel / Number / Date Input (and Google Forms text input)
    if (element instanceof HTMLInputElement) {
      const stringValue = String(value);
      if (typeof element.focus === 'function') {
        element.focus();
      }
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      const nativeInputValueSetter = prototypeValueDescriptor?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, stringValue);
      } else {
        element.value = stringValue;
      }

      // Clear React 16/17/18 internal tracker so React notices the new value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(stringValue);
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return true;
    }

    // 4. Native Textarea
    if (element instanceof HTMLTextAreaElement) {
      const stringValue = String(value);
      if (typeof element.focus === 'function') {
        element.focus();
      }
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueDescriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      const nativeTextAreaValueSetter = prototypeValueDescriptor?.set;

      if (nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(element, stringValue);
      } else {
        element.value = stringValue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(stringValue);
      }

      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return true;
    }

    // 5. ARIA Textbox, contenteditable, or Google Forms paper input
    if (
      role === 'textbox' ||
      element.isContentEditable ||
      (typeof element.classList?.contains === 'function' && element.classList.contains('quantumWizTextinputPaperinputInput'))
    ) {
      const stringValue = String(value);
      if (typeof element.focus === 'function') {
        element.focus();
      }
      element.textContent = stringValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return true;
    }

    // 6. Native Select
    if (element instanceof HTMLSelectElement) {
      const strVal = String(value).toLowerCase().trim();
      let matchedIndex = -1;

      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = opt.value.toLowerCase().trim();
        const optText = opt.text.toLowerCase().trim();
        if (optVal === strVal || optText === strVal || optText.includes(strVal) || strVal.includes(optText)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        element.selectedIndex = matchedIndex;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        return true;
      }
    }

    // 7. ARIA Combobox / Listbox
    if ((role === 'combobox' || role === 'listbox') && typeof element.querySelectorAll === 'function') {
      const strVal = String(value).toLowerCase().trim();
      const options = Array.from(element.querySelectorAll('[role="option"], [role="menuitem"]'));
      for (const opt of options) {
        const optText = (opt.getAttribute('data-value') || opt.textContent?.trim() || '').toLowerCase().trim();
        if (optText === strVal || optText.includes(strVal)) {
          if (opt instanceof HTMLElement) {
            if (typeof opt.click === 'function') opt.click();
            opt.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
      }
    }
  } catch (err) {
    console.error('[ApplyFlow] Failed to set native value on element:', err);
    return false;
  }

  return false;
}

/**
 * Focus and highlight an element visually to show the user what was filled.
 */
export function highlightAutofilledElement(element: HTMLElement, status: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'): void {
  try {
    if (!element.style) return;
    const originalBorder = element.style.border;
    const originalBoxShadow = element.style.boxShadow;
    const originalTransition = element.style.transition;

    element.style.transition = 'all 0.3s ease';
    if (status === 'HIGH') {
      element.style.borderColor = '#10B981'; // emerald green
      element.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.25)';
    } else if (status === 'MEDIUM') {
      element.style.borderColor = '#F59E0B'; // amber yellow
      element.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.25)';
    } else {
      element.style.borderColor = '#EF4444'; // rose red
      element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
    }

    setTimeout(() => {
      element.style.border = originalBorder;
      element.style.boxShadow = originalBoxShadow;
      element.style.transition = originalTransition;
    }, 2500);
  } catch {
    // Ignore DOM styling exceptions
  }
}
