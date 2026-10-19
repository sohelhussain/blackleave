console.log("[blackLeave] Content script active:", location.href);

import { DetectedField, UserProfile, INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { getAdapterForPage, setNativeValue, highlightAutofilledElement, isExtensionUI } from '@applyflow/autofill';

let detectedFields: DetectedField[] = [];
let userProfile: UserProfile = INITIAL_SOHEL_PROFILE;
let isDrawerOpen = false;
let observer: MutationObserver | null = null;
let isScanning = false;
let isApplyingAutofill = false;
let observerDebounceTimeout: any = null;

// Initialize on page load
async function init() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' });
    if (res?.profile) {
      userProfile = res.profile;
    }
  } catch {
    userProfile = INITIAL_SOHEL_PROFILE;
  }

  scanPage();
  setupDynamicObserver();
}

function mergeDetectedFields(existing: DetectedField[], fresh: DetectedField[]): DetectedField[] {
  const existingMap = new Map<string, DetectedField>();
  for (const f of existing) {
    existingMap.set(f.id, f);
  }

  return fresh.map((f) => {
    const prev = existingMap.get(f.id);
    if (prev) {
      return {
        ...f,
        userValue: prev.userValue !== undefined ? prev.userValue : f.userValue,
        approved: prev.approved !== undefined ? prev.approved : f.approved
      };
    }
    return f;
  });
}

function scanPage(): DetectedField[] {
  if (isScanning) return detectedFields;
  isScanning = true;
  const startTime = Date.now();

  try {
    const adapter = getAdapterForPage(window.location.href, document);
    const freshFields = adapter.detectAndMap(document, userProfile).slice(0, 50);

    // Merge with existing fields to preserve user approvals/edits
    detectedFields = mergeDetectedFields(detectedFields, freshFields).slice(0, 50);

    const readyCount = detectedFields.filter(f => f.suggestedValue !== null && !f.requiresConfirmation).length;
    const duration = Date.now() - startTime;

    console.log(`[blackLeave] ATS: ${adapter.name} | Questions detected: ${detectedFields.length} | Ready: ${readyCount} | Duration: ${duration}ms`);

    if (detectedFields.length > 0) {
      const jobInfo = adapter.extractJobInfo ? adapter.extractJobInfo(document) : null;
      chrome.runtime.sendMessage({
        type: 'FRAME_FIELDS_DETECTED',
        fields: detectedFields,
        jobInfo,
        url: window.location.href,
        isIframe: window !== window.top
      }).catch(() => {});
    }

    return detectedFields;
  } finally {
    isScanning = false;
  }
}

function setupDynamicObserver() {
  observer = new MutationObserver((mutations) => {
    if (isApplyingAutofill) return;

    // Reject mutations that originate entirely from blackLeave's extension UI
    const hasExternalMutation = mutations.some((m) => {
      const target = m.target as Element;
      if (!target) return false;
      if (isExtensionUI(target)) return false;
      if (target.parentElement && isExtensionUI(target.parentElement)) return false;
      return true;
    });

    if (!hasExternalMutation) return;

    if (observerDebounceTimeout) clearTimeout(observerDebounceTimeout);
    observerDebounceTimeout = setTimeout(() => {
      if (isScanning || isApplyingAutofill) return;
      const updated = scanPage();
      if (isDrawerOpen) {
        renderDrawer(updated);
      }
    }, 600);
  });

  if (!document.body) {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        if (document.body && observer) {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
          });
        }
      },
      { once: true }
    );
    return;
  }

  observer?.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
}

function cleanHeadingTitle(text: string): string {
  return (text || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(\d+[\.\)]\s*)/, '')
    .replace(/[*:]/g, '')
    .replace(/\s*(?:your answer|short answer text|long answer text|required question)\s*$/i, '')
    .replace(/^\s*(?:your answer|short answer text|long answer text|required question)\s*/i, '')
    .trim()
    .toLowerCase();
}

