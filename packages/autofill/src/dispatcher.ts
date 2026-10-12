import { normalizeOptionText } from './mapper.js';
import { isExtensionUI } from './detector.js';

function isInputElem(el: any): el is HTMLInputElement {
  if (!el) return false;
  if (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) {
    if (el.tagName) return el.tagName.toLowerCase() === 'input';
    return true;
  }
  return el.tagName?.toLowerCase() === 'input';
}

function isTextAreaElem(el: any): el is HTMLTextAreaElement {
  if (!el) return false;
  if (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) {
    if (el.tagName) return el.tagName.toLowerCase() === 'textarea';
    return true;
  }
  return el.tagName?.toLowerCase() === 'textarea';
}

function isSelectElem(el: any): el is HTMLSelectElement {
  if (!el) return false;
  if (typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement) {
    if (el.tagName) return el.tagName.toLowerCase() === 'select';
    return true;
  }
  return el.tagName?.toLowerCase() === 'select';
}

function isHtmlElem(el: any): el is HTMLElement {
  return typeof HTMLElement !== 'undefined'
    ? el instanceof HTMLElement
    : Boolean(el && typeof el === 'object' && el.tagName);
}

function dispatchBlurEvent(element: HTMLElement): void {
  try {
    if (typeof FocusEvent !== 'undefined') {
      element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      return;
    }
  } catch {
    // fallback
  }
  try {
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  } catch {
    // fallback
  }
}

/**
 * Dispatches values to DOM elements in a way that is compatible with React, Vue,
 * Angular, Google Forms Wiz/Closure, and vanilla DOM inputs without breaking framework internal state.
 */

