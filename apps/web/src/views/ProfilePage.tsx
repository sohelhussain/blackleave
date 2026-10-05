import React, { useState } from 'react';
import { UserProfile } from '@applyflow/types';
import { Save, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile: initialProfile, onSaveProfile }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeSubTab, setActiveSubTab] = useState<
    'personal' | 'preferences' | 'education' | 'workAuth' | 'experience' | 'projects' | 'skills'
  >('personal');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header and Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Candidate Profile</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Store your verified profile data once. All fields are fully editable and used by the extension autofill engine.
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
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'personal', label: 'Personal Information' },
          { id: 'preferences', label: 'Job Preferences' },
          { id: 'education', label: 'Education & School' },
          { id: 'workAuth', label: 'Work Authorization' },
          { id: 'experience', label: 'Experience' },
          { id: 'projects', label: 'Projects' },
          { id: 'skills', label: 'Skills Inventory' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
        {/* PERSONAL INFO */}
        {activeSubTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Full Legal Name</label>
              <input
                type="text"
                value={profile.personal.fullName}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, fullName: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Preferred Name</label>
              <input
                type="text"
                value={profile.personal.preferredName}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, preferredName: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={profile.personal.email}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, email: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={profile.personal.phone}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, phone: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Current City</label>
              <input
                type="text"
                value={profile.personal.city}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, city: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">State</label>
              <input
                type="text"
                value={profile.personal.state}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, state: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Country</label>
              <input
                type="text"
                value={profile.personal.country}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, country: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pincode / Postal Code</label>
              <input
                type="text"
                value={profile.personal.pincode}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, pincode: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">LinkedIn Profile</label>
              <input
                type="url"
                value={profile.personal.linkedin}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, linkedin: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">GitHub Profile</label>
              <input
                type="url"
                value={profile.personal.github}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, github: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Portfolio Website</label>
              <input
                type="url"
                value={profile.personal.portfolio}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    personal: { ...profile.personal, portfolio: e.target.value }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>
          </div>
        )}

        {/* JOB PREFERENCES */}
        {activeSubTab === 'preferences' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Target Roles (comma-separated)
              </label>
              <input
                type="text"
                value={profile.jobPreferences.targetRoles.join(', ')}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    jobPreferences: {
                      ...profile.jobPreferences,
                      targetRoles: e.target.value.split(',').map((s) => s.trim())
                    }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Preferred Locations (comma-separated)
              </label>
              <input
                type="text"
                value={profile.jobPreferences.preferredLocations.join(', ')}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    jobPreferences: {
                      ...profile.jobPreferences,
                      preferredLocations: e.target.value.split(',').map((s) => s.trim())
                    }
                  })
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notice Period</label>
                <input
                  type="text"
                  value={profile.jobPreferences.noticePeriod}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      jobPreferences: { ...profile.jobPreferences, noticePeriod: e.target.value }
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="relocate"
                  checked={profile.jobPreferences.willingToRelocate}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      jobPreferences: { ...profile.jobPreferences, willingToRelocate: e.target.checked }
                    })
                  }
                  className="rounded text-sky-600 w-4 h-4"
                />
                <label htmlFor="relocate" className="font-medium text-slate-700 cursor-pointer">
                  Willing to Relocate
                </label>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="remote"
                  checked={profile.jobPreferences.willingToWorkRemotely}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      jobPreferences: {
                        ...profile.jobPreferences,
                        willingToWorkRemotely: e.target.checked
                      }
                    })
                  }
                  className="rounded text-sky-600 w-4 h-4"
                />
                <label htmlFor="remote" className="font-medium text-slate-700 cursor-pointer">
                  Willing to Work Remotely
                </label>
              </div>
            </div>
          </div>
        )}

        {/* WORK AUTHORIZATION */}
        {activeSubTab === 'workAuth' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
              <strong>Rule 9 Policy:</strong> Work authorization fields are explicitly user-controlled. Gemini will never guess or infer your authorization status.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">India</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inAuth"
                    checked={profile.workAuthorization.indiaAuthorized}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, indiaAuthorized: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="inAuth" className="text-slate-700">Authorized to work in India</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inSpon"
                    checked={profile.workAuthorization.indiaSponsorshipRequired}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, indiaSponsorshipRequired: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="inSpon" className="text-slate-700">Require sponsorship in India</label>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">United States</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usAuth"
                    checked={profile.workAuthorization.usAuthorized}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, usAuthorized: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="usAuth" className="text-slate-700">Authorized to work in US</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usSpon"
                    checked={profile.workAuthorization.usSponsorshipRequired}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, usSponsorshipRequired: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="usSpon" className="text-slate-700">Require US sponsorship</label>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2 md:col-span-2">
                <h4 className="font-bold text-slate-900 text-sm">Europe / Germany</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="euAuth"
                    checked={profile.workAuthorization.europeAuthorized}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, europeAuthorized: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="euAuth" className="text-slate-700">Authorized to work in Europe / Germany</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="euSpon"
                    checked={profile.workAuthorization.europeSponsorshipRequired}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        workAuthorization: { ...profile.workAuthorization, europeSponsorshipRequired: e.target.checked }
                      })
                    }
                  />
                  <label htmlFor="euSpon" className="text-slate-700">Require sponsorship in Europe / Germany</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDUCATION & SCHOOL */}
        {activeSubTab === 'education' && (
          <div className="space-y-5 text-xs">
            {profile.education.map((edu, idx) => (
              <div key={edu.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="font-bold text-slate-900 text-sm">Education Record #{idx + 1}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Degree</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].degree = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Branch / Major</label>
                    <input
                      type="text"
                      value={edu.branch}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].branch = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">University</label>
                    <input
                      type="text"
                      value={edu.university}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].university = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Location</label>
                    <input
                      type="text"
                      value={edu.location}
                      onChange={(e) => {
                        const updated = [...profile.education];
                        updated[idx].location = e.target.value;
                        setProfile({ ...profile, education: updated });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* School */}
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
              <div className="font-bold text-slate-900 text-sm">School Education</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">10th Percentage</label>
                  <input
                    type="text"
                    value={profile.school.tenthPercentage}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        school: { ...profile.school, tenthPercentage: e.target.value }
                      })
                    }
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">12th Percentage</label>
                  <input
                    type="text"
                    value={profile.school.twelfthPercentage}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        school: { ...profile.school, twelfthPercentage: e.target.value }
                      })
                    }
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">12th Stream</label>
                  <input
                    type="text"
                    value={profile.school.twelfthStream}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        school: { ...profile.school, twelfthStream: e.target.value }
                      })
                    }
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPERIENCE */}
        {activeSubTab === 'experience' && (
          <div className="space-y-4 text-xs">
            {profile.experience.map((exp, idx) => (
              <div key={exp.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{exp.company} - {exp.title}</span>
                  <span className="text-slate-500">{exp.startDate} - {exp.endDate || 'Present'} ({exp.workMode})</span>
                </div>
                <div className="text-slate-600">
                  <strong>Responsibilities:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {exp.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="text-slate-600">
                  <strong>Technologies:</strong> {exp.technologies.join(', ') || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROJECTS */}
        {activeSubTab === 'projects' && (
          <div className="space-y-4 text-xs">
            {profile.projects.map((proj) => (
              <div key={proj.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">{proj.title}</div>
                <p className="text-slate-700">{proj.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {proj.technologies.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SKILLS */}
        {activeSubTab === 'skills' && (
          <div className="space-y-4 text-xs">
            {Object.entries(profile.skills).map(([category, skillList]) => (
              <div key={category} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <span className="font-bold text-slate-900 uppercase text-[11px] block mb-1.5">
                  {category}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(skillList as string[]).map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-800 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