function resolveTargetControl(field: DetectedField): HTMLElement | null {
  const isCandidateValid = (el: Element | null): el is HTMLElement => {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (!el.isConnected) return false;
    if (isExtensionUI(el)) return false;
    if (el instanceof HTMLInputElement && el.type === 'hidden') return false;
    return true;
  };

  const findInteractiveChild = (container: HTMLElement): HTMLElement | null => {
    if (field.fieldType === 'radio') {
      const radioGroup = container.querySelector('[role="radiogroup"]');
      if (isCandidateValid(radioGroup)) return radioGroup;
      const radio = container.querySelector('[role="radio"], input[type="radio"]');
      if (isCandidateValid(radio)) return radio;
      return container;
    }

    if (field.fieldType === 'checkbox') {
      const chk = container.querySelector('[role="checkbox"], input[type="checkbox"]');
      if (isCandidateValid(chk)) return chk;
    }

    if (field.fieldType === 'textarea') {
      const txt = container.querySelector('textarea, [role="textbox"][aria-multiline="true"]');
      if (isCandidateValid(txt)) return txt;
    }

    if (field.fieldType === 'select') {
      const sel = container.querySelector('select, [role="listbox"], [role="combobox"]');
      if (isCandidateValid(sel)) return sel;
    }

    const inp = container.querySelector(
      'input.whsOnd, input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([aria-label*="Other response" i]):not(.Hvn9fb), textarea, [role="textbox"]:not(input):not(textarea)'
    );
    if (isCandidateValid(inp)) return inp;

    return null;
  };

  // 0. By explicit semantic htmlId (when not a generic Google Form token like i1, i5)
  if (field.htmlId && !/^i\d+$/i.test(field.htmlId)) {
    const elem = document.getElementById(field.htmlId);
    if (elem && isCandidateValid(elem)) {
      const isInteractive =
        elem instanceof HTMLInputElement ||
        elem instanceof HTMLTextAreaElement ||
        elem instanceof HTMLSelectElement ||
        elem.getAttribute('role') === 'radio' ||
        elem.getAttribute('role') === 'radiogroup' ||
        elem.getAttribute('role') === 'checkbox' ||
        elem.getAttribute('role') === 'textbox';
      if (isInteractive) return elem;
      const child = findInteractiveChild(elem);
      if (child) return child;
    }
  }

  // 1. By ariaLabelledBy / heading ID if available
  if (field.ariaLabelledBy) {
    const heading = document.getElementById(field.ariaLabelledBy);
    if (heading && isCandidateValid(heading)) {
      const card = heading.closest(
        '[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset'
      ) as HTMLElement | null;
      if (card && isCandidateValid(card)) {
        const ctrl = findInteractiveChild(card);
        if (ctrl) return ctrl;
      }
    }
  }

  // 2. By question title text match across question headings
  if (field.detectedLabel) {
    const fClean = cleanHeadingTitle(field.detectedLabel);
    const headings = Array.from(
      document.querySelectorAll(
        '.M7eMe, [role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, legend'
      )
    );

    // Pass A: Exact match
    for (const h of headings) {
      if (isExtensionUI(h)) continue;
      const hClean = cleanHeadingTitle(h.textContent || '');
      if (hClean === fClean) {
        const card = h.closest(
          '[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset'
        ) as HTMLElement | null;
        if (card && isCandidateValid(card)) {
          const ctrl = findInteractiveChild(card);
          if (ctrl) return ctrl;
        }
      }
    }

    // Pass B: Exact word match or full phrase containment
    for (const h of headings) {
      if (isExtensionUI(h)) continue;
      const hClean = cleanHeadingTitle(h.textContent || '');
      const isWordMatch =
        (hClean.length > 5 && fClean.length > 5 && (hClean.includes(fClean) || fClean.includes(hClean))) ||
        (fClean === 'name' && (hClean === 'full name' || hClean === 'candidate name' || hClean === 'your name')) ||
        (fClean === 'full name' && hClean === 'name');

      if (isWordMatch) {
        // Prevent false positives: "name" must never match "college name" or "course name"
        if ((fClean === 'name' || fClean === 'full name') && (hClean.includes('college') || hClean.includes('course') || hClean.includes('company'))) {
          continue;
        }

        const card = h.closest(
          '[role="listitem"], .Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [data-item-id], fieldset'
        ) as HTMLElement | null;
        if (card && isCandidateValid(card)) {
          const ctrl = findInteractiveChild(card);
          if (ctrl) return ctrl;
        }
      }
    }
  }

  // 3. By question card index among visible question cards
  if (field.questionIndex !== undefined) {
    const allCards = Array.from(
      document.querySelectorAll(
        '.Qr7Oae, .freebirdFormviewerViewNumberedItemContainer, [role="listitem"].Qr7Oae, fieldset'
      )
    ).filter(c => isCandidateValid(c)) as HTMLElement[];

    if (field.questionIndex < allCards.length) {
      const card = allCards[field.questionIndex];
      const ctrl = findInteractiveChild(card);
      if (ctrl) return ctrl;
    }
  }

  // 4. By container selector if available
  if (field.containerSelector) {
    try {
      const card = document.querySelector(field.containerSelector) as HTMLElement | null;
      if (card && isCandidateValid(card)) {
        const ctrl = findInteractiveChild(card);
        if (ctrl) return ctrl;
      }
    } catch {
      // ignore
    }
  }

  // 5. By field.selector (only if not hidden and not extension UI)
  if (field.selector) {
    try {
      const elem = document.querySelector(field.selector) as HTMLElement | null;
      if (elem && isCandidateValid(elem)) {
        const isInteractive =
          elem instanceof HTMLInputElement ||
          elem instanceof HTMLTextAreaElement ||
          elem instanceof HTMLSelectElement ||
          elem.getAttribute('role') === 'radio' ||
          elem.getAttribute('role') === 'radiogroup' ||
          elem.getAttribute('role') === 'checkbox' ||
          elem.getAttribute('role') === 'textbox';

        if (isInteractive) return elem;
        const child = findInteractiveChild(elem);
        if (child) return child;
      }
    } catch {
      // ignore
    }
  }

  // 6. By htmlId or name
  if (field.htmlId) {
    const elem = document.getElementById(field.htmlId);
    if (elem && isCandidateValid(elem)) return elem;
  }
  if (field.name) {
    try {
      const elem = document.querySelector(`[name="${CSS.escape(field.name)}"]`) as HTMLElement | null;
      if (elem && isCandidateValid(elem)) return elem;
    } catch {
      // ignore
    }
  }

  return null;
}