export function setNativeValue(
  element: HTMLElement,
  value: string | boolean
): boolean {
  if (!element) return false;
  if (element.isConnected === false) return false;
  if (isExtensionUI(element)) return false;
  if (isInputElem(element) && element.type === 'hidden') return false;

  try {
    const role = typeof element.getAttribute === 'function' ? element.getAttribute('role')?.toLowerCase() : undefined;
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';

    // 1. Checkbox
    if (isInputElem(element) && element.type === 'checkbox') {
      const boolVal = typeof value === 'boolean' ? value : value === 'true' || value === 'yes';
      if (element.checked !== boolVal) {
        element.checked = boolVal;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return element.checked === boolVal;
    }

    if (role === 'checkbox') {
      const boolVal = typeof value === 'boolean' ? value : value === 'true' || value === 'yes';
      const isChecked = typeof element.getAttribute === 'function' && element.getAttribute('aria-checked') === 'true';
      if (isChecked !== boolVal) {
        if (typeof element.click === 'function') element.click();
        if (typeof element.setAttribute === 'function') element.setAttribute('aria-checked', String(boolVal));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const verified = typeof element.getAttribute === 'function' && element.getAttribute('aria-checked') === String(boolVal);
      return verified || isChecked === boolVal;
    }

    // 2. Radio buttons & Radiogroups (Google Forms / ARIA / native radio)
    const isRadioElem =
      (isInputElem(element) && element.type === 'radio') ||
      role === 'radio' ||
      role === 'radiogroup' ||
      (role !== 'textbox' &&
        tagName !== 'input' &&
        tagName !== 'textarea' &&
        tagName !== 'select' &&
        typeof element.querySelector === 'function' &&
        !!element.querySelector('[role="radio"], input[type="radio"]'));

    if (isRadioElem) {
      return selectRadioOption(element, value);
    }

    // 2b. Container element delegation (e.g. .Qr7Oae card or fieldset passed instead of raw control)
    if (
      !isInputElem(element) &&
      !isTextAreaElem(element) &&
      !isSelectElem(element) &&
      role !== 'textbox' &&
      role !== 'radio' &&
      role !== 'radiogroup' &&
      role !== 'checkbox' &&
      typeof element.querySelector === 'function'
    ) {
      const childInput = element.querySelector(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select, [role="radiogroup"], [role="radio"], [role="checkbox"], [role="textbox"], .whsOnd'
      );
      if (childInput) {
        return setNativeValue(childInput as HTMLElement, value);
      }
    }

    // 3. Native Text / Email / Tel / Number / Date Input (and Google Forms text input)
    if (isInputElem(element) || tagName === 'input') {
      const stringValue = String(value);
      try {
        if (typeof element.focus === 'function') element.focus();
        element.dispatchEvent(new Event('focus', { bubbles: true }));
        element.dispatchEvent(new Event('focusin', { bubbles: true }));
      } catch {
        // ignore
      }

      let proto = Object.getPrototypeOf(element);
      let nativeInputValueSetter: ((v: any) => void) | undefined;
      while (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) {
          nativeInputValueSetter = desc.set;
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }

      if (!nativeInputValueSetter && typeof HTMLInputElement !== 'undefined') {
        const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (desc && desc.set) {
          nativeInputValueSetter = desc.set;
        }
      }

      if (nativeInputValueSetter) {
        try {
          nativeInputValueSetter.call(element, stringValue);
        } catch {
          (element as any).value = stringValue;
        }
      } else {
        (element as any).value = stringValue;
      }
      (element as any).value = stringValue;

      // Clear React 16/17/18 internal tracker so React notices the new value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(stringValue);
      }

      try {
        element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, composed: true, inputType: 'insertText', data: stringValue }));
      } catch {
        element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
      element.dispatchEvent(new Event('change', { bubbles: true }));
      try {
        element.dispatchEvent(new Event('focusout', { bubbles: true }));
      } catch {
        // ignore
      }
      dispatchBlurEvent(element);

      // Verify live value
      const isVerified = (element as any).value === stringValue;
      return isVerified;
    }

    // 4. Native Textarea
    if (isTextAreaElem(element) || tagName === 'textarea') {
      const stringValue = String(value);
      if (typeof element.focus === 'function') {
        element.focus();
      }

      let proto = Object.getPrototypeOf(element);
      let nativeTextAreaValueSetter: ((v: any) => void) | undefined;
      while (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) {
          nativeTextAreaValueSetter = desc.set;
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }

      if (!nativeTextAreaValueSetter && typeof HTMLTextAreaElement !== 'undefined') {
        const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        if (desc && desc.set) {
          nativeTextAreaValueSetter = desc.set;
        }
      }

      if (nativeTextAreaValueSetter) {
        try {
          nativeTextAreaValueSetter.call(element, stringValue);
        } catch {
          (element as any).value = stringValue;
        }
      } else {
        (element as any).value = stringValue;
      }
      (element as any).value = stringValue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracker = (element as any)._valueTracker;
      if (tracker) {
        tracker.setValue(stringValue);
      }

      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      dispatchBlurEvent(element);
      return (element as any).value === stringValue;
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
      dispatchBlurEvent(element);
      return true;
    }

    // 6. Native Select
    if (isSelectElem(element)) {
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
        dispatchBlurEvent(element);
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
 * Selects a radio option in Google Forms / ATS custom ARIA radios or native radio inputs.
 * Normalizes options, triggers DOM interaction, verifies checked state, and ensures
 * submit buttons are never activated.
 */
export function selectRadioOption(
  element: HTMLElement,
  value: string | boolean
): boolean {
  if (!element) return false;

  const targetStr = String(value).trim();
  const normTarget = normalizeOptionText(targetStr);
  const isTargetYes = typeof value === 'boolean' ? value : /^(?:yes|true|y|agree)$/i.test(targetStr);
  const isTargetNo = typeof value === 'boolean' ? !value : /^(?:no|false|n|disagree)$/i.test(targetStr);

  const role = typeof element.getAttribute === 'function' ? element.getAttribute('role')?.toLowerCase() : undefined;
  const tagName = element.tagName ? element.tagName.toLowerCase() : '';

  // Find the container enclosing all options of this question
  let container: HTMLElement = element;
  if (role === 'radio' || (tagName === 'input' && (element as HTMLInputElement).type === 'radio')) {
    const parentContainer =
      (typeof element.closest === 'function'
        ? element.closest('[role="radiogroup"]') ||
          element.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset')
        : null) ||
      element.parentElement;
    if (parentContainer instanceof HTMLElement) {
      container = parentContainer;
    }
  }

  // Find all radio elements within this container
  let radios: HTMLElement[] = [];
  if (typeof container.querySelectorAll === 'function') {
    radios = Array.from(container.querySelectorAll('[role="radio"], input[type="radio"]')) as HTMLElement[];
  }
  if (radios.length === 0 && (role === 'radio' || (tagName === 'input' && (element as HTMLInputElement).type === 'radio'))) {
    radios = [element];
  }

  radios = radios.filter((r) => !isExtensionUI(r));
  if (radios.length === 0) return false;

  const doc = container.ownerDocument || (typeof document !== 'undefined' ? document : null);

  // Helper to extract radio label & value
  function getRadioTextAndValue(r: HTMLElement): { label: string; value: string; normLabel: string; normVal: string } {
    let lbl = '';
    const dataVal = r.getAttribute('data-value');
    if (dataVal && !/^(?:other response|your answer)$/i.test(dataVal.trim())) {
      lbl = dataVal.trim();
    }

    if (!lbl) {
      const ariaLabel = r.getAttribute('aria-label');
      if (ariaLabel && !/^(?:other response|your answer)$/i.test(ariaLabel.trim())) {
        lbl = ariaLabel.trim();
      }
    }

    if (!lbl) {
      const labelledBy = r.getAttribute('aria-labelledby');
      if (labelledBy && doc) {
        const ids = labelledBy.split(/\s+/);
        const parts = ids
          .map((id) => {
            const target = typeof doc.getElementById === 'function'
              ? doc.getElementById(id)
              : typeof doc.querySelector === 'function'
              ? doc.querySelector(`#${id}`)
              : null;
            if (!target) return '';
            const clone = target.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('input, select, textarea, button, script, style').forEach((c) => c.remove());
            return (clone.textContent || '').trim();
          })
          .filter((t) => t.length > 0 && !/^(?:your answer|required question|\*)$/i.test(t));
        if (parts.length > 0) lbl = parts.join(' ');
      }
    }

    if (!lbl) {
      const optContainer = r.closest('label, .docssharedWizToggleLabeledContainer, .nWQGrd');
      if (optContainer) {
        const spanLabel = optContainer.querySelector(
          '.docssharedWizToggleLabeledLabelText, .aDTYNe, .snByac, .N5DuFa'
        );
        if (spanLabel && spanLabel !== r && spanLabel.textContent?.trim()) {
          lbl = spanLabel.textContent.trim();
        } else {
          const clone = optContainer.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[role="radio"], input, button, script, style').forEach((c) => c.remove());
          lbl = (clone.textContent || '').trim();
        }
      }
    }

    if (!lbl && r.parentElement) {
      const sibling = r.parentElement.querySelector('span, label, div:not([role="radio"])');
      if (sibling && sibling !== r && sibling.textContent?.trim()) {
        lbl = sibling.textContent.trim();
      }
    }

    if (!lbl) {
      lbl = (r.getAttribute('data-value') || (r as HTMLInputElement).value || r.textContent || '').trim();
    }

    const val = (r.getAttribute('data-value') || (r as HTMLInputElement).value || lbl).trim();
    return {
      label: lbl,
      value: val,
      normLabel: normalizeOptionText(lbl),
      normVal: normalizeOptionText(val)
    };
  }

  // 1. Exact match
  let targetRadio: HTMLElement | null = null;
  for (const r of radios) {
    const { normLabel, normVal } = getRadioTextAndValue(r);
    if (normLabel === normTarget || normVal === normTarget) {
      targetRadio = r;
      break;
    }
  }

  // 2. Boolean Yes/No match
  if (!targetRadio && (isTargetYes || isTargetNo)) {
    for (const r of radios) {
      const { normLabel } = getRadioTextAndValue(r);
      if (isTargetYes && /^(?:yes|y|true|agree|comfortable|available)$/i.test(normLabel)) {
        targetRadio = r;
        break;
      }
      if (isTargetNo && /^(?:no|n|false|disagree|uncomfortable|unavailable)$/i.test(normLabel)) {
        targetRadio = r;
        break;
      }
    }
  }

  // 3. Conservative unambiguous partial match
  if (!targetRadio && normTarget.length > 1) {
    const matchingRadios = radios.filter((r) => {
      const { normLabel, normVal } = getRadioTextAndValue(r);
      if (normLabel === 'other' && normTarget !== 'other') return false;
      return normLabel.includes(normTarget) || normTarget.includes(normLabel) || normVal.includes(normTarget);
    });
    if (matchingRadios.length === 1) {
      targetRadio = matchingRadios[0];
    }
  }

  if (!targetRadio) {
    return false;
  }

  if (targetRadio.isConnected === false) {
    return false;
  }

  // Idempotency: If already selected, do not re-dispatch
  const isAlreadyChecked =
    targetRadio.getAttribute('aria-checked') === 'true' ||
    (isInputElem(targetRadio) && targetRadio.checked === true);
  if (isAlreadyChecked) {
    return true;
  }

  // Verify targetRadio belongs to the intended container
  if (container && container !== targetRadio && typeof container.contains === 'function' && !container.contains(targetRadio)) {
    return false;
  }

  // Trigger interaction
  try {
    if (typeof targetRadio.focus === 'function') {
      targetRadio.focus();
    }

    // Pointer & Mouse events
    const eventTypes = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (const evtName of eventTypes) {
      try {
        targetRadio.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true }));
      } catch {
        targetRadio.dispatchEvent(new Event(evtName, { bubbles: true }));
      }
    }

    // Also click parent label or option container if present
    const optLabel = typeof targetRadio.closest === 'function' ? targetRadio.closest('label, .docssharedWizToggleLabeledContainer') : null;
    if (optLabel && optLabel !== targetRadio && typeof (optLabel as HTMLElement).click === 'function') {
      (optLabel as HTMLElement).click();
    }

    if (typeof targetRadio.click === 'function') {
      targetRadio.click();
    }

    // Native radio input
    if (isInputElem(targetRadio) && targetRadio.type === 'radio') {
      targetRadio.checked = true;
    }

    // Update ARIA attributes on the radios in this group
    radios.forEach((r) => {
      if (r !== targetRadio && typeof r.setAttribute === 'function') {
        r.setAttribute('aria-checked', 'false');
      }
    });
    if (typeof targetRadio.setAttribute === 'function') {
      targetRadio.setAttribute('aria-checked', 'true');
    }

    targetRadio.dispatchEvent(new Event('input', { bubbles: true }));
    targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
    dispatchBlurEvent(targetRadio);

    // Verification step
    const isChecked =
      targetRadio.getAttribute('aria-checked') === 'true' ||
      (isInputElem(targetRadio) && targetRadio.checked === true);

    return isChecked;
  } catch (err) {
    console.error('[ApplyFlow] Error selecting radio option:', err);
    return false;
  }
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
