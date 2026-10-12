import { DetectedField, FieldCategory } from '@applyflow/types';

/**
 * Checks whether an element belongs to blackLeave's extension-owned UI
 * (Review Drawer, popup, badges, banners, etc.).
 * Guarantees that internal extension elements are never scanned as form questions.
 */
export function isExtensionUI(el: Element | null): boolean {
  if (!el) return false;
  try {
    if (typeof (el as any).closest === 'function') {
      return Boolean(
        (el as any).closest(
          '[data-blackleave-root="true"], #blackleave-drawer-host, #applyflow-drawer-host, .blackleave-ui'
        )
      );
    }
  } catch {
    // fallback for environments with partial mock DOM
  }
  return false;
}

/**
 * Filter out bogus titles like "Approve", "Enter value...", "Your answer", etc.
 */
export const BOGUS_TITLE_REGEX = /^(?:approve|enter\s*value(?:\.\.\.)?|select\s*choice.*|your\s*answer|short\s*answer(?:\s*text)?|long\s*answer(?:\s*text)?|other\s*response|submit|clear\s*form|page\s*\d+\s*of\s*\d+|required\s*question|\*)$/i;

export interface DetectionDiagnostics {
  rawCandidates: number;
  validQuestions: number;
  logicalFields: number;
  rejectedExtensionUI: number;
  scanDurationMs: number;
}

/**
 * Traverses DOM and detects application form fields, resolving accessible labels,
 * placeholders, attributes, and options while strictly excluding extension UI.
 */