// Perform autofill on approved fields with live verification
function executeAutofill(fieldsToFill: DetectedField[]): {
  filledCount: number;
  failedCount: number;
  results: Array<{ fieldId: string; label: string; success: boolean; error?: string }>;
} {
  isApplyingAutofill = true;
  let filledCount = 0;
  let failedCount = 0;
  const results: Array<{ fieldId: string; label: string; success: boolean; error?: string }> = [];

  try {
    for (const field of fieldsToFill) {
      const value = field.userValue !== undefined ? field.userValue : field.suggestedValue;
      if (value === null || value === undefined || value === '') {
        field.fillStatus = 'SKIPPED';
        continue;
      }

      const targetControl = resolveTargetControl(field);
      if (!targetControl) {
        console.warn(`[blackLeave] Could not resolve live DOM control for question: "${field.detectedLabel}"`);
        field.fillStatus = 'FAILED';
        field.fillError = 'Control not found in page DOM';
        failedCount++;
        results.push({ fieldId: field.id, label: field.detectedLabel, success: false, error: 'Control not found' });
        continue;
      }

      const success = setNativeValue(targetControl, value);
      if (success) {
        highlightAutofilledElement(targetControl, field.confidenceLevel);
        field.fillStatus = 'FILLED';
        field.fillError = undefined;
        filledCount++;
        results.push({ fieldId: field.id, label: field.detectedLabel, success: true });
      } else {
        console.warn(`[blackLeave] Failed to set or verify native value for question: "${field.detectedLabel}"`);
        field.fillStatus = 'FAILED';
        field.fillError = 'Failed to verify populated value in control';
        failedCount++;
        results.push({ fieldId: field.id, label: field.detectedLabel, success: false, error: 'Value verification failed' });
      }
    }

    console.log(`[blackLeave Content] Autofilled ${filledCount} fields, ${failedCount} failed. Form was NOT submitted.`);
    return { filledCount, failedCount, results };
  } finally {
    isApplyingAutofill = false;
  }
}

