import React, { useState } from 'react';
import { UserProfile, INDUSTRIES, GENDER_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, WORK_MODE_OPTIONS, calculateProfileCompleteness } from '@applyflow/types';
import { CountrySelect, ProgressBar, Button } from '@applyflow/ui';
import { CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';

interface OnboardingWizardProps {
  initialProfile: UserProfile;
  onComplete: (updated: UserProfile) => Promise<void>;
  onCancel?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  onComplete,
  onCancel
}) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const totalSteps = 8;
  const completeness = calculateProfileCompleteness(profile);

  // Helper updater
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

  async function handleFinish() {
    setSaving(true);
    try {
      await onComplete(profile);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
              Step {step} of {totalSteps}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {step === 1 && 'Basic Information'}
              {step === 2 && 'Work Preferences & Industries'}
              {step === 3 && 'Education & Student Status'}
              {step === 4 && 'Experience'}
              {step === 5 && 'Skills Inventory'}
              {step === 6 && 'Global Work Authorization'}
              {step === 7 && 'Common Application Answers'}
              {step === 8 && 'Review & Complete Profile'}
            </h2>
          </div>

          <div className="w-36">
            <ProgressBar percentage={Math.round((step / totalSteps) * 100)} showPercentage={false} />
            <div className="text-[10px] text-slate-500 text-right mt-1 font-medium">
              Profile: {completeness.score}%
            </div>
          </div>
        </div>

        {/* Step Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.personal.fullName}
                    onChange={(e) => updatePersonal({ fullName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Preferred Name (Optional)</label>
                  <input
                    type="text"
                    value={profile.personal.preferredName}
                    onChange={(e) => updatePersonal({ preferredName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="e.g. Jane"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={profile.personal.email}
                    onChange={(e) => updatePersonal({ email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={profile.personal.phone}
                    onChange={(e) => updatePersonal({ phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Current City</label>
                  <input
                    type="text"
                    value={profile.personal.city}
                    onChange={(e) => updatePersonal({ city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="e.g. London / Bangalore / New York"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Country</label>
                  <input
                    type="text"
                    value={profile.personal.country}
                    onChange={(e) => updatePersonal({ country: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    placeholder="e.g. United Kingdom"
                  />
                </div>
              </div>

              {/* Sensitive fields box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-4">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Confidential Demographic Information (Optional)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Optional. Never inferred by AI, never used for candidate ranking, and only autofilled upon your explicit review.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="font-medium block mb-1">Gender</label>
                    <select
                      value={profile.personal.gender || ''}
                      onChange={(e) => updatePersonal({ gender: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    >
                      <option value="">Select gender option (optional)...</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  {profile.personal.gender === 'Prefer to self-describe' && (
                    <div>
                      <label className="font-medium block mb-1">Self-Description</label>
                      <input
                        type="text"
                        value={profile.personal.genderCustom || ''}
                        onChange={(e) => updatePersonal({ genderCustom: e.target.value })}
                        placeholder="Enter description..."
                        className="w-full px-3 py-2 border rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Work Preferences */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold block mb-1">
                  Target Industries <span className="text-sky-600 font-normal">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                  {INDUSTRIES.map((ind) => {
                    const isSelected = profile.jobPreferences.targetIndustries?.includes(ind.name);
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => {
                          const current = profile.jobPreferences.targetIndustries || [];
                          const next = isSelected
                            ? current.filter((x) => x !== ind.name)
                            : [...current, ind.name];
                          updateJobPrefs({ targetIndustries: next });
                        }}
                        className={`p-2 text-left rounded-lg text-xs border transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {ind.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Target Roles / Job Titles (Comma-separated)</label>
                <input
                  type="text"
                  value={(profile.jobPreferences.targetJobTitles || profile.jobPreferences.targetRoles || []).join(', ')}
                  onChange={(e) => {
                    const titles = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    updateJobPrefs({ targetJobTitles: titles, targetRoles: titles });
                  }}
                  placeholder="e.g. Software Engineer, Product Manager, Pharmacist, Financial Analyst"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1">Employment Types</label>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_TYPE_OPTIONS.slice(0, 5).map((et) => {
                      const active = profile.jobPreferences.employmentTypes.includes(et);
                      return (
                        <button
                          key={et}
                          type="button"
                          onClick={() => {
                            const cur = profile.jobPreferences.employmentTypes;
                            const next = active ? cur.filter((x) => x !== et) : [...cur, et];
                            updateJobPrefs({ employmentTypes: next });
                          }}
                          className={`px-3 py-1 rounded-full text-xs border ${
                            active ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium' : 'bg-white text-slate-600'
                          }`}
                        >
                          {active ? '✓ ' : '+ '} {et}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Work Mode</label>
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
                          className={`px-3 py-1.5 rounded-lg border text-xs flex-1 ${
                            active ? 'bg-sky-50 border-sky-300 text-sky-800 font-semibold' : 'bg-white text-slate-600'
                          }`}
                        >
                          {wm}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Education & Student Status */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Are you currently enrolled as a student?</span>
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
                        updateJobPrefs({
                          employmentStatus: 'Student',
                          studentEnrollment: { ...cur, isCurrentlyEnrolled: true }
                        });
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        profile.jobPreferences.employmentStatus === 'Student' || profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateJobPrefs({
                          employmentStatus: 'Employed full-time',
                          studentEnrollment: null
                        });
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        profile.jobPreferences.employmentStatus !== 'Student' && !profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {(profile.jobPreferences.employmentStatus === 'Student' || profile.jobPreferences.studentEnrollment?.isCurrentlyEnrolled) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="font-medium block mb-1">Institution / University</label>
                      <input
                        type="text"
                        value={profile.jobPreferences.studentEnrollment?.institution || ''}
                        onChange={(e) => {
                          const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                          updateJobPrefs({ studentEnrollment: { ...cur, institution: e.target.value } });
                        }}
                        placeholder="e.g. Jain University"
                        className="w-full px-3 py-1.5 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium block mb-1">Degree / Program</label>
                      <input
                        type="text"
                        value={profile.jobPreferences.studentEnrollment?.degreeProgram || ''}
                        onChange={(e) => {
                          const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                          updateJobPrefs({ studentEnrollment: { ...cur, degreeProgram: e.target.value } });
                        }}
                        placeholder="e.g. Master of Computer Applications"
                        className="w-full px-3 py-1.5 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium block mb-1">Expected Graduation Date</label>
                      <input
                        type="text"
                        value={profile.jobPreferences.studentEnrollment?.expectedGraduationDate || ''}
                        onChange={(e) => {
                          const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                          updateJobPrefs({ studentEnrollment: { ...cur, expectedGraduationDate: e.target.value } });
                        }}
                        placeholder="e.g. 2027"
                        className="w-full px-3 py-1.5 border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium block mb-1">Open to jobs combined with studies?</label>
                      <select
                        value={profile.jobPreferences.studentEnrollment?.openToStudyCombinedJobs ? 'yes' : 'no'}
                        onChange={(e) => {
                          const cur = profile.jobPreferences.studentEnrollment || ({} as any);
                          updateJobPrefs({ studentEnrollment: { ...cur, openToStudyCombinedJobs: e.target.value === 'yes' } });
                        }}
                        className="w-full px-3 py-1.5 border rounded text-xs bg-white"
                      >
                        <option value="yes">Yes, flexible working alongside studies</option>
                        <option value="no">No, full-time study focus</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-2">Education Entries ({profile.education.length})</label>
                <div className="space-y-2">
                  {profile.education.map((edu, idx) => (
                    <div key={edu.id || idx} className="p-3 bg-white border rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{edu.degree}</div>
                        <div className="text-[11px] text-slate-500">{edu.university} • {edu.branch}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{edu.startDate} - {edu.endDate || 'Present'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Experience */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Experience History ({profile.experience.length})</span>
                <span className="text-[11px] text-slate-400">Can be skipped for students / entry-level</span>
              </div>
              {profile.experience.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed rounded-xl text-slate-400">
                  No experience records added yet. You can add roles or proceed to next step.
                </div>
              ) : (
                profile.experience.map((exp, idx) => (
                  <div key={exp.id || idx} className="p-3 bg-white border rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{exp.title} at {exp.company}</div>
                      <div className="text-[11px] text-slate-500">{exp.location} • {exp.workMode}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{exp.startDate} - {exp.endDate || 'Present'}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* STEP 5: Skills */}
          {step === 5 && (
            <div className="space-y-4">
              <label className="font-semibold block">Highlighted Skills</label>
              <div className="p-3 border rounded-xl bg-slate-50 flex flex-wrap gap-1.5">
                {[
                  ...profile.skills.programming,
                  ...profile.skills.frontend,
                  ...profile.skills.backend,
                  ...profile.skills.database,
                  ...profile.skills.other
                ].map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 font-medium rounded-md text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Global Work Authorization */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Global Work Rights: Add countries you are interested in working in. Never guessed by AI.
                </span>
              </div>

              <div>
                <label className="font-semibold block mb-1">Add Country Authorization</label>
                <CountrySelect
                  onChange={(country) => {
                    const current = profile.workAuthorization.countries || [];
                    if (!current.some((c) => c.countryCode === country.code)) {
                      setProfile((prev) => ({
                        ...prev,
                        workAuthorization: {
                          ...prev.workAuthorization,
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
                      }));
                    }
                  }}
                  placeholder="Search and add country..."
                />
              </div>

              <div className="space-y-2 mt-3">
                {(profile.workAuthorization.countries || []).map((cAuth, idx) => (
                  <div key={cAuth.countryCode} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <span className="font-semibold text-slate-800 w-44">{cAuth.countryName}</span>
                    <select
                      value={cAuth.status}
                      onChange={(e) => {
                        const updated = (profile.workAuthorization.countries || []).map((item) =>
                          item.countryCode === cAuth.countryCode
                            ? { ...item, status: e.target.value as any }
                            : item
                        );
                        setProfile((prev) => ({
                          ...prev,
                          workAuthorization: { ...prev.workAuthorization, countries: updated }
                        }));
                      }}
                      className="px-2 py-1.5 border rounded-lg text-xs bg-white font-medium text-slate-700 flex-1"
                    >
                      <option value="AUTHORIZED">Authorized to work without sponsorship</option>
                      <option value="REQUIRES_SPONSORSHIP">Requires employer sponsorship</option>
                      <option value="NOT_AUTHORIZED">Not currently authorized</option>
                      <option value="UNSURE">Unsure</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = (profile.workAuthorization.countries || []).filter((x) => x.countryCode !== cAuth.countryCode);
                        setProfile((prev) => ({
                          ...prev,
                          workAuthorization: { ...prev.workAuthorization, countries: filtered }
                        }));
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Application Questions */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-slate-600">
                Pre-populate answers for common application questions. These answers are automatically suggested during ATS autofill.
              </p>
              <div className="space-y-3">
                {(profile.applicationQuestions || []).slice(0, 3).map((q, idx) => (
                  <div key={q.id || idx} className="p-3 bg-slate-50 border rounded-xl space-y-1.5">
                    <div className="font-semibold text-slate-800">{q.question}</div>
                    <textarea
                      value={q.answer}
                      onChange={(e) => {
                        const next = [...(profile.applicationQuestions || [])];
                        next[idx] = { ...next[idx], answer: e.target.value };
                        setProfile((prev) => ({ ...prev, applicationQuestions: next }));
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 8: Review & Complete */}
          {step === 8 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Your Profile is Ready!</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Profile completeness is at <strong>{completeness.score}%</strong>. You can fine-tune answers and settings at any time inside the candidate dashboard.
              </p>
              <div className="w-64 mx-auto pt-2">
                <ProgressBar percentage={completeness.score} />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            ) : onCancel ? (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {step < totalSteps && (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                Skip Step
              </button>
            )}

            {step < totalSteps ? (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1 font-semibold"
              >
                Save & Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinish}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
              >
                {saving ? 'Completing...' : 'Finish & Open Dashboard'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
