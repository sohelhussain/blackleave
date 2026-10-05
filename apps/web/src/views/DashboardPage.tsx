import React from 'react';
import { UserProfile, ApplicationRecord } from '@applyflow/types';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface DashboardPageProps {
  profile: UserProfile;
  applications: ApplicationRecord[];
  onNavigate: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  applications,
  onNavigate
}) => {
  const totalAssisted = applications.length;
  const totalFieldsFilled = applications.reduce((sum, a) => sum + (a.fieldsFilled || 0), 0);
  const totalAiAnswers = applications.reduce((sum, a) => sum + (a.aiAnswersCount || 0), 0);
  const completedManually = applications.filter((a) => a.status === 'Applied' || a.status === 'Interview' || a.status === 'Offer').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-500/30 mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Profile Ready
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {profile.personal.firstName}!
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              blackLeave is active and configured to autofill your job applications across Greenhouse, Lever, Workday, and custom ATS portals.
            </p>
          </div>

          <button
            onClick={() => onNavigate('profile')}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-sm shadow transition-all flex items-center gap-2"
          >
            <span>Edit Profile Data</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Applications Assisted</span>
            <Briefcase className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">{totalAssisted}</div>
          <div className="text-xs text-slate-400 mt-1">Sessions scanned on ATS pages</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Fields Autofilled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2">{totalFieldsFilled}</div>
          <div className="text-xs text-slate-400 mt-1">Verified candidate inputs populated</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>AI Answers Generated</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600 mt-2">{totalAiAnswers}</div>
          <div className="text-xs text-slate-400 mt-1">Reviewed and approved by user</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Applications Completed</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 mt-2">{completedManually}</div>
          <div className="text-xs text-slate-400 mt-1">Manually submitted by candidate</div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Highlights */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">Profile Highlights</h3>
            <button
              onClick={() => onNavigate('profile')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
            >
              View Full Profile &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-medium block">TARGET ROLES</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {profile.jobPreferences.targetRoles.map((role) => (
                  <span
                    key={role}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">PREFERRED LOCATIONS</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {profile.jobPreferences.preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">WORK AUTHORIZATION</span>
              <div className="mt-1 text-xs text-slate-700 space-y-1">
                <div>🇮🇳 India: Authorized (No sponsorship)</div>
                <div>🇺🇸 US: Authorized (Requires sponsorship)</div>
                <div>🇪🇺 Europe: Authorized (Requires sponsorship)</div>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">EDUCATION</span>
              <div className="mt-1 text-xs text-slate-700">
                <div className="font-semibold">{profile.education[0]?.degree}</div>
                <div className="text-slate-500">{profile.education[0]?.university} (CGPA: 8.0)</div>
              </div>
            </div>
          </div>

          {/* Key Technologies */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">TECHNICAL STACK</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                ...profile.skills.programming,
                ...profile.skills.frontend,
                ...profile.skills.backend
              ].map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Resumes Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900">Stored Resumes</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                {profile.resumes.length} active
              </span>
            </div>

            <div className="space-y-3">
              {profile.resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-slate-900 leading-tight">
                        {resume.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{resume.fileName}</div>
                    </div>
                  </div>
                  {resume.isDefault && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('resumes')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-2"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage & Upload Resumes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