// Render in-page review drawer
function renderDrawer(fields: DetectedField[]) {
  let drawer = document.getElementById('blackleave-drawer-host');
  if (!drawer) {
    drawer = document.getElementById('applyflow-drawer-host');
  }
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'blackleave-drawer-host';
    drawer.setAttribute('data-blackleave-root', 'true');
    drawer.style.position = 'fixed';
    drawer.style.top = '0';
    drawer.style.right = '0';
    drawer.style.width = '420px';
    drawer.style.height = '100vh';
    drawer.style.zIndex = '2147483646';
    drawer.style.boxShadow = '-4px 0 24px rgba(0,0,0,0.15)';
    drawer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    document.body.appendChild(drawer);
  } else {
    drawer.setAttribute('data-blackleave-root', 'true');
  }

  const readyCount = fields.filter((f) => f.confidenceLevel === 'HIGH' && f.suggestedValue !== null && !f.requiresConfirmation).length;
  const populatedCount = fields.filter((f) => f.fillStatus === 'FILLED').length;
  const reviewCount = fields.filter((f) => f.confidenceLevel !== 'HIGH' || f.requiresConfirmation || f.suggestedValue === null).length;

  const html = `
    <div data-blackleave-root="true" style="display:flex; flex-direction:column; height:100%; font-size:14px; background:#f8fafc; border-left:1px solid #e2e8f0;">
      <!-- Header -->
      <div style="padding:16px 20px; background:#0f172a; color:#ffffff; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:22px; height:22px; border-radius:5px; background:#1e293b; border:1px solid #334155; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            <img src="${chrome.runtime.getURL('icons/logo-white.png')}" alt="blackLeave logo" style="width:16px; height:16px; object-fit:contain;" />
          </div>
          <span style="font-weight:700; font-size:16px; letter-spacing:-0.3px;">blackLeave</span>
          <span style="font-size:11px; background:#334155; padding:2px 6px; border-radius:4px;">Review Mode</span>
        </div>
        <button id="blackleave-close-drawer" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:20px; line-height:1;">&times;</button>
      </div>

      <!-- Overview Stats -->
      <div style="padding:12px 20px; background:#ffffff; border-bottom:1px solid #e2e8f0; display:flex; gap:12px;">
        <div style="flex:1; padding:8px 12px; background:#f1f5f9; border-radius:6px;">
          <div style="font-size:11px; color:#64748b; font-weight:600;">DETECTED</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${fields.length}</div>
        </div>
        <div style="flex:1; padding:8px 12px; background:${populatedCount > 0 ? '#ecfdf5' : '#f1f5f9'}; border-radius:6px;">
          <div style="font-size:11px; color:${populatedCount > 0 ? '#065f46' : '#64748b'}; font-weight:600;">${populatedCount > 0 ? 'POPULATED' : 'READY (VERIFIED)'}</div>
          <div style="font-size:18px; font-weight:700; color:${populatedCount > 0 ? '#059669' : '#059669'};">${populatedCount > 0 ? populatedCount : readyCount}</div>
        </div>
        <div style="flex:1; padding:8px 12px; background:#fffbeb; border-radius:6px;">
          <div style="font-size:11px; color:#92400e; font-weight:600;">NEED REVIEW</div>
          <div style="font-size:18px; font-weight:700; color:#d97706;">${reviewCount}</div>
        </div>
      </div>

      <!-- Execution Status Banner (if autofill ran) -->
      ${fields.some((f) => f.fillStatus) ? `
        <div style="padding:10px 20px; background:${populatedCount > 0 ? '#ecfdf5' : '#fff1f2'}; border-bottom:1px solid ${populatedCount > 0 ? '#a7f3d0' : '#fecdd3'}; font-size:12px; color:${populatedCount > 0 ? '#065f46' : '#9f1239'}; font-weight:600; display:flex; align-items:center; justify-content:space-between;">
          <span>✓ ${populatedCount} fields populated & verified into form.</span>
          ${fields.filter((f) => f.fillStatus === 'FAILED').length > 0 ? `<span style="color:#b91c1c;">${fields.filter((f) => f.fillStatus === 'FAILED').length} failed to populate</span>` : ''}
        </div>
      ` : ''}

      <!-- Notice Banner -->
      <div style="padding:10px 20px; background:#eff6ff; border-bottom:1px solid #bfdbfe; font-size:12px; color:#1e40af; display:flex; align-items:center; gap:6px;">
        <span>🔒 Zero Auto-Submit Guarantee: You retain 100% control over submission.</span>
      </div>

      <!-- Field List -->
      <div style="flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:12px;">
        ${fields.map((f, i) => renderFieldItem(f, i)).join('')}
      </div>

      <!-- Action Footer -->
      <div style="padding:16px 20px; background:#ffffff; border-top:1px solid #e2e8f0; display:flex; flex-direction:column; gap:8px;">
        <button id="blackleave-fill-all-btn" style="width:100%; padding:10px; background:#0284c7; color:#ffffff; font-weight:600; font-size:14px; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          ✓ Fill Approved Fields (${fields.filter((f) => f.approved !== false && (f.suggestedValue !== null || f.userValue)).length})
        </button>
        ${populatedCount > 0 ? `
          <button id="blackleave-done-btn" style="width:100%; padding:9px; background:#0f172a; color:#ffffff; font-weight:600; font-size:13px; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            Done / Close Drawer
          </button>
        ` : ''}
        <div style="font-size:11px; color:#94a3b8; text-align:center;">
          Fields will be populated into the page. Form will NOT be submitted.
        </div>
      </div>
    </div>
  `;

  drawer.innerHTML = html;
  attachDrawerListeners(fields);
  isDrawerOpen = true;
}

