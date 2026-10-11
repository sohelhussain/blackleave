import { DetectedField, FieldCategory } from '@applyflow/types';

/**
 * Traverses DOM and detects application form fields, resolving accessible labels,
 * placeholders, attributes, and options.
 */

export function detectFormFields(root: Document | ShadowRoot | Element = document): DetectedField[] {
  const fields: DetectedField[] = [];
  const processedElements = new Set<Element>();

  // Find all form controls including ARIA and Google Forms widgets
  const query = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'textarea',
    'select',
    '[role="radiogroup"]',
    '[role="radio"]',
    '[role="checkbox"]',
    '[role="textbox"]:not(input):not(textarea)',
    '[role="listbox"]',
    '[role="combobox"]',
    '.quantumWizTextinputPaperinputInput'
  ].join(', ');

  const elements = Array.from(root.querySelectorAll(query));

  // Traverse open shadow roots if present
  const allHostElements = Array.from(root.querySelectorAll('*'));
  for (const host of allHostElements) {
    if (host.shadowRoot) {
      const shadowElements = host.shadowRoot.querySelectorAll(query);
      elements.push(...Array.from(shadowElements));
    }
  }

  let index = 0;
  for (const el of elements) {
    if (processedElements.has(el)) continue;
    if (!isVisible(el)) continue;

    const htmlEl = el as HTMLElement;
    const role = htmlEl.getAttribute('role')?.toLowerCase();
    const tagName = htmlEl.tagName.toLowerCase();
    const isRadio = role === 'radio' || (tagName === 'input' && (htmlEl as HTMLInputElement).type === 'radio');

    // Skip helper "Other response" text inputs that belong to a radio/checkbox question
    if (
      (htmlEl.getAttribute('aria-label')?.toLowerCase().includes('other response') ||
        htmlEl.classList.contains('Hvn9fb')) &&
      htmlEl.closest('[role="radiogroup"], [role="listitem"], .Qr7Oae')
    ) {
      continue;
    }

    // If this is an explicit radiogroup
    if (role === 'radiogroup') {
      const childRadios = htmlEl.querySelectorAll('[role="radio"], input[type="radio"]');
      childRadios.forEach((r) => processedElements.add(r));

      // Also mark helper inputs (like "Other" response text input) within this radiogroup or question container
      const qContainer = htmlEl.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset');
      const helperInputs = (qContainer || htmlEl).querySelectorAll('input[aria-label*="Other" i], .Hvn9fb');
      helperInputs.forEach((inp) => processedElements.add(inp));
    } else if (isRadio) {
      // If parent is a radiogroup, skip individual radio
      if (htmlEl.closest('[role="radiogroup"]')) {
        continue;
      }

      // Check if radio is inside a semantic question container with other radios
      const questionContainer = htmlEl.closest(
        '[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset'
      );
      if (questionContainer) {
        const siblingRadios = Array.from(questionContainer.querySelectorAll('[role="radio"], input[type="radio"]'));
        if (siblingRadios.length > 1) {
          // Group as a single logical field!
          siblingRadios.forEach((r) => processedElements.add(r));
          const helperInputs = questionContainer.querySelectorAll('input[aria-label*="Other" i], .Hvn9fb');
          helperInputs.forEach((inp) => processedElements.add(inp));

          const detected = analyzeElement(questionContainer as HTMLElement, index++, true);
          if (detected) {
            processedElements.add(el);
            processedElements.add(questionContainer);
            fields.push(detected);
          }
          continue;
        }
      }
    }

    const detected = analyzeElement(htmlEl, index++);
    if (detected) {
      processedElements.add(el);
      fields.push(detected);
    }
  }

  return fields;
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;

  // Modern checkVisibility Web API (supported in Chrome 105+)
  if (typeof (el as any).checkVisibility === 'function') {
    return (el as any).checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true
    });
  }

  // Fallback for environments where checkVisibility is unavailable
  const hasWindow = typeof window !== 'undefined';
  const style = hasWindow && window.getComputedStyle ? window.getComputedStyle(el) : (el as any).style;
  if (style) {
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
  }

  // In DOM spec, position:fixed or ancestors with display:contents have offsetParent === null!
  if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') {
    if (style && style.position === 'fixed') {
      return true;
    }
    if (el.isConnected === false) return false;
    // Walk up tree to check if any ancestor is truly hidden by display: none
    let parent: Element | null = el.parentElement;
    while (parent && parent !== document.body) {
      const pStyle = hasWindow && window.getComputedStyle ? window.getComputedStyle(parent) : null;
      if (pStyle && (pStyle.display === 'none' || pStyle.visibility === 'hidden')) {
        return false;
      }
      parent = parent.parentElement;
    }
  }

  return true;
}

