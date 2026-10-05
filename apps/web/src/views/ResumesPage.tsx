import React, { useState } from 'react';
import { UserProfile, ResumeRecord } from '@applyflow/types';
import { FileText, Upload, Plus, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ResumesPageProps {
  profile: UserProfile;
  onUpdateResumes: (resumes: ResumeRecord[]) => Promise<void>;
  onMergeImportedProfile?: (imported: Partial<UserProfile>) => Promise<void>;
}

export const ResumesPage: React.FC<ResumesPageProps> = ({ profile, onUpdateResumes }) => {
  const [resumes, setResumes] = useState<ResumeRecord[]>(profile.resumes);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Resume import review state
  const [parsedSample, setParsedSample] = useState({
    name: 'Sohel Hussain',
    email: 'sohelhussaing@gmail.com',
    phone: '+91 9694428769',
    city: 'Bangalore',
    degree: 'Master of Computer Applications (MCA)',
    skills: ['React', 'TypeScript', 'Node.js', 'Go', 'Docker', 'Kubernetes']
  });

  const [choices, setChoices] = useState<Record<string, 'existing' | 'imported' | 'merge'>>({
    name: 'existing',
    email: 'existing',
    phone: 'existing',
    city: 'existing',
    degree: 'existing',
    skills: 'merge'
  });

  async function handleSetDefault(id: string) {
    const updated = resumes.map((r) => ({
      ...r,
      isDefault: r.id === id
    }));
    setResumes(updated);
    await onUpdateResumes(updated);
  }

  function handleAddMockResume() {
    const newResume: ResumeRecord = {
      id: `resume_${Date.now()}`,
      name: 'Cloud & DevOps Resume',
      fileName: 'Sohel_Hussain_DevOps.pdf',
      targetRoles: ['Cloud Engineer', 'DevOps Specialist'],
      relevantSkills: ['Docker', 'AWS', 'CI/CD', 'Kubernetes'],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...resumes, newResume];
    setResumes(updated);
    onUpdateResumes(updated);
  }

  function handleSimulateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setShowImportModal(true);
      setImportStatus(`Parsed: ${file.name}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Resume Management</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage tailored resumes for different role types. The extension recommends the most relevant resume when analyzing job descriptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import / Parse Resume</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleSimulateUpload}
            />
          </label>

          <button
            onClick={handleAddMockResume}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Resume</span>
          </button>
        </div>
      </div>

      {/* Resumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
              resume.isDefault
                ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <FileText className="w-5 h-5" />
                </div>
                {resume.isDefault ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                    Default Resume
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(resume.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-900 font-medium underline"
                  >
                    Set Default
                  </button>
                )}
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{resume.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{resume.fileName}</p>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Target Roles
                </span>
                <div className="flex flex-wrap gap-1">
                  {resume.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Relevant Skills
                </span>
                <div className="flex flex-wrap gap-1">
                  {resume.relevantSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[11px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Updated: {new Date(resume.updatedAt).toLocaleDateString()}</span>
              <span className="text-emerald-600 font-medium">Ready for ATS</span>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side Import Comparison Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Import Resume - Review & Merge</h3>
                <p className="text-xs text-slate-500">
                  {importStatus || 'Extracted fields from uploaded resume'}. Choose how each field should be applied.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>We never overwrite existing profile values without your explicit choice.</span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
              {[
                { key: 'name', label: 'Candidate Name', existing: profile.personal.fullName, imported: parsedSample.name },
                { key: 'email', label: 'Email', existing: profile.personal.email, imported: parsedSample.email },
                { key: 'phone', label: 'Phone', existing: profile.personal.phone, imported: parsedSample.phone },
                { key: 'city', label: 'City', existing: profile.personal.city, imported: parsedSample.city },
                { key: 'degree', label: 'Degree', existing: profile.education[0]?.degree, imported: parsedSample.degree },
                {
                  key: 'skills',
                  label: 'Skills',
                  existing: profile.skills.programming.slice(0, 3).join(', '),
                  imported: parsedSample.skills.join(', ')
                }
              ].map((row) => (
                <div key={row.key} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-800">{row.label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Existing Value</span>
                      <span className="font-medium text-slate-800">{row.existing}</span>
                    </div>
                    <div className="p-2 bg-sky-50 rounded border border-sky-200">
                      <span className="text-[10px] uppercase font-bold text-sky-600 block">Imported Value</span>
                      <span className="font-medium text-slate-800">{row.imported}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setChoices({ ...choices, [row.key]: 'existing' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        choices[row.key] === 'existing'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Keep Existing
                    </button>
                    <button
                      onClick={() => setChoices({ ...choices, [row.key]: 'imported' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        choices[row.key] === 'imported'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      Use Imported
                    </button>
                    {row.key === 'skills' && (
                      <button
                        onClick={() => setChoices({ ...choices, [row.key]: 'merge' })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                          choices[row.key] === 'merge'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Merge Lists
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  alert('Resume preferences merged successfully!');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg"
              >
                Apply Selected Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