function renderFieldItem(f: DetectedField, i: number): string {
  const isFilled = f.fillStatus === 'FILLED';
  const isFailed = f.fillStatus === 'FAILED';
  const isMissing = f.suggestedValue === null || f.source === 'unmapped';
  const isHigh = f.confidenceLevel === 'HIGH' && !f.requiresConfirmation && !isMissing;
  const isMed = !isHigh && !isMissing;

  const badgeStyle = isFilled
    ? 'background:#ecfdf5; color:#065f46; border:1px solid #10b981;'
    : isFailed
    ? 'background:#fef2f2; color:#991b1b; border:1px solid #ef4444;'
    : isHigh
    ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;'
    : isMed
    ? 'background:#fffbeb; color:#92400e; border:1px solid #fde68a;'
    : 'background:#fef2f2; color:#991b1b; border:1px solid #fecaca;';

  const badgeLabel = isFilled
    ? '✓ Populated & Verified'
    : isFailed
    ? '✕ Fill Failed'
    : isHigh
    ? '✓ Ready (Verified)'
    : isMed
    ? '⚠ Needs Review'
    : '! Missing Information';

  const displayVal = f.userValue !== undefined ? f.userValue : f.suggestedValue || '';

  const categoryLabel = f.category === 'ROLE_MOTIVATION' ? 'Role Motivation' :
    f.category === 'COMPANY_MOTIVATION' ? 'Company Motivation' :
    f.category === 'AVAILABILITY' ? 'Availability / Notice Period' :
    f.category === 'PERSONAL' ? 'Personal Info' :
    f.category === 'EDUCATION' ? 'Education' :
    f.category === 'EXPERIENCE' ? 'Experience' :
    f.category === 'SKILLS' ? 'Skills' :
    f.category === 'PROJECT' ? 'Projects' :
    f.category === 'WORK_AUTHORIZATION' ? 'Work Authorization' :
    f.category === 'SPONSORSHIP' ? 'Sponsorship' :
    f.category === 'SALARY' ? 'Salary' :
    f.category === 'LOCATION' ? 'Location' :
    f.category === 'BEHAVIORAL' ? 'Behavioral Question' :
    f.category === 'DEMOGRAPHIC' ? 'Demographics' : 'Unrecognized/open-ended field';

  return `
    <div data-blackleave-root="true" style="background:#ffffff; border:1px solid ${isFilled ? '#10b981' : isFailed ? '#ef4444' : '#e2e8f0'}; border-radius:8px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <label style="font-weight:600; font-size:13px; color:#1e293b; max-width:240px; word-break:break-word;">
          ${f.detectedLabel} ${f.isRequired ? '<span style="color:#ef4444;">*</span>' : ''}
        </label>
        <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; white-space:nowrap; ${badgeStyle}">
          ${badgeLabel}
        </span>
      </div>

      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; flex-wrap:wrap;">
        <span style="font-size:10px; font-weight:700; color:#334155; background:#e2e8f0; padding:1px 6px; border-radius:4px;">
          ${f.fieldType.toUpperCase()}
        </span>
        <span style="font-size:10px; font-weight:600; text-transform:uppercase; color:#64748b; background:#f1f5f9; padding:1px 6px; border-radius:4px;">
          ${categoryLabel}
        </span>
        <span style="font-size:10px; color:#64748b;">
          Source: ${f.source} (${Math.round(f.confidence * 100)}%)
        </span>
        ${f.suggestedProfileField ? `<span style="font-size:10px; color:#0284c7; font-family:monospace;">${f.suggestedProfileField}</span>` : ''}
      </div>

      ${f.explanation ? `<div style="font-size:11px; color:#64748b; margin-bottom:8px;">${f.explanation}</div>` : ''}
      ${f.fillError ? `<div style="font-size:11px; color:#ef4444; font-weight:500; margin-bottom:8px;">⚠️ ${f.fillError}</div>` : ''}

      ${f.options && f.options.length > 0 ? `
        <div style="margin-bottom:8px;">
          <div style="font-size:11px; font-weight:600; color:#475569; margin-bottom:4px;">Available Choices:</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${f.options.map((opt) => {
              const isSelected = displayVal === opt.label || displayVal === opt.value;
              const bg = isSelected ? '#0284c7' : '#f8fafc';
              const textCol = isSelected ? '#ffffff' : '#334155';
              const border = isSelected ? '#0284c7' : '#cbd5e1';
              return `
                <button type="button" class="blackleave-option-chip" data-field-index="${i}" data-opt-label="${opt.label}" data-opt-value="${opt.value}" style="cursor:pointer; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid ${border}; background:${bg}; color:${textCol}; font-weight:${isSelected ? '600' : '400'}; transition:all 0.15s ease;">
                  ${isSelected ? '● ' : '○ '}${opt.label}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div style="display:flex; flex-direction:column; gap:6px;">
        ${f.fieldType === 'textarea' ? `
          <textarea data-field-index="${i}" class="blackleave-input-val" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:12px; font-family:inherit; min-height:64px; box-sizing:border-box;">${displayVal}</textarea>
        ` : `
          <input type="${f.fieldType === 'radio' || f.fieldType === 'checkbox' ? 'text' : f.fieldType}" data-field-index="${i}" class="blackleave-input-val" value="${displayVal}" placeholder="${f.options ? 'Select choice above or enter custom...' : 'Enter value...'}" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:12px; box-sizing:border-box;" />
        `}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:11px; color:#475569; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" data-field-index="${i}" class="blackleave-approve-check" ${f.approved !== false && (displayVal !== '') ? 'checked' : ''} />
              Approve
            </label>
            <button data-field-index="${i}" class="blackleave-skip-btn" style="background:transparent; border:none; color:#94a3b8; font-size:11px; cursor:pointer; text-decoration:underline; padding:0;">
              Reject/Skip
            </button>
          </div>
          ${!isHigh && f.category !== 'DEMOGRAPHIC' ? `
            <button data-field-index="${i}" class="blackleave-regen-btn" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 8px; border-radius:4px; font-size:11px; cursor:pointer; color:#334155;">
              ✨ Ask Gemini
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function attachDrawerListeners(fields: DetectedField[]) {
  // Option chip selection
  document.querySelectorAll('.blackleave-option-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLElement;
      const idx = parseInt(btn.getAttribute('data-field-index') || '0', 10);
      const optVal = btn.getAttribute('data-opt-value') || btn.getAttribute('data-opt-label') || '';
      fields[idx].userValue = optVal;
      fields[idx].suggestedValue = optVal;
      fields[idx].approved = true;
      renderDrawer(fields);
    });
  });

  // Close drawer
  const closeBtn = document.getElementById('blackleave-close-drawer') || document.getElementById('applyflow-close-drawer');
  closeBtn?.addEventListener('click', () => {
    const drawer = document.getElementById('blackleave-drawer-host') || document.getElementById('applyflow-drawer-host');
    if (drawer) drawer.remove();
    isDrawerOpen = false;
  });

  // Done button
  const doneBtn = document.getElementById('blackleave-done-btn');
  doneBtn?.addEventListener('click', () => {
    const drawer = document.getElementById('blackleave-drawer-host') || document.getElementById('applyflow-drawer-host');
    if (drawer) drawer.remove();
    isDrawerOpen = false;
  });

  // Value change
  document.querySelectorAll('.blackleave-input-val').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      const val = (e.target as HTMLInputElement).value;
      fields[idx].userValue = val;
      fields[idx].suggestedValue = val;
      fields[idx].approved = true;
    });
  });

  // Approval checkbox
  document.querySelectorAll('.blackleave-approve-check').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      fields[idx].approved = (e.target as HTMLInputElement).checked;
    });
  });

  // Skip / Reject button
  document.querySelectorAll('.blackleave-skip-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      fields[idx].approved = false;
      renderDrawer(fields);
    });
  });

  // Regenerate with Gemini
  document.querySelectorAll('.blackleave-regen-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      const field = fields[idx];
      (e.target as HTMLElement).textContent = '⏳ Asking Gemini...';

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'FETCH_AI_ANSWER',
          payload: {
            fieldLabel: field.detectedLabel,
            fieldType: field.fieldType,
            category: field.category,
            surroundingContext: field.surroundingText,
            profileContext: userProfile
          }
        });

        if (response?.result) {
          if (response.result.status === 'INSUFFICIENT_INFORMATION' || response.result.answer === 'INSUFFICIENT_INFORMATION') {
            field.suggestedValue = '';
            field.userValue = '';
            field.approved = false;
            field.confidenceLevel = 'LOW';
            field.explanation = 'Information not available in verified profile. Please answer manually.';
          } else if (response.result.answer) {
            field.suggestedValue = response.result.answer;
            field.userValue = response.result.answer;
            field.approved = true;
            field.explanation = `Gemini AI: ${response.result.reason || 'Synthesized using verified profile data'}`;
          }
          renderDrawer(fields);
        }
      } catch (err) {
        console.error('[blackLeave] AI regeneration failed:', err);
        (e.target as HTMLElement).textContent = '❌ Failed';
      }
    });
  });

  // Fill all approved fields button
  const fillAllBtn = document.getElementById('blackleave-fill-all-btn') || document.getElementById('applyflow-fill-all-btn');
  fillAllBtn?.addEventListener('click', () => {
    const approvedFields = fields.filter((f) => f.approved !== false && (f.userValue || f.suggestedValue));
    const result = executeAutofill(approvedFields);

    // Keep drawer open with verified status
    renderDrawer(fields);

    // Record in history
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION',
      application: {
        id: `app_${Date.now()}`,
        company: document.title.split('-')[0].trim() || 'Job Application',
        role: 'Software Engineer',
        url: window.location.href,
        date: new Date().toISOString().split('T')[0],
        fieldsFilled: result.filledCount,
        aiAnswersCount: approvedFields.filter((f) => f.source === 'ai').length,
        status: 'Reviewed'
      }
    });

    if (result.failedCount > 0) {
      showFeedbackBanner(`Populated ${result.filledCount} of ${approvedFields.length} approved fields (${result.failedCount} failed to populate).`);
    } else {
      showFeedbackBanner(`✓ Successfully populated & verified ${result.filledCount} fields! Please review the form before submitting.`);
    }
  });
}