function analyzeElement(
  el: HTMLElement,
  index: number,
  isGroupContainer = false
): DetectedField | null {
  const tagName = el.tagName.toLowerCase();
  const role = el.getAttribute('role')?.toLowerCase();
  let fieldType: DetectedField['fieldType'] = 'text';

  const hasRadios = isGroupContainer || role === 'radiogroup' || role === 'radio' || (tagName === 'input' && (el as HTMLInputElement).type === 'radio');

  if (hasRadios) {
    fieldType = 'radio';
  } else if (tagName === 'textarea') {
    fieldType = 'textarea';
  } else if (tagName === 'select' || role === 'combobox' || role === 'listbox') {
    fieldType = 'select';
  } else if (role === 'checkbox') {
    fieldType = 'checkbox';
  } else if (role === 'textbox' || el.classList.contains('quantumWizTextinputPaperinputInput')) {
    const isMultiline = el.getAttribute('aria-multiline') === 'true' || tagName === 'textarea';
    fieldType = isMultiline ? 'textarea' : 'text';
  } else if (tagName === 'input') {
    const inputType = (el as HTMLInputElement).type?.toLowerCase() || 'text';
    switch (inputType) {
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'date':
      case 'radio':
      case 'checkbox':
      case 'file':
        fieldType = inputType;
        break;
      default:
        fieldType = 'text';
    }
  }

  const label = resolveLabel(el);
  const placeholder = el.getAttribute('placeholder') || null;
  const name = el.getAttribute('name') || null;
  const htmlId = el.getAttribute('id') || null;
  const ariaLabel = el.getAttribute('aria-label') || null;
  const surroundingText = getSurroundingText(el);
  const isRequired =
    (el as any).required ||
    el.getAttribute('aria-required') === 'true' ||
    label.includes('*') ||
    !!el.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer')?.querySelector(
      '.v3DuG, [aria-label*="Required" i], .freebirdFormviewerComponentsQuestionBaseRequiredAsterisk'
    );

  // If select or radio group, gather options
  let options: Array<{ label: string; value: string }> | undefined;
  if (el instanceof HTMLSelectElement && (el as any).options) {
    options = Array.from(el.options).map((opt) => ({
      label: opt.text.trim(),
      value: opt.value.trim()
    }));
  } else if (hasRadios) {
    options = extractRadioOptions(el);
  } else if (role === 'listbox' || role === 'combobox') {
    const optItems = Array.from(el.querySelectorAll('[role="option"], [role="menuitem"]'));
    options = optItems.map((o) => {
      const val = o.getAttribute('data-value') || o.textContent?.trim() || '';
      return { label: cleanText(o.textContent || val), value: cleanText(val) };
    }).filter((o) => o.label.length > 0);
  }

  const selector = generateUniqueSelector(el, index);

  return {
    id: `field_${index}_${htmlId || name || Math.random().toString(36).substring(2, 8)}`,
    selector,
    detectedLabel: label,
    fieldType,
    placeholder,
    name,
    htmlId,
    ariaLabel,
    surroundingText,
    options,
    isRequired,
    suggestedProfileField: null,
    category: 'UNKNOWN' as FieldCategory,
    confidence: 0,
    confidenceLevel: 'LOW',
    source: 'unmapped',
    suggestedValue: null,
    requiresConfirmation: false
  };
}

/**
 * Extracts all options from a radio container or question container, inspecting aria-label,
 * aria-labelledby, sibling text spans, and surrounding label text.
 */
