import React, { useState } from 'react';
import {
  UserProfile,
  INDUSTRIES,
  GENDER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
  QUESTION_LIBRARY,
  ApplicationQuestionCategory,
  calculateProfileCompleteness
} from '@applyflow/types';
import { CountrySelect, ProgressBar } from '@applyflow/ui';
import {
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  Globe,
  Briefcase,
  GraduationCap,
  HelpCircle,
  FileText
} from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  initialTab?: string;
}

export type ProfileSubTab =
  | 'personal'
  | 'preferences'
  | 'education'
  | 'employment'
  | 'workAuth'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'questions'
  | 'additional';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile: initialProfile,
  onSaveProfile,
  initialTab = 'personal'
}) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>(initialTab as ProfileSubTab);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeQuestionCategory, setActiveQuestionCategory] = useState<string>('ALL');

  const completeness = calculateProfileCompleteness(profile);

  async function handleSave() {
    setSaving(true);
    try {
      await onSaveProfile(profile);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  // Helpers for nested updates
  function updatePersonal(patch: Partial<UserProfile['personal']>) {
    setProfile((prev) => ({
      ...prev,
      personal: { ...prev.personal, ...patch }
    }));
  }

  function updateJobPrefs(patch: Partial<UserProfile['jobPreferences']>) {
    setProfile((prev) => ({
      ...prev,
      jobPreferences: { ...prev.jobPreferences, ...patch }
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header and Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Candidate Profile</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {completeness.score}% Complete
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Store your verified career profile once. Used by blackLeave to intelligently match and autofill across any ATS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* Profile Completeness Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <ProgressBar percentage={completeness.score} label="Overall Profile Completeness" />
        </div>
        {completeness.missingItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Recommended:</span>
            {completeness.missingItems.slice(0, 2).map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveSubTab(item.tab as ProfileSubTab)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 rounded border border-slate-200 text-slate-700 transition-colors"
              >
                + {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'personal', label: 'Personal Information' },
          { id: 'preferences', label: 'Work Preferences' },
          { id: 'education', label: 'Education' },
          { id: 'employment', label: 'Employment Status' },
          { id: 'workAuth', label: 'Work Authorization' },
          { id: 'experience', label: 'Experience' },
          { id: 'projects', label: 'Projects' },
          { id: 'skills', label: 'Skills Inventory' },
          { id: 'questions', label: 'Application Questions' },
          { id: 'additional', label: 'Additional Information' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as ProfileSubTab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {/* 1. PERSONAL INFORMATION */}
        {activeSubTab === 'personal' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.personal.fullName}
                  onChange={(e) => updatePersonal({ fullName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Preferred Name</label>
                <input
                  type="text"
                  value={profile.personal.preferredName}
                  onChange={(e) => updatePersonal({ preferredName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={profile.personal.email}
                  onChange={(e) => updatePersonal({ email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={profile.personal.phone}
                  onChange={(e) => updatePersonal({ phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Current City</label>
                <input
                  type="text"
                  value={profile.personal.city}
                  onChange={(e) => updatePersonal({ city: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">State / Province</label>
                <input
                  type="text"
                  value={profile.personal.state}
                  onChange={(e) => updatePersonal({ state: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Country</label>
                <input
                  type="text"
                  value={profile.personal.country}
                  onChange={(e) => updatePersonal({ country: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Postal Code / PIN Code</label>
                <input
                  type="text"
                  value={profile.personal.pincode}
                  onChange={(e) => updatePersonal({ pincode: e.target.value, postalCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={profile.personal.address || ''}
                  onChange={(e) => updatePersonal({ address: e.target.value })}
                  placeholder="Apartment, building, street..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">LinkedIn Profile</label>
                <input
                  type="url"
                  value={profile.personal.linkedin}
                  onChange={(e) => updatePersonal({ linkedin: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Portfolio / Personal Website</label>
                <input
                  type="url"
                  value={profile.personal.portfolio}
                  onChange={(e) => updatePersonal({ portfolio: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">GitHub / Code Profile</label>
                <input
                  type="url"
                  value={profile.personal.github}
                  onChange={(e) => updatePersonal({ github: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Professional Summary / Bio</label>
                <textarea
                  value={profile.personal.summary || ''}
                  onChange={(e) => updatePersonal({ summary: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                  placeholder="Brief summary of your professional background, strengths, and career focus..."
                />
              </div>
            </div>

            {/* SENSITIVE DEMOGRAPHIC INFORMATION */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Confidential Demographic Information (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All fields below are strictly optional. They are never inferred by AI, never inferred from your name, and never used for job matching or ranking. They will only be autofilled into an application when you explicitly approve the field in the review drawer.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Gender</label>
                  <select
                    value={profile.personal.gender || ''}
                    onChange={(e) => updatePersonal({ gender: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
                  >
                    <option value="">Prefer not to say / Unspecified</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {profile.personal.gender === 'Prefer to self-describe' && (
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Self-Description</label>
                    <input
                      type="text"
                      value={profile.personal.genderCustom || ''}
                      onChange={(e) => updatePersonal({ genderCustom: e.target.value })}
                      placeholder="Specify your description..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Age (Optional)</label>
                  <input
                    type="number"
                    min="16"
                    max="100"
                    value={profile.personal.age || ''}
                    onChange={(e) => updatePersonal({ age: e.target.value ? parseInt(e.target.value, 10) : null })}
                    placeholder="e.g. 24"
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    value={profile.personal.dateOfBirth || ''}
                    onChange={(e) => updatePersonal({ dateOfBirth: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. WORK PREFERENCES (INDUSTRY-AGNOSTIC) */}
        {activeSubTab === 'preferences' && (
          <div className="space-y-6 text-xs">
            {/* Target Industries */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800 text-sm">
                  Target Industries <span className="text-sky-600 font-normal text-xs">(Select all that match your career)</span>
                </label>
                <span className="text-slate-400 text-[11px]">Supports all professions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-slate-50">
                {INDUSTRIES.map((ind) => {
                  const selected = profile.jobPreferences.targetIndustries?.includes(ind.name);
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => {
                        const cur = profile.jobPreferences.targetIndustries || [];
                        const next = selected ? cur.filter((x) => x !== ind.name) : [...cur, ind.name];
                        updateJobPrefs({ targetIndustries: next });
                      }}
                      className={`p-2.5 text-left rounded-xl text-xs border transition-all ${
                        selected
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">{ind.name}</div>
                      {ind.suggestedRoles.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ind.suggestedRoles.slice(0, 2).join(', ')}...
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Job Titles */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Target Job Titles / Target Roles (Comma-separated)
              </label>
              <input
                type="text"
                value={(profile.jobPreferences.targetJobTitles || profile.jobPreferences.targetRoles || []).join(', ')}
                onChange={(e) => {
                  const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                  updateJobPrefs({ targetJobTitles: arr, targetRoles: arr });
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                placeholder="e.g. Software Engineer, Pharmacist, Clinical Associate, Financial Analyst, Marketing Manager"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Add any job titles you are actively pursuing across your chosen industries.
              </p>
            </div>

            {/* Employment Types */}
            <div>
              <label className="font-semibold text-slate-700 block mb-2">Preferred Employment Types</label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPE_OPTIONS.map((et) => {
                  const selected = profile.jobPreferences.employmentTypes.includes(et);
                  return (
                    <button
                      key={et}
                      type="button"
                      onClick={() => {
                        const cur = profile.jobPreferences.employmentTypes;
                        const next = selected ? cur.filter((x) => x !== et) : [...cur, et];
                        updateJobPrefs({ employmentTypes: next });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                        selected
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '} {et}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Work Mode & Relocation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-2">Work Arrangement</label>
                <div className="flex gap-2">
                  {WORK_MODE_OPTIONS.map((wm) => {
                    const active = profile.jobPreferences.workModes?.includes(wm) ?? (wm === 'Remote');
                    return (
                      <button
                        key={wm}
                        type="button"
                        onClick={() => {
                          const cur = profile.jobPreferences.workModes || ['Remote'];
                          const next = active ? cur.filter((x) => x !== wm) : [...cur, wm];
                          updateJobPrefs({ workModes: next });
                        }}
                        className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                          active ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-xs' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {wm}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-2">Willing to Relocate?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateJobPrefs({ willingToRelocate: true })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                      profile.jobPreferences.willingToRelocate
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Yes, open to relocation
                  </button>
                  <button
                    type="button"
                    onClick={() => updateJobPrefs({ willingToRelocate: false })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                      !profile.jobPreferences.willingToRelocate
                        ? 'bg-slate-100 border-slate-300 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    No, local / remote only
                  </button>
                </div>
              </div>
            </div>

            {/* Preferred Locations */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Preferred Locations / Target Cities</label>
              <input
                type="text"
                value={profile.jobPreferences.preferredLocations.join(', ')}
                onChange={(e) =>
                  updateJobPrefs({
                    preferredLocations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  })
                }
                placeholder="e.g. London, Berlin, Bangalore, New York, Singapore, Remote"
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            {/* Notice Period & Compensation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notice Period / Availability</label>
                <input
                  type="text"
                  value={profile.jobPreferences.noticePeriod}
                  onChange={(e) => updateJobPrefs({ noticePeriod: e.target.value })}
                  placeholder="e.g. 15 days, 1 month, Immediate"
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Salary Currency Context</label>
                <select
                  value={profile.jobPreferences.salaryCurrency || 'USD'}
                  onChange={(e) => updateJobPrefs({ salaryCurrency: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SGD">SGD ($)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 3. EDUCATION */}
        {activeSubTab === 'education' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Higher Education ({profile.education.length})</h3>
              <button
                type="button"
                onClick={() => {
                  const newEdu = {
                    id: `edu_${Date.now()}`,
                    degree: '',
                    branch: '',
                    university: '',
                    location: '',
                    startDate: '',
                    endDate: null,
                    expectedGraduation: null,
                    cgpa: null,
                    percentage: null,
                    stream: null
                  };
                  setProfile({ ...profile, education: [...profile.education, newEdu] });
                }}
                className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-sky-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Degree
              </button>
            </div>

            <div className="space-y-4">
              {profile.education.map((edu, idx) => (
                <div key={edu.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const next = profile.education.filter((_, i) => i !== idx);
                      setProfile({ ...profile, education: next });
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Degree Title</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], degree: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                        placeholder="e.g. Master of Computer Applications"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Major / Branch / Field</label>
                      <input
                        type="text"
                        value={edu.branch}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], branch: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                        placeholder="e.g. Computer Science / Pharmacy"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">University / Institution</label>
                      <input
                        type="text"
                        value={edu.university}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], university: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Location</label>
                      <input
                        type="text"
                        value={edu.location}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], location: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Start Date</label>
                      <input
                        type="text"
                        value={edu.startDate}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], startDate: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        placeholder="MM/YYYY"
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Graduation Year / End Date</label>
                      <input
                        type="text"
                        value={edu.expectedGraduation || edu.endDate || ''}
                        onChange={(e) => {
                          const next = [...profile.education];
                          next[idx] = { ...next[idx], expectedGraduation: e.target.value, endDate: e.target.value };
                          setProfile({ ...profile, education: next });
                        }}
                        placeholder="YYYY"
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. EMPLOYMENT STATUS & STUDENT PREFERENCES */}
        {activeSubTab === 'employment' && (
          <div className="space-y-6 text-xs">
            <div>
              <label className="font-bold text-slate-800 text-sm block mb-1">Current Employment Status</label>
              <p className="text-slate-500 mb-3">
                Specify your active situation to tailor application responses and interview scheduling.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {EMPLOYMENT_STATUS_OPTIONS.map((status) => {
                  const active = profile.jobPreferences.employmentStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateJobPrefs({ employmentStatus: status })}
                      className={`p-3 text-left rounded-xl border font-medium text-xs transition-all ${
                        active
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {active ? '✓ ' : ''} {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student Enrollment Card */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Student Enrollment Details</div>
                  <div className="text-[11px] text-slate-500">
                    Are you currently enrolled in an educational program?
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = profile.jobPreferences.studentEnrollment || {
                        isCurrentlyEnrolled: true,
                        institution: '',
                        degreeProgram: '',
                        fieldOfStudy: '',
                        currentYearSemester: '',
                        expectedGraduationDate: '',
                        openToStudyCombinedJobs: true
                      };
                      updateJobPrefs({ studentEnrollment: { ...cur, isCurrentlyEnrolled: true } });
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs ${
                      profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateJobPrefs({ studentEnrollment: null });
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs ${
                      !profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Educational Institution</label>
                    <input
                      type="text"
                      value={profile.jobPreferences.studentEnrollment?.institution || ''}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, institution: e.target.value } });
                      }}
                      placeholder="e.g. Jain University"
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Degree / Program</label>
                    <input
                      type="text"
                      value={profile.jobPreferences.studentEnrollment?.degreeProgram || ''}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, degreeProgram: e.target.value } });
                      }}
                      placeholder="e.g. MCA / MBA / MSc"
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Field of Study / Major</label>
                    <input
                      type="text"
                      value={profile.jobPreferences.studentEnrollment?.fieldOfStudy || ''}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, fieldOfStudy: e.target.value } });
                      }}
                      placeholder="e.g. Computer Science"
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Current Year / Semester</label>
                    <input
                      type="text"
                      value={profile.jobPreferences.studentEnrollment?.currentYearSemester || ''}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, currentYearSemester: e.target.value } });
                      }}
                      placeholder="e.g. 2nd Year / 3rd Sem"
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Expected Graduation Date</label>
                    <input
                      type="text"
                      value={profile.jobPreferences.studentEnrollment?.expectedGraduationDate || ''}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, expectedGraduationDate: e.target.value } });
                      }}
                      placeholder="e.g. June 2027"
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Open to jobs combined with studies?</label>
                    <select
                      value={profile.jobPreferences.studentEnrollment?.openToStudyCombinedJobs ? 'yes' : 'no'}
                      onChange={(e) => {
                        const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                        updateJobPrefs({ studentEnrollment: { ...cur, openToStudyCombinedJobs: e.target.value === 'yes' } });
                      }}
                      className="w-full border rounded-lg p-2 bg-white"
                    >
                      <option value="yes">Yes, flexible working alongside coursework</option>
                      <option value="no">No, purely studying</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. WORK AUTHORIZATION (GLOBAL) */}
        {activeSubTab === 'workAuth' && (
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Global Work Rights Architecture</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Work authorization is confidential and user-directed. blackLeave NEVER infers or guesses your authorization from nationality, ethnicity, or location. You maintain 100% control over the status provided to employers.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-800 text-sm block mb-1">Add Country Authorization</label>
              <CountrySelect
                onChange={(country) => {
                  const current = profile.workAuthorization.countries || [];
                  if (!current.some((c) => c.countryCode === country.code)) {
                    setProfile({
                      ...profile,
                      workAuthorization: {
                        ...profile.workAuthorization,
                        countries: [
                          ...current,
                          {
                            countryCode: country.code,
                            countryName: country.name,
                            status: 'AUTHORIZED',
                            visaType: null
                          }
                        ]
                      }
                    });
                  }
                }}
                placeholder="Search and select country to configure authorization..."
              />
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Configured Countries ({profile.workAuthorization.countries?.length || 0})
              </h4>
              {(profile.workAuthorization.countries || []).map((cAuth) => (
                <div key={cAuth.countryCode} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="w-56 font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-base font-mono uppercase bg-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700">
                      {cAuth.countryCode}
                    </span>
                    <span className="text-sm">{cAuth.countryName}</span>
                  </div>

                  <div className="flex-1">
                    <select
                      value={cAuth.status}
                      onChange={(e) => {
                        const updated = (profile.workAuthorization.countries || []).map((c) =>
                          c.countryCode === cAuth.countryCode ? { ...c, status: e.target.value as any } : c
                        );
                        setProfile({
                          ...profile,
                          workAuthorization: { ...profile.workAuthorization, countries: updated }
                        });
                      }}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium text-slate-800"
                    >
                      <option value="AUTHORIZED">Authorized to work without sponsorship</option>
                      <option value="REQUIRES_SPONSORSHIP">Requires employer sponsorship</option>
                      <option value="NOT_AUTHORIZED">Not currently authorized</option>
                      <option value="UNSURE">Unsure</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = (profile.workAuthorization.countries || []).filter((c) => c.countryCode !== cAuth.countryCode);
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, countries: next }
                      });
                    }}
                    className="text-slate-400 hover:text-red-500 self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. EXPERIENCE */}
        {activeSubTab === 'experience' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Professional Experience ({profile.experience.length})</h3>
              <button
                type="button"
                onClick={() => {
                  const newExp = {
                    id: `exp_${Date.now()}`,
                    company: '',
                    title: '',
                    employmentType: 'Full-time',
                    location: '',
                    workMode: 'Remote',
                    startDate: '',
                    endDate: null,
                    current: false,
                    responsibilities: [],
                    technologies: []
                  };
                  setProfile({ ...profile, experience: [...profile.experience, newExp] });
                }}
                className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-sky-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {profile.experience.map((exp, idx) => (
                <div key={exp.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const next = profile.experience.filter((_, i) => i !== idx);
                      setProfile({ ...profile, experience: next });
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const next = [...profile.experience];
                          next[idx] = { ...next[idx], company: e.target.value };
                          setProfile({ ...profile, experience: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Job Title / Role</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => {
                          const next = [...profile.experience];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setProfile({ ...profile, experience: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Location</label>
                      <input
                        type="text"
                        value={exp.location}
                        onChange={(e) => {
                          const next = [...profile.experience];
                          next[idx] = { ...next[idx], location: e.target.value };
                          setProfile({ ...profile, experience: next });
                        }}
                        className="w-full border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Dates</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => {
                            const next = [...profile.experience];
                            next[idx] = { ...next[idx], startDate: e.target.value };
                            setProfile({ ...profile, experience: next });
                          }}
                          placeholder="Start MM/YYYY"
                          className="w-1/2 border rounded-lg p-2 bg-white"
                        />
                        <input
                          type="text"
                          value={exp.endDate || ''}
                          onChange={(e) => {
                            const next = [...profile.experience];
                            next[idx] = { ...next[idx], endDate: e.target.value };
                            setProfile({ ...profile, experience: next });
                          }}
                          placeholder="End or Present"
                          className="w-1/2 border rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. PROJECTS */}
        {activeSubTab === 'projects' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Key Projects ({profile.projects.length})</h3>
              <button
                type="button"
                onClick={() => {
                  const newProj = {
                    id: `proj_${Date.now()}`,
                    title: '',
                    description: '',
                    technologies: []
                  };
                  setProfile({ ...profile, projects: [...profile.projects, newProj] });
                }}
                className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-sky-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            <div className="space-y-4">
              {profile.projects.map((proj, idx) => (
                <div key={proj.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const next = profile.projects.filter((_, i) => i !== idx);
                      setProfile({ ...profile, projects: next });
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Project Title</label>
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => {
                        const next = [...profile.projects];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setProfile({ ...profile, projects: next });
                      }}
                      className="w-full border rounded-lg p-2 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Description & Impact</label>
                    <textarea
                      value={proj.description}
                      onChange={(e) => {
                        const next = [...profile.projects];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setProfile({ ...profile, projects: next });
                      }}
                      rows={2}
                      className="w-full border rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. SKILLS INVENTORY */}
        {activeSubTab === 'skills' && (
          <div className="space-y-6 text-xs">
            <h3 className="font-bold text-slate-800 text-sm">Skills & Competencies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.skills).map(([category, skills]) => (
                <div key={category} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-semibold text-slate-800 capitalize">{category}</div>
                  <input
                    type="text"
                    value={skills.join(', ')}
                    onChange={(e) => {
                      const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setProfile({
                        ...profile,
                        skills: { ...profile.skills, [category]: arr }
                      });
                    }}
                    className="w-full border rounded-lg p-2 bg-white"
                    placeholder="Comma-separated skills..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. APPLICATION QUESTIONS LIBRARY */}
        {activeSubTab === 'questions' && (
          <div className="space-y-6 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-800 text-sm">Standard Application Question Library</h3>
                <span className="text-[11px] text-slate-400">Predefined reusable answers for ATS applications</span>
              </div>
              <p className="text-slate-500">
                Responses saved here are automatically suggested during ATS autofill across Greenhouse, Lever, Workday, and Google Forms.
              </p>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-200">
              {['ALL', 'MOTIVATION', 'CAREER', 'AVAILABILITY', 'EXPERIENCE', 'COMPENSATION', 'LOCATION'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveQuestionCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    activeQuestionCategory === cat
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {QUESTION_LIBRARY.filter((qDef) =>
                activeQuestionCategory === 'ALL' ? true : qDef.category === activeQuestionCategory
              ).map((qDef) => {
                const userQuestion = profile.applicationQuestions?.find((q) => q.question === qDef.question || q.id === qDef.id);
                const currentAnswer = userQuestion?.answer || '';

                return (
                  <div key={qDef.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">{qDef.question}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {qDef.category}
                      </span>
                    </div>

                    <textarea
                      value={currentAnswer}
                      onChange={(e) => {
                        const nextQuestions = [...(profile.applicationQuestions || [])];
                        const idx = nextQuestions.findIndex((q) => q.question === qDef.question || q.id === qDef.id);
                        if (idx >= 0) {
                          nextQuestions[idx] = { ...nextQuestions[idx], answer: e.target.value };
                        } else {
                          nextQuestions.push({
                            id: qDef.id,
                            category: qDef.category,
                            question: qDef.question,
                            answer: e.target.value
                          });
                        }
                        setProfile({ ...profile, applicationQuestions: nextQuestions });
                      }}
                      rows={3}
                      placeholder={qDef.placeholder}
                      className="w-full border rounded-lg p-2.5 bg-white text-xs text-slate-800 leading-relaxed"
                    />

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{currentAnswer.length} characters</span>
                      {currentAnswer.length > 0 && <span className="text-emerald-600 font-semibold">✓ Saved</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 10. ADDITIONAL INFORMATION & COVER LETTERS */}
        {activeSubTab === 'additional' && (
          <div className="space-y-6 text-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Cover Letters & Additional Information</h3>
              <p className="text-slate-500 mb-4">
                Maintain customizable cover letters and generic application remarks.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="font-bold text-slate-800 text-xs block">Default Candidate Cover Letter</label>
              <textarea
                value={profile.coverLetters?.[0]?.content || ''}
                onChange={(e) => {
                  const cur = profile.coverLetters || [];
                  const updatedLetter = {
                    id: cur[0]?.id || `cover_${Date.now()}`,
                    title: 'Default Cover Letter',
                    content: e.target.value,
                    isDefault: true
                  };
                  setProfile({
                    ...profile,
                    coverLetters: [updatedLetter, ...cur.slice(1)]
                  });
                }}
                rows={6}
                placeholder="Dear Hiring Team, I am writing to express my strong enthusiasm for this opportunity..."
                className="w-full border border-slate-300 rounded-lg p-3 bg-white text-xs leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