function showFeedbackBanner(msg: string) {
  const banner = document.createElement('div');
  banner.setAttribute('data-blackleave-root', 'true');
  banner.style.position = 'fixed';
  banner.style.bottom = '24px';
  banner.style.right = '24px';
  banner.style.zIndex = '2147483647';
  banner.style.background = '#0f172a';
  banner.style.color = '#ffffff';
  banner.style.padding = '12px 20px';
  banner.style.borderRadius = '8px';
  banner.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  banner.style.fontSize = '13px';
  banner.style.fontWeight = '500';
  banner.innerText = msg;
  document.body.appendChild(banner);

  setTimeout(() => {
    banner.remove();
  }, 4000);
}

// Listen to messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_PAGE') {
    const fields = scanPage();
    const adapter = getAdapterForPage(window.location.href, document);
    const jobInfo = adapter.extractJobInfo ? adapter.extractJobInfo(document) : null;
    sendResponse({ fields, jobInfo });
    return true;
  }

  if (message.type === 'OPEN_REVIEW_DRAWER') {
    const fields = scanPage();
    renderDrawer(fields);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'EXECUTE_AUTOFILL') {
    const fieldsToFill = message.fields || detectedFields.filter((f) => f.confidenceLevel === 'HIGH');
    const result = executeAutofill(fieldsToFill);
    if (result.failedCount > 0) {
      showFeedbackBanner(`Populated ${result.filledCount} of ${fieldsToFill.length} fields (${result.failedCount} failed).`);
    } else {
      showFeedbackBanner(`✓ Populated and verified ${result.filledCount} fields!`);
    }
    sendResponse({ success: true, filledCount: result.filledCount, failedCount: result.failedCount, results: result.results });
    return true;
  }

  return true;
});

// Run
init();