export function extractRadioOptions(
  container: HTMLElement
): Array<{ label: string; value: string }> {
  const radioItems = Array.from(container.querySelectorAll('[role="radio"], input[type="radio"]'));
  // If container itself is a single radio
  if (
    radioItems.length === 0 &&
    (container.getAttribute('role') === 'radio' || (container as HTMLInputElement).type === 'radio')
  ) {
    radioItems.push(container);
  }

  const doc = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const options: Array<{ label: string; value: string }> = [];

  for (const r of radioItems) {
    let lbl = '';
    let val = '';

    // 1. Check aria-label directly on the radio
    const ariaLabel = r.getAttribute('aria-label');
    if (ariaLabel && !/^(?:other response|your answer)$/i.test(ariaLabel.trim())) {
      lbl = ariaLabel.trim();
    }

    // 2. Check aria-labelledby on radio
    if (!lbl) {
      const labelledBy = r.getAttribute('aria-labelledby');
      if (labelledBy && doc) {
        const ids = labelledBy.split(/\s+/);
        const parts = ids
          .map((id) => {
            const target = typeof doc.getElementById === 'function'
              ? doc.getElementById(id)
              : typeof doc.querySelector === 'function'
              ? doc.querySelector(`#${escapeCSS(id)}`)
              : null;
            if (!target) return '';
            const clone = target.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('input, select, textarea, button, script, style').forEach((c) => c.remove());
            return cleanText(clone.textContent || '');
          })
          .filter((t) => t.length > 0 && !/^(?:your answer|required question|\*)$/i.test(t));
        if (parts.length > 0) {
          lbl = parts.join(' ');
        }
      }
    }

    // 3. Check option wrapper container (Google Forms uses .nWQGrd, .docssharedWizToggleLabeledContainer, etc.)
    if (!lbl) {
      const optContainer = r.closest('label, .docssharedWizToggleLabeledContainer, .nWQGrd, [role="listitem"]');
      if (optContainer) {
        // Try known Google Forms label spans
        const spanLabel = optContainer.querySelector(
          '.aDTYNe, .snByac, .N5DuFa, .docssharedWizToggleLabeledLabelText, [dir="auto"]'
        );
        if (spanLabel && spanLabel !== r && spanLabel.textContent?.trim()) {
          lbl = cleanText(spanLabel.textContent);
        } else {
          const clone = optContainer.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[role="radio"], input, button, script, style').forEach((c) => c.remove());
          const text = cleanText(clone.textContent || '');
          if (text) {
            lbl = text;
          }
        }
      }
    }

    // 4. Sibling elements
    if (!lbl && r.parentElement) {
      const sibling = r.parentElement.querySelector('span, label, div:not([role="radio"])');
      if (sibling && sibling !== r && sibling.textContent?.trim()) {
        lbl = cleanText(sibling.textContent);
      }
    }

    // 5. data-value, value, textContent
    if (!lbl) {
      lbl = cleanText(r.getAttribute('data-value') || (r as HTMLInputElement).value || r.textContent || '');
    }

    val = r.getAttribute('data-value') || (r as HTMLInputElement).value || lbl;

    // Normalize "Other:" to "Other"
    let cleanLbl = cleanText(lbl);
    if (/^other\s*:/i.test(cleanLbl)) {
      cleanLbl = 'Other';
    }

    let cleanVal = cleanText(val);
    if (/^other\s*:/i.test(cleanVal)) {
      cleanVal = 'Other';
    }

    if (cleanLbl.length > 0) {
      options.push({ label: cleanLbl, value: cleanVal || cleanLbl });
    }
  }

  return options;
}

