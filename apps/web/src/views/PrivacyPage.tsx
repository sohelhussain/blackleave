import React, { useState } from 'react';
import { Shield, Trash2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';

interface PrivacyPageProps {
  onDeleteAllData: () => Promise<void>;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onDeleteAllData }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletedMsg, setDeletedMsg] = useState(false);

  async function handleConfirmDelete() {
    if (confirmInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await onDeleteAllData();
      setShowConfirmModal(false);
      setDeletedMsg(true);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-600 mb-1">
          <Shield className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Privacy & Trust</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Security & Privacy Disclosures</h2>
        <p className="text-slate-500 text-xs mt-0.5 max-w-2xl">
          blackLeave is built with privacy-first engineering. We hold zero passwords, zero government IDs, and zero credit card information.
        </p>
      </div>

      {/* Security Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>What Data Is Stored</span>
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Only the career profile information you explicitly enter: legal name, contact details, work experience, education, projects, skills, and uploaded resumes.
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Why It Is Stored</span>
          </h3>
          <p className="text-slate-600 leading-relaxed">
            To eliminate repetitive form filling across job application portals, allowing you to populate forms in seconds with verified answers while maintaining full review control.
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>What Data Is Sent to Gemini</span>
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Only filtered context relevant to the specific open-ended question (e.g. project details for a technical question). Your full raw profile and contact details are never sent.
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>When AI Is Used</span>
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Only when a question cannot be resolved deterministically (such as behavioral or technical questions). Deterministic fields (name, email, phone, education) never call Gemini.
          </p>
        </div>
      </div>

      {/* Prohibited Data Notice */}
      <div className="bg-slate-900 text-white rounded-xl p-6 space-y-3">
        <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span>Strict Technical Prohibitions</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
          <div>🚫 Never store job application passwords</div>
          <div>🚫 Never store banking or credit card details</div>
          <div>🚫 Never store government identification numbers</div>
          <div>🚫 Never scrape credentials from job websites</div>
          <div>🚫 Never infer demographic or veteran status</div>
          <div>🚫 NEVER automatically submit any job application</div>
        </div>
      </div>

      {/* Danger Zone: Delete All Profile Data */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-800">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-sm">Danger Zone: Delete All Profile Data</h3>
        </div>
        <p className="text-xs text-rose-700 max-w-2xl leading-relaxed">
          This will permanently delete all stored candidate profile records, education, experience, projects, skills, resumes, and application session history. This action cannot be undone.
        </p>

        {deletedMsg && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold">
            All profile data has been wiped clean.
          </div>
        )}

        <button
          onClick={() => setShowConfirmModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All Profile Data</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Complete Data Wipe</h3>
                <p className="text-xs text-slate-500">Explicit confirmation required.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all personal information, experience, projects, and resumes? To confirm, please type <strong className="text-rose-600">DELETE</strong> below:
            </p>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={confirmInput !== 'DELETE' || deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold text-xs rounded-lg"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
