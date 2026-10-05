console.log("[ApplyFlow] Content script active:", location.href);

import { DetectedField, UserProfile, INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { getAdapterForPage, setNativeValue, highlightAutofilledElement } from '@applyflow/autofill';

let detectedFields: DetectedField[] = [];
let userProfile: UserProfile = INITIAL_SOHEL_PROFILE;
let isDrawerOpen = false;
let observer: MutationObserver | null = null;

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

function scanPage(): DetectedField[] {
  const adapter = getAdapterForPage(window.location.href, document);
  const rawControls = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, [role="textbox"], [role="combobox"], [role="radio"], [role="checkbox"], [role="listbox"], [role="option"], [data-params]'
  );
  detectedFields = adapter.detectAndMap(document, userProfile);
  console.log(`[ApplyFlow] Detected ATS: ${adapter.name}`);
  console.log(`[ApplyFlow] Raw controls found: ${rawControls.length}`);
  console.log(`[ApplyFlow] Application fields detected: ${detectedFields.length}`);
  console.log(`[ApplyFlow] Mapped fields: ${detectedFields.filter(f => f.suggestedValue !== null).length}`);

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
}

function setupDynamicObserver() {
  let debounceTimeout: NodeJS.Timeout | null = null;
  observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const updated = scanPage();
      if (isDrawerOpen) {
        renderDrawer(updated);
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Perform autofill on approved fields
function executeAutofill(fieldsToFill: DetectedField[]): { filledCount: number } {
  let filledCount = 0;

  for (const field of fieldsToFill) {
    const value = field.userValue !== undefined ? field.userValue : field.suggestedValue;
    if (value === null || value === undefined || value === '') continue;

    let element = document.querySelector(field.selector) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;

    // If exact selector fails, try fallback by id or name
    if (!element && field.htmlId) {
      element = document.getElementById(field.htmlId) as any;
    }
    if (!element && field.name) {
      element = document.querySelector(`[name="${CSS.escape(field.name)}"]`) as any;
    }

    if (element) {
      const success = setNativeValue(element, value);
      if (success) {
        highlightAutofilledElement(element, field.confidenceLevel);
        filledCount++;
      }
    }
  }

  console.log(`[ApplyFlow Content] Autofilled ${filledCount} fields. Form was NOT submitted.`);
  return { filledCount };
}

// Render in-page review drawer
function renderDrawer(fields: DetectedField[]) {
  let drawer = document.getElementById('applyflow-drawer-host');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'applyflow-drawer-host';
    document.body.appendChild(drawer);
  }

  const readyCount = fields.filter((f) => f.confidenceLevel === 'HIGH').length;
  const reviewCount = fields.filter((f) => f.confidenceLevel !== 'HIGH').length;

  const html = `
    <div style="display:flex; flex-direction:column; height:100%; font-size:14px; background:#f8fafc;">
      <!-- Header -->
      <div style="padding:16px 20px; background:#0f172a; color:#ffffff; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:10px; height:10px; border-radius:50%; background:#10b981;"></div>
          <span style="font-weight:700; font-size:16px; letter-spacing:-0.3px;">blackLeave</span>
          <span style="font-size:11px; background:#334155; padding:2px 6px; border-radius:4px;">Review Mode</span>
        </div>
        <button id="applyflow-close-drawer" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:20px; line-height:1;">&times;</button>
      </div>

      <!-- Overview Stats -->
      <div style="padding:12px 20px; background:#ffffff; border-bottom:1px solid #e2e8f0; display:flex; gap:12px;">
        <div style="flex:1; padding:8px 12px; background:#f1f5f9; border-radius:6px;">
          <div style="font-size:11px; color:#64748b; font-weight:600;">DETECTED</div>
          <div style="font-size:18px; font-weight:700; color:#0f172a;">${fields.length}</div>
        </div>
        <div style="flex:1; padding:8px 12px; background:#ecfdf5; border-radius:6px;">
          <div style="font-size:11px; color:#065f46; font-weight:600;">READY (VERIFIED)</div>
          <div style="font-size:18px; font-weight:700; color:#059669;">${readyCount}</div>
        </div>
        <div style="flex:1; padding:8px 12px; background:#fffbeb; border-radius:6px;">
          <div style="font-size:11px; color:#92400e; font-weight:600;">NEED REVIEW</div>
          <div style="font-size:18px; font-weight:700; color:#d97706;">${reviewCount}</div>
        </div>
      </div>

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
        <button id="applyflow-fill-all-btn" style="width:100%; padding:10px; background:#0284c7; color:#ffffff; font-weight:600; font-size:14px; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          ✓ Fill Approved Fields (${fields.filter((f) => f.approved !== false && (f.suggestedValue !== null || f.userValue)).length})
        </button>
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
  const isHigh = f.confidenceLevel === 'HIGH';
  const isMed = f.confidenceLevel === 'MEDIUM';
  const badgeClass = isHigh ? 'applyflow-badge-green' : isMed ? 'applyflow-badge-yellow' : 'applyflow-badge-red';
  const badgeLabel = isHigh ? '✓ Verified Profile' : isMed ? '⚠ AI Review' : '! Manual Input';
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
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <label style="font-weight:600; font-size:13px; color:#1e293b; max-width:240px; word-break:break-word;">
          ${f.detectedLabel} ${f.isRequired ? '<span style="color:#ef4444;">*</span>' : ''}
        </label>
        <span class="${badgeClass}" style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:12px; white-space:nowrap;">
          ${badgeLabel}
        </span>
      </div>

      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <span style="font-size:10px; font-weight:600; text-transform:uppercase; color:#64748b; background:#f1f5f9; padding:1px 6px; border-radius:4px;">
          ${categoryLabel}
        </span>
        ${f.suggestedProfileField ? `<span style="font-size:10px; color:#0284c7; font-family:monospace;">${f.suggestedProfileField}</span>` : ''}
      </div>

      ${f.explanation ? `<div style="font-size:11px; color:#64748b; margin-bottom:8px;">${f.explanation}</div>` : ''}

      <div style="display:flex; flex-direction:column; gap:6px;">
        ${f.fieldType === 'textarea' ? `
          <textarea data-field-index="${i}" class="applyflow-input-val" style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:12px; font-family:inherit; min-height:64px; box-sizing:border-box;">${displayVal}</textarea>
        ` : `
          <input type="${f.fieldType === 'radio' || f.fieldType === 'checkbox' ? 'text' : f.fieldType}" data-field-index="${i}" class="applyflow-input-val" value="${displayVal}" placeholder="Enter value..." style="width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:12px; box-sizing:border-box;" />
        `}

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:11px; color:#475569; display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" data-field-index="${i}" class="applyflow-approve-check" ${f.approved !== false && (displayVal !== '') ? 'checked' : ''} />
              Approve
            </label>
            <button data-field-index="${i}" class="applyflow-skip-btn" style="background:transparent; border:none; color:#94a3b8; font-size:11px; cursor:pointer; text-decoration:underline; padding:0;">
              Reject/Skip
            </button>
          </div>
          ${!isHigh && f.category !== 'DEMOGRAPHIC' ? `
            <button data-field-index="${i}" class="applyflow-regen-btn" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 8px; border-radius:4px; font-size:11px; cursor:pointer; color:#334155;">
              ✨ Ask Gemini
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function attachDrawerListeners(fields: DetectedField[]) {
  // Close drawer
  document.getElementById('applyflow-close-drawer')?.addEventListener('click', () => {
    const drawer = document.getElementById('applyflow-drawer-host');
    if (drawer) drawer.remove();
    isDrawerOpen = false;
  });

  // Value change
  document.querySelectorAll('.applyflow-input-val').forEach((input) => {
    input.addEventListener('input', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      const val = (e.target as HTMLInputElement).value;
      fields[idx].userValue = val;
      fields[idx].suggestedValue = val;
      fields[idx].approved = true;
    });
  });

  // Approval checkbox
  document.querySelectorAll('.applyflow-approve-check').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      fields[idx].approved = (e.target as HTMLInputElement).checked;
    });
  });

  // Skip / Reject button
  document.querySelectorAll('.applyflow-skip-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-field-index') || '0', 10);
      fields[idx].approved = false;
      renderDrawer(fields);
    });
  });

  // Regenerate with Gemini
  document.querySelectorAll('.applyflow-regen-btn').forEach((btn) => {
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
        console.error('[ApplyFlow] AI regeneration failed:', err);
        (e.target as HTMLElement).textContent = '❌ Failed';
      }
    });
  });

  // Fill all approved fields button
  document.getElementById('applyflow-fill-all-btn')?.addEventListener('click', () => {
    const approvedFields = fields.filter((f) => f.approved !== false && (f.userValue || f.suggestedValue));
    const result = executeAutofill(approvedFields);

    // Close drawer and notify
    const drawer = document.getElementById('applyflow-drawer-host');
    if (drawer) drawer.remove();
    isDrawerOpen = false;

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

    showFeedbackBanner(`✓ Successfully populated ${result.filledCount} fields! Please review the form before submitting.`);
  });
}

function showFeedbackBanner(msg: string) {
  const banner = document.createElement('div');
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
    showFeedbackBanner(`✓ Populated ${result.filledCount} verified fields into the application!`);
    sendResponse({ success: true, filledCount: result.filledCount });
    return true;
  }

  return true;
});

// Run
init();