export function resolveLabel(el: HTMLElement): string {
  // 1. Google Forms / ATS question item container
  // For radiogroups/groups, inspect the ancestor question container so we don't stop at the radiogroup itself
  const questionItem = (el.getAttribute('role') === 'radiogroup' || el.getAttribute('role') === 'group')
    ? (el.parentElement?.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset') || el)
    : el.closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset');

  if (questionItem) {
    const headingEl = questionItem.querySelector(
      '[role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, .M7eMe, [data-params], h1, h2, h3, h4, legend'
    );
    if (headingEl && headingEl !== el && headingEl.textContent?.trim()) {
      const headingClone = headingEl.cloneNode(true) as HTMLElement;
      headingClone.querySelectorAll('input, select, textarea, button, script, style').forEach((c) => c.remove());
      const headingText = cleanText(headingClone.textContent || '');
      if (headingText && headingText.length > 1) {
        return headingText;
      }
    }
  }

  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);

  // 2. Explicit <label for="id">
  if (el.id && doc && typeof doc.querySelector === 'function') {
    const labelElem = doc.querySelector(`label[for="${escapeCSS(el.id)}"]`);
    if (labelElem && labelElem.textContent?.trim()) {
      return cleanText(labelElem.textContent);
    }
  }

  // 3. Parent/ancestor <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent?.trim()) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, button').forEach((child) => child.remove());
    const labelText = cleanText(clone.textContent || '');
    if (labelText) return labelText;
  }

  // 4. aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && doc) {
    const ids = labelledBy.split(/\s+/);
    const texts = ids
      .map((id) => {
        const target = typeof doc.getElementById === 'function'
          ? doc.getElementById(id)
          : typeof doc.querySelector === 'function'
          ? doc.querySelector(`#${escapeCSS(id)}`)
          : null;
        if (!target) return '';
        const clone = target.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input, select, textarea, button').forEach((c) => c.remove());
        return cleanText(clone.textContent || '');
      })
      .filter((t) => t && t.length > 1 && !/^(your answer|required question|\*)$/i.test(t));
    if (texts.length > 0) {
      return cleanText(texts.join(' '));
    }
  }

  // 5. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return cleanText(ariaLabel);
  }

  // 6. Parent legend (fieldset)
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent?.trim()) {
      return cleanText(legend.textContent);
    }
  }

  // 7. Closest container label/heading
  const container = el.closest('.form-group, .field, .form-row, .form-item, section');
  if (container) {
    const candidateLabel = container.querySelector('label, [class*="label"], [data-automation-id*="label"], h3, h4, strong');
    if (candidateLabel && candidateLabel !== el && candidateLabel.textContent?.trim()) {
      return cleanText(candidateLabel.textContent);
    }
  }

  // 8. Placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return cleanText(placeholder);
  }

  // 9. Name or ID parsed from camelCase / snake_case
  const identifier = el.getAttribute('name') || el.id;
  if (identifier && !/^entry\.\d+$/i.test(identifier)) {
    const humanized = identifier
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
    return cleanText(humanized);
  }

  return 'Unknown field';
}

function getSurroundingText(el: HTMLElement): string {
  const parent = el.parentElement;
  if (!parent) return '';
  const text = cleanText(parent.textContent || '');
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

function cleanText(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(\d+[\.\)]\s*)/, '') // strip leading question numbers like "1. "
    .replace(/[*:]/g, '')
    .trim();
}

function escapeCSS(str: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(str);
  }
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function generateUniqueSelector(el: HTMLElement, fallbackIndex: number): string {
  if (el.id) {
    return `#${escapeCSS(el.id)}`;
  }
  const name = el.getAttribute('name');
  if (name) {
    const tagName = el.tagName.toLowerCase();
    return `${tagName}[name="${escapeCSS(name)}"]`;
  }

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const role = el.getAttribute('role');
    const tagName = el.tagName.toLowerCase();
    const tagPart = role ? `[role="${escapeCSS(role)}"]` : tagName;
    return `${tagPart}[aria-labelledby="${escapeCSS(labelledBy)}"]`;
  }

  // Try data attributes often used in ATS (Greenhouse, Lever, Workday)
  const dataAutomationId = el.getAttribute('data-automation-id');
  if (dataAutomationId) {
    return `[data-automation-id="${escapeCSS(dataAutomationId)}"]`;
  }

  const dataTestId = el.getAttribute('data-testid');
  if (dataTestId) {
    return `[data-testid="${escapeCSS(dataTestId)}"]`;
  }

  // Fallback to structural path
  return `${el.tagName.toLowerCase()}:nth-of-type(${fallbackIndex + 1})`;
}

