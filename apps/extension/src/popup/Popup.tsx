import React, { useEffect, useState } from 'react';
import { DetectedField, UserProfile, INITIAL_SOHEL_PROFILE } from '@applyflow/types';
import { Sparkles, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export const Popup: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_SOHEL_PROFILE);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [jobInfo, setJobInfo] = useState<{ title?: string; company?: string; description?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('resume_backend');
  const [autofillSuccessMsg, setAutofillSuccessMsg] = useState<string | null>(null);
  const [targetFrameId, setTargetFrameId] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  async function sendTabMessage(tabId: number, msg: any, frameId?: number): Promise<any> {
    try {
      if (frameId !== undefined) {
        return await (chrome.tabs.sendMessage as any)(tabId, msg, { frameId });
      }
      return await (chrome.tabs.sendMessage as any)(tabId, msg);
    } catch {
      return null;
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch profile
      const profRes = await chrome.runtime.sendMessage({ type: 'GET_PROFILE' });
      if (profRes?.profile) {
        setProfile(profRes.profile);
      }

      // 2. Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        let scanRes = await sendTabMessage(tab.id, { type: 'SCAN_PAGE' });
        // Fallback for iframe embedded forms or delayed dynamic scans
        if (!scanRes || !scanRes.fields || scanRes.fields.length === 0) {
          const cached = await chrome.runtime.sendMessage({ type: 'GET_TAB_FIELDS', tabId: tab.id }).catch(() => null);
          if (cached?.fields?.length > 0) {
            scanRes = cached;
            if (cached.frameId !== undefined) {
              setTargetFrameId(cached.frameId);
            }
          }
        }
        if (scanRes) {
          setFields(scanRes.fields || []);
          setJobInfo(scanRes.jobInfo || null);
        }
      }
    } catch (err) {
      console.warn('[ApplyFlow Popup] Error loading page state:', err);
    } finally {
      setLoading(false);
    }
  }

  const readyFields = fields.filter((f) => f.confidenceLevel === 'HIGH');
  const reviewFields = fields.filter((f) => f.confidenceLevel !== 'HIGH');

  const detectedRole = jobInfo?.title || 'Software Engineer Intern';
  const detectedCompany = jobInfo?.company || 'Detected Company';

  // Find recommended resume
  const activeResume =
    profile.resumes.find((r) => r.id === selectedResumeId) ||
    profile.resumes.find((r) => r.isDefault) ||
    profile.resumes[0];

  async function handleAutofillVerified() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        let res = await sendTabMessage(
          tab.id,
          { type: 'EXECUTE_AUTOFILL', fields: readyFields },
          targetFrameId
        );

        if (!res && targetFrameId !== undefined) {
          res = await sendTabMessage(tab.id, { type: 'EXECUTE_AUTOFILL', fields: readyFields });
        }

        if (res?.success) {
          setAutofillSuccessMsg(`Populated ${res.filledCount} verified fields!`);
          setTimeout(() => setAutofillSuccessMsg(null), 3000);
        }
      }
    } catch (err) {
      console.error('[ApplyFlow Popup] Autofill failed:', err);
    }
  }

  async function handleOpenReviewDrawer() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        let opened = await sendTabMessage(tab.id, { type: 'OPEN_REVIEW_DRAWER' }, targetFrameId);
        if (!opened && targetFrameId !== undefined) {
          opened = await sendTabMessage(tab.id, { type: 'OPEN_REVIEW_DRAWER' });
        }
        window.close(); // Close popup so user interacts with in-page drawer
      }
    } catch (err) {
      console.error('[ApplyFlow Popup] Failed to open review drawer:', err);
    }
  }

  function handleOpenDashboard() {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 text-xs">
      {/* Top Navigation */}
      <header className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700/70 p-0.5 flex items-center justify-center shrink-0">
            <img src="/icons/logo-white.png" alt="blackLeave logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-bold text-sm tracking-tight">blackLeave</h1>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <button
          onClick={handleOpenDashboard}
          className="text-[11px] text-sky-300 hover:text-sky-200 underline font-medium"
        >
          Open Dashboard
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 flex flex-col gap-3.5 overflow-y-auto">
        {/* Job Card */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Job Detected
          </div>
          <div className="font-bold text-sm text-slate-900 leading-tight">
            {detectedRole}
          </div>
          <div className="text-slate-500 font-medium">{detectedCompany}</div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Candidate Match:</span>
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified Profile Active
            </span>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
            <div className="text-[10px] font-semibold text-slate-500">FIELDS</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{fields.length}</div>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center">
            <div className="text-[10px] font-semibold text-emerald-700">READY</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{readyFields.length}</div>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center">
            <div className="text-[10px] font-semibold text-amber-700">REVIEW</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">{reviewFields.length}</div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={handleAutofillVerified}
            disabled={readyFields.length === 0}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Autofill Application ({readyFields.length} Ready)</span>
          </button>

          {autofillSuccessMsg && (
            <div className="mt-1.5 p-1.5 text-[11px] text-center bg-emerald-100 text-emerald-800 rounded font-medium">
              {autofillSuccessMsg}
            </div>
          )}
        </div>

        {/* AI & Field Preview Section */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">
              Field Status Preview
            </div>
            <button
              onClick={handleOpenReviewDrawer}
              className="text-sky-600 hover:text-sky-700 text-[11px] font-semibold flex items-center gap-1"
            >
              Review All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {readyFields.slice(0, 3).map((f) => (
              <div key={f.id} className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{f.detectedLabel}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">Verified</span>
              </div>
            ))}

            {reviewFields.slice(0, 3).map((f) => (
              <div key={f.id} className="flex items-center justify-between text-[11px] text-slate-600 bg-amber-50/60 p-1.5 rounded border border-amber-100">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{f.detectedLabel}</span>
                </div>
                <span className="text-[10px] text-amber-700 font-medium">Needs Review</span>
              </div>
            ))}

            {fields.length === 0 && !loading && (
              <div className="text-slate-400 text-center py-2 text-[11px]">
                No application form fields detected on this tab.
              </div>
            )}
          </div>

          <button
            onClick={handleOpenReviewDrawer}
            className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-[11px] flex items-center justify-center gap-1.5"
          >
            Review & Edit Answers
          </button>
        </div>

        {/* Resume Recommendation Card */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Recommended Resume
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <div>
                <div className="font-semibold text-slate-900 text-xs">{activeResume.name}</div>
                <div className="text-[10px] text-slate-500">{activeResume.fileName}</div>
              </div>
            </div>

            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded px-1.5 py-1 text-[10px] text-slate-700 font-medium"
            >
              {profile.resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </main>

      {/* Footer / Safety Badge */}
      <footer className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1 text-emerald-600 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Never auto-submits forms</span>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <RefreshCw className="w-3 h-3" /> Rescan
        </button>
      </footer>
    </div>
  );
};