export function detectFormFields(
  root: Document | ShadowRoot | Element = document,
  diagnosticsOut?: Partial<DetectionDiagnostics>
): DetectedField[] {
  const startTime = Date.now();
  const fields: DetectedField[] = [];
  const processedElements = new Set<Element>();
  let rejectedExtensionCount = 0;

  const MAX_RAW_CANDIDATES = 500;
  const MAX_LOGICAL_FIELDS = 100;

  // ---------------------------------------------------------------------------
  // 1. Google Forms & Structured ATS Question Cards
  // Detect top-level question containers (.Qr7Oae, [role="listitem"].Qr7Oae, fieldset, etc.)
  // Each question container produces EXACTLY ONE logical field.
  // ---------------------------------------------------------------------------
  const questionCardQuery = [
    '.Qr7Oae',
    '.freebirdFormviewerViewNumberedItemContainer',
    '[role="listitem"].Qr7Oae',
    'fieldset'
  ].join(', ');

  const questionCards = Array.from(root.querySelectorAll(questionCardQuery)).filter((card) => {
    if (isExtensionUI(card)) {
      rejectedExtensionCount++;
      return false;
    }
    return isVisible(card);
  }) as HTMLElement[];

  let index = 0;

  for (const card of questionCards) {
    if (fields.length >= MAX_LOGICAL_FIELDS) break;
    if (processedElements.has(card)) continue;

    // Check if card contains form controls
    const hasControls = card.querySelector(
      'input, textarea, select, [role="radiogroup"], [role="radio"], [role="checkbox"], [role="listbox"], [role="combobox"], [role="textbox"]'
    );
    if (!hasControls) continue;

    // Extract title from heading element inside this question card
    // Note: NEVER include [data-params] in heading selector
    const headingEl = card.querySelector(
      '.M7eMe, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, legend, h1, h2, h3, h4'
    );

    let title = '';
    if (headingEl && headingEl !== card && headingEl.textContent?.trim()) {
      const headingClone = headingEl.cloneNode(true) as HTMLElement;
      headingClone
        .querySelectorAll('input, select, textarea, button, script, style, .v3DuG, [aria-label*="Required" i]')
        .forEach((c) => c.remove());
      title = cleanText(headingClone.textContent || '');
    }

    if (!title || BOGUS_TITLE_REGEX.test(title)) {
      // Fallback: check aria-labelledby or label element inside card
      const labelledEl = card.querySelector('[aria-labelledby]');
      if (labelledEl) {
        title = resolveLabel(labelledEl as HTMLElement);
      }
    }

    if (!title || BOGUS_TITLE_REGEX.test(title) || title.length < 2) {
      continue;
    }

    // Required status
    const isRequired =
      Boolean(card.querySelector('.v3DuG, [aria-label*="Required" i]')) ||
      title.includes('*') ||
      card.getAttribute('aria-required') === 'true';

    // Find control type and options
    const childRadios = Array.from(card.querySelectorAll('[role="radio"], input[type="radio"]')) as HTMLElement[];
    const childCheckboxes = Array.from(card.querySelectorAll('[role="checkbox"], input[type="checkbox"]')) as HTMLElement[];
    const childTextarea = card.querySelector('textarea, [role="textbox"][aria-multiline="true"]') as HTMLElement | null;
    const childSelect = card.querySelector('select, [role="listbox"], [role="combobox"]') as HTMLElement | null;
    const childInputs = Array.from(
      card.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([aria-label*="Other response" i]):not(.Hvn9fb), [role="textbox"]:not(input):not(textarea)'
      )
    ) as HTMLElement[];

    let fieldType: DetectedField['fieldType'] = 'text';
    let targetElement: HTMLElement = card;
    let options: Array<{ label: string; value: string }> | undefined;

    if (childRadios.length > 0) {
      fieldType = 'radio';
      targetElement = (card.querySelector('[role="radiogroup"]') as HTMLElement) || childRadios[0] || card;
      options = extractRadioOptions(card);
      // Mark all radios and helper text inputs as processed
      childRadios.forEach((r) => processedElements.add(r));
      card.querySelectorAll('input[aria-label*="Other" i], .Hvn9fb').forEach((inp) => processedElements.add(inp));
      if (card.querySelector('[role="radiogroup"]')) {
        processedElements.add(card.querySelector('[role="radiogroup"]')!);
      }
    } else if (childCheckboxes.length > 0) {
      fieldType = 'checkbox';
      targetElement = childCheckboxes[0];
      childCheckboxes.forEach((c) => processedElements.add(c));
    } else if (childTextarea) {
      fieldType = 'textarea';
      targetElement = childTextarea;
      processedElements.add(childTextarea);
    } else if (childSelect) {
      fieldType = 'select';
      targetElement = childSelect;
      if (childSelect instanceof HTMLSelectElement && childSelect.options) {
        options = Array.from(childSelect.options).map((opt) => ({
          label: cleanText(opt.text),
          value: cleanText(opt.value)
        }));
      } else {
        const optItems = Array.from(childSelect.querySelectorAll('[role="option"], [role="menuitem"]'));
        options = optItems
          .map((o) => {
            const val = o.getAttribute('data-value') || o.textContent?.trim() || '';
            return { label: cleanText(o.textContent || val), value: cleanText(val) };
          })
          .filter((o) => o.label.length > 0);
      }
      processedElements.add(childSelect);
    } else if (childInputs.length > 0) {
      const inp = childInputs[0];
      targetElement = inp;
      const inputType = (inp as HTMLInputElement).type?.toLowerCase() || 'text';
      switch (inputType) {
        case 'email':
        case 'tel':
        case 'url':
        case 'number':
        case 'date':
        case 'file':
          fieldType = inputType;
          break;
        default:
          fieldType = 'text';
      }
      processedElements.add(inp);
    } else {
      continue;
    }

    processedElements.add(card);

    const selector = generateUniqueSelector(targetElement, index, card);
    const stableId = generateStableFieldId(targetElement, card, title, index);
    const headingId = headingEl?.getAttribute('id') || undefined;
    const ariaLabelledBy = targetElement.getAttribute('aria-labelledby') || headingId;
    const cardParent = card.parentElement;
    const cardIndexInParent = cardParent ? Array.from(cardParent.children).indexOf(card) : -1;
    const containerSelector = card.getAttribute('data-item-id')
      ? `[data-item-id="${escapeCSS(card.getAttribute('data-item-id')!)}"]`
      : cardIndexInParent >= 0
      ? `.Qr7Oae:nth-child(${cardIndexInParent + 1})`
      : undefined;

    fields.push({
      id: stableId,
      selector,
      detectedLabel: title,
      fieldType,
      placeholder: targetElement.getAttribute('placeholder') || null,
      name: targetElement.getAttribute('name') || null,
      htmlId: targetElement.getAttribute('id') || null,
      ariaLabel: targetElement.getAttribute('aria-label') || null,
      surroundingText: getSurroundingText(targetElement),
      options,
      isRequired,
      suggestedProfileField: null,
      category: 'UNKNOWN' as FieldCategory,
      confidence: 0,
      confidenceLevel: 'LOW',
      source: 'unmapped',
      suggestedValue: null,
      requiresConfirmation: false,
      questionIndex: index,
      containerSelector,
      ariaLabelledBy,
      targetRole: targetElement.getAttribute('role') || undefined
    });

    index++;
  }

  // ---------------------------------------------------------------------------
  // 2. Generic Controls Fallback (for fields outside structured question cards)
  // ---------------------------------------------------------------------------
  const controlQuery = [
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

  const rawElements = Array.from(root.querySelectorAll(controlQuery));

  // Traverse open shadow roots only on custom elements if needed
  if (fields.length < MAX_LOGICAL_FIELDS && rawElements.length < MAX_RAW_CANDIDATES) {
    try {
      const customHosts = Array.from(root.querySelectorAll(':defined')).slice(0, 50);
      for (const host of customHosts) {
        if (isExtensionUI(host)) continue;
        if (host.shadowRoot) {
          const shadowElements = host.shadowRoot.querySelectorAll(controlQuery);
          rawElements.push(...Array.from(shadowElements));
        }
      }
    } catch {
      // ignore
    }
  }

  const rawCandidatesCount = rawElements.length;

  for (const el of rawElements) {
    if (fields.length >= MAX_LOGICAL_FIELDS) break;
    if (index >= MAX_RAW_CANDIDATES) break;
    if (isExtensionUI(el)) {
      rejectedExtensionCount++;
      continue;
    }
    if (processedElements.has(el)) continue;
    if (!isVisible(el)) continue;

    const htmlEl = el as HTMLElement;
    const role = htmlEl.getAttribute('role')?.toLowerCase();
    const tagName = htmlEl.tagName.toLowerCase();
    const isRadio = role === 'radio' || (tagName === 'input' && (htmlEl as HTMLInputElement).type === 'radio');

    // Skip helper "Other response" text inputs
    if (
      (htmlEl.getAttribute('aria-label')?.toLowerCase().includes('other response') ||
        htmlEl.classList.contains('Hvn9fb')) &&
      htmlEl.closest('[role="radiogroup"], [role="listitem"], .Qr7Oae')
    ) {
      continue;
    }

    if (role === 'radiogroup') {
      const childRadios = htmlEl.querySelectorAll('[role="radio"], input[type="radio"]');
      childRadios.forEach((r) => processedElements.add(r));
    } else if (isRadio) {
      if (htmlEl.closest('[role="radiogroup"]')) continue;

      // Group sibling radios sharing the same name or container as one field
      const name = htmlEl.getAttribute('name');
      const container = htmlEl.closest('fieldset, form, [role="group"]') || htmlEl.parentElement;
      if (container) {
        const queryStr = name ? `input[type="radio"][name="${CSS.escape(name)}"]` : '[role="radio"], input[type="radio"]';
        const siblings = Array.from(container.querySelectorAll(queryStr));
        if (siblings.length > 1) {
          siblings.forEach((r) => processedElements.add(r));
          const detected = analyzeElement(htmlEl, index++, true);
          if (detected && !BOGUS_TITLE_REGEX.test(detected.detectedLabel)) {
            processedElements.add(htmlEl);
            fields.push(detected);
          }
          continue;
        }
      }
    }

    const detected = analyzeElement(htmlEl, index++);
    if (detected && !BOGUS_TITLE_REGEX.test(detected.detectedLabel)) {
      processedElements.add(el);
      fields.push(detected);
    }
  }

  const durationMs = Date.now() - startTime;

  if (diagnosticsOut) {
    diagnosticsOut.rawCandidates = rawCandidatesCount;
    diagnosticsOut.validQuestions = fields.length;
    diagnosticsOut.logicalFields = fields.length;
    diagnosticsOut.rejectedExtensionUI = rejectedExtensionCount;
    diagnosticsOut.scanDurationMs = durationMs;
  }

  return fields.slice(0, MAX_LOGICAL_FIELDS);
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;

  if (typeof (el as any).checkVisibility === 'function') {
    return (el as any).checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true
    });
  }

  const hasWindow = typeof window !== 'undefined';
  const style = hasWindow && window.getComputedStyle ? window.getComputedStyle(el) : (el as any).style;
  if (style) {
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
  }

  if (el.offsetParent === null && el.tagName.toLowerCase() !== 'body') {
    if (style && style.position === 'fixed') {
      return true;
    }
    if (el.isConnected === false) return false;
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

  const hasRadios =
    isGroupContainer ||
    role === 'radiogroup' ||
    role === 'radio' ||
    (tagName === 'input' && (el as HTMLInputElement).type === 'radio');

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
  if (!label || BOGUS_TITLE_REGEX.test(label)) {
    return null;
  }

  const placeholder = el.getAttribute('placeholder') || null;
  const name = el.getAttribute('name') || null;
  const htmlId = el.getAttribute('id') || null;
  const ariaLabel = el.getAttribute('aria-label') || null;
  const surroundingText = getSurroundingText(el);
  const isRequired =
    (el as any).required ||
    el.getAttribute('aria-required') === 'true' ||
    label.includes('*') ||
    !!el
      .closest('[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer')
      ?.querySelector('.v3DuG, [aria-label*="Required" i]');

  let options: Array<{ label: string; value: string }> | undefined;
  if (el instanceof HTMLSelectElement && (el as any).options) {
    options = Array.from(el.options).map((opt) => ({
      label: cleanText(opt.text),
      value: cleanText(opt.value)
    }));
  } else if (hasRadios) {
    const container = el.closest('[role="listitem"], .Qr7Oae, [role="radiogroup"], fieldset') || el;
    options = extractRadioOptions(container as HTMLElement);
  } else if (role === 'listbox' || role === 'combobox') {
    const optItems = Array.from(el.querySelectorAll('[role="option"], [role="menuitem"]'));
    options = optItems
      .map((o) => {
        const val = o.getAttribute('data-value') || o.textContent?.trim() || '';
        return { label: cleanText(o.textContent || val), value: cleanText(val) };
      })
      .filter((o) => o.label.length > 0);
  }

  const selector = generateUniqueSelector(el, index);
  const stableId = generateStableFieldId(el, null, label, index);

  return {
    id: stableId,
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
 * Extracts all options from a radio container or question container, inspecting data-value,
 * aria-label, aria-labelledby, and label text spans.
 */
export function extractRadioOptions(
  container: HTMLElement
): Array<{ label: string; value: string }> {
  const radioItems = Array.from(container.querySelectorAll('[role="radio"], input[type="radio"]'));
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

    // 1. Google Forms data-value attribute directly on radio
    const dataVal = r.getAttribute('data-value');
    if (dataVal && dataVal !== '__other_option__') {
      lbl = cleanText(dataVal);
      val = cleanText(dataVal);
    }

    // 2. Direct aria-label on radio
    if (!lbl) {
      const ariaLabel = r.getAttribute('aria-label');
      if (ariaLabel && !/^(?:other response|your answer)$/i.test(ariaLabel.trim())) {
        lbl = cleanText(ariaLabel);
      }
    }

    // 3. Option wrapper container (.docssharedWizToggleLabeledContainer, .nWQGrd, etc.)
    // Note: NEVER include [role="listitem"] as it is the outer question container!
    if (!lbl) {
      const optContainer = r.closest('label, .docssharedWizToggleLabeledContainer, .nWQGrd, .oyTey');
      if (optContainer) {
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

    // 4. aria-labelledby on radio
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

    // 5. Native radio value
    if (!lbl && (r as HTMLInputElement).value) {
      lbl = cleanText((r as HTMLInputElement).value);
    }

    if (!val) {
      val = dataVal || lbl;
    }

    // Normalize "Other:"
    if (/^other\s*:/i.test(lbl) || dataVal === '__other_option__') {
      lbl = 'Other';
      val = 'Other';
    }

    if (lbl.length > 0 && !/^(?:your answer|other response)$/i.test(lbl)) {
      options.push({ label: lbl, value: val || lbl });
    }
  }

  return options;
}

export function resolveLabel(el: HTMLElement): string {
  // 1. Google Forms / ATS question item container
  const questionItem = el.closest(
    '[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset'
  );

  if (questionItem) {
    // Note: NEVER include [data-params] in heading selector
    const headingEl = questionItem.querySelector(
      '.M7eMe, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, legend, h1, h2, h3, h4'
    );
    if (headingEl && headingEl !== el && headingEl.textContent?.trim()) {
      const headingClone = headingEl.cloneNode(true) as HTMLElement;
      headingClone
        .querySelectorAll('input, select, textarea, button, script, style, .v3DuG, [aria-label*="Required" i]')
        .forEach((c) => c.remove());
      const headingText = cleanText(headingClone.textContent || '');
      if (headingText && headingText.length > 1 && !BOGUS_TITLE_REGEX.test(headingText)) {
        return headingText;
      }
    }
  }

  const doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);

  // 2. Explicit <label for="id">
  if (el.id && doc && typeof doc.querySelector === 'function') {
    const labelElem = doc.querySelector(`label[for="${escapeCSS(el.id)}"]`);
    if (labelElem && labelElem.textContent?.trim()) {
      const text = cleanText(labelElem.textContent);
      if (!BOGUS_TITLE_REGEX.test(text)) return text;
    }
  }

  // 3. Parent/ancestor <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent?.trim()) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea, button').forEach((child) => child.remove());
    const labelText = cleanText(clone.textContent || '');
    if (labelText && !BOGUS_TITLE_REGEX.test(labelText)) return labelText;
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
      .filter((t) => t && t.length > 1 && !/^(?:your answer|short answer text|long answer text|required question|\*)$/i.test(t));
    if (texts.length > 0) {
      const text = cleanText(texts.join(' '));
      if (!BOGUS_TITLE_REGEX.test(text)) return text;
    }
  }

  // 5. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    const text = cleanText(ariaLabel);
    if (!BOGUS_TITLE_REGEX.test(text)) return text;
  }

  // 6. Parent legend (fieldset)
  const fieldset = el.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend && legend.textContent?.trim()) {
      const text = cleanText(legend.textContent);
      if (!BOGUS_TITLE_REGEX.test(text)) return text;
    }
  }

  // 7. Closest container label/heading
  const container = el.closest('.form-group, .field, .form-row, .form-item, section');
  if (container) {
    const candidateLabel = container.querySelector(
      'label, [class*="label"], [data-automation-id*="label"], h3, h4, strong'
    );
    if (candidateLabel && candidateLabel !== el && candidateLabel.textContent?.trim()) {
      const text = cleanText(candidateLabel.textContent);
      if (!BOGUS_TITLE_REGEX.test(text)) return text;
    }
  }

  // 8. Placeholder (only if not a generic filler)
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    const text = cleanText(placeholder);
    if (!BOGUS_TITLE_REGEX.test(text)) return text;
  }

  // 9. Name or ID parsed from camelCase / snake_case
  const identifier = el.getAttribute('name') || el.id;
  if (identifier && !/^entry\.\d+$/i.test(identifier)) {
    const humanized = identifier
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase();
    const text = cleanText(humanized);
    if (!BOGUS_TITLE_REGEX.test(text)) return text;
  }

  return 'Unknown field';
}

