import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardPage } from './views/DashboardPage';
import { ProfilePage } from './views/ProfilePage';
import { ResumesPage } from './views/ResumesPage';
import { HistoryPage } from './views/HistoryPage';
import { AISettingsPage } from './views/AISettingsPage';
import { PrivacyPage } from './views/PrivacyPage';
import { INITIAL_SOHEL_PROFILE, UserProfile, ApplicationRecord, ResumeRecord } from '@applyflow/types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(INITIAL_SOHEL_PROFILE);
  const [applications, setApplications] = useState<ApplicationRecord[]>([
    {
      id: 'app_01',
      company: 'Greenhouse Mock Tech',
      role: 'Software Engineer Intern',
      url: 'http://localhost:5173/test-pages/greenhouse-mock.html',
      date: '2025-06-10',
      resumeUsed: 'General Software Engineer Resume',
      fieldsFilled: 14,
      aiAnswersCount: 2,
      status: 'Applied',
      notes: 'Autofilled with verified education and projects. Answered behavioral with Saurce.'
    },
    {
      id: 'app_02',
      company: 'Lever Systems',
      role: 'Backend Engineer',
      url: 'http://localhost:5173/test-pages/lever-mock.html',
      date: '2025-06-12',
      resumeUsed: 'Backend Resume',
      fieldsFilled: 19,
      aiAnswersCount: 3,
      status: 'Interview',
      notes: 'Screening round on DPI Engine SNI extraction project.'
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchApplications();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) setProfile(data.profile);
      }
    } catch {
      // Fallback to initial Sohel profile if API server offline
      setProfile(INITIAL_SOHEL_PROFILE);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApplications() {
    try {
      const res = await fetch('/api/applications');
      if (res.ok) {
        const data = await res.json();
        if (data.applications) setApplications(data.applications);
      }
    } catch {
      // Local fallback
    }
  }

  async function handleSaveProfile(updated: UserProfile) {
    setProfile(updated);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.warn('Could not save to API server:', err);
    }
  }

  async function handleUpdateResumes(resumes: ResumeRecord[]) {
    const updated = { ...profile, resumes };
    await handleSaveProfile(updated);
  }

  async function handleUpdateStatus(id: string, newStatus: ApplicationRecord['status']) {
    const updated = applications.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
    setApplications(updated);
    try {
      await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch {
      // Fallback
    }
  }

  async function handleDeleteAllData() {
    try {
      await fetch('/api/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });
    } catch {
      // Offline fallback
    }
    setProfile({
      ...INITIAL_SOHEL_PROFILE,
      personal: { ...INITIAL_SOHEL_PROFILE.personal, fullName: '', email: '', phone: '' },
      experience: [],
      projects: [],
      education: []
    });
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Section</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-800 capitalize">
              {currentTab === 'ai' ? 'AI Settings' : currentTab}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Autofill Engine Active</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 flex-1 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              profile={profile}
              applications={applications}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'profile' && (
            <ProfilePage
              profile={profile}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {currentTab === 'resumes' && (
            <ResumesPage
              profile={profile}
              onUpdateResumes={handleUpdateResumes}
            />
          )}

          {currentTab === 'history' && (
            <HistoryPage
              applications={applications}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {currentTab === 'ai' && <AISettingsPage />}

          {currentTab === 'privacy' && (
            <PrivacyPage onDeleteAllData={handleDeleteAllData} />
          )}
        </main>
      </div>
    </div>
  );
};