function generateStableFieldId(
  el: HTMLElement,
  container: HTMLElement | null,
  detectedLabel: string,
  fallbackIndex: number
): string {
  const containerId = container?.getAttribute('data-item-id') || container?.id;
  if (containerId) return `field_${containerId}`;
  if (el.id) return `field_${el.id}`;
  const name = el.getAttribute('name');
  if (name) return `field_${name}`;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) return `field_${labelledBy.split(/\s+/)[0]}`;
  const cleanLbl = detectedLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
  if (cleanLbl.length > 2) return `field_${cleanLbl}_${fallbackIndex}`;
  return `field_${fallbackIndex}`;
}

function getSurroundingText(el: HTMLElement): string {
  const parent = el.parentElement;
  if (!parent) return '';
  const text = cleanText(parent.textContent || '');
  return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

export function cleanText(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(\d+[\.\)]\s*)/, '') // strip leading question numbers like "1. "
    .replace(/[*:]/g, '')
    .replace(/\s*(?:your answer|short answer text|long answer text)\s*$/i, '')
    .replace(/^\s*(?:your answer|short answer text|long answer text)\s*/i, '')
    .trim();
}

export function escapeCSS(str: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(str);
  }
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

export function generateUniqueSelector(
  el: HTMLElement,
  fallbackIndex: number,
  container?: HTMLElement
): string {
  if (container) {
    const itemId = container.getAttribute('data-item-id');
    if (itemId) {
      const role = el.getAttribute('role');
      const tag = el.tagName.toLowerCase();
      const controlSelector = role ? `[role="${role}"]` : tag === 'input' ? 'input:not([type="hidden"])' : tag !== 'div' ? tag : '';
      return `[data-item-id="${escapeCSS(itemId)}"]${controlSelector ? ' ' + controlSelector : ''}`;
    }

    if (container.classList?.contains('Qr7Oae') || container.getAttribute('role') === 'listitem') {
      const parent = container.parentElement;
      if (parent) {
        const cardIndex = Array.from(parent.children).indexOf(container);
        if (cardIndex >= 0) {
          const role = el.getAttribute('role');
          const tag = el.tagName.toLowerCase();
          const controlSelector = role ? `[role="${role}"]` : tag === 'input' ? 'input:not([type="hidden"])' : tag !== 'div' ? tag : '';
          return `.Qr7Oae:nth-child(${cardIndex + 1})${controlSelector ? ' ' + controlSelector : ''}`;
        }
      }
    }
  }

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
    const tagPart = role ? `[role="${role}"]` : tagName;
    const safeAttr = labelledBy.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${tagPart}[aria-labelledby="${safeAttr}"]`;
  }

  const dataAutomationId = el.getAttribute('data-automation-id');
  if (dataAutomationId) {
    return `[data-automation-id="${escapeCSS(dataAutomationId)}"]`;
  }

  const dataTestId = el.getAttribute('data-testid');
  if (dataTestId) {
    return `[data-testid="${escapeCSS(dataTestId)}"]`;
  }

  return `${el.tagName.toLowerCase()}:nth-of-type(${fallbackIndex + 1})`;
}
