import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardPage } from './views/DashboardPage';
import { ProfilePage } from './views/ProfilePage';
import { ResumesPage } from './views/ResumesPage';
import { HistoryPage } from './views/HistoryPage';
import { AISettingsPage } from './views/AISettingsPage';
import { PrivacyPage } from './views/PrivacyPage';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { UserProfile, ApplicationRecord } from '@applyflow/types';
import { LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    user,
    profile,
    completion,
    isAuthenticated,
    isLoading,
    error,
    loginWithGoogle,
    logout,
    saveProfile
  } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  // Automatically prompt onboarding if new user or profile completion is very low
  useEffect(() => {
    if (isAuthenticated && profile && completion && completion.score < 40) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, profile, completion]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplications();
    }
  }, [isAuthenticated]);

  async function fetchApplications() {
    try {
      const res = await fetch('/api/applications', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applications) setApplications(data.applications);
      }
    } catch {
      // Ignored
    }
  }

  const handleSaveProfile = async (updated: UserProfile) => {
    await saveProfile(updated);
  };

  const handleCompleteOnboarding = async (updated: UserProfile) => {
    await saveProfile(updated);
    setShowOnboarding(false);
    setCurrentTab('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user || !profile) {
    return (
      <LandingPage
        onGoogleCredential={async (cred) => {
          const res = await loginWithGoogle(cred);
          if (res.success && res.isNewUser) {
            setShowOnboarding(true);
          }
          return res;
        }}
        errorMessage={error}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userName={user.name || profile.personal.fullName}
        userEmail={user.email || profile.personal.email}
        userImage={user.image}
        onLogout={logout}
      />

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
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Autofill Engine Active</span>
            </div>

            <button
              onClick={() => setShowOnboarding(true)}
              className="text-slate-600 hover:text-sky-600 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Onboarding Flow
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8 flex-1 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              profile={profile}
              applications={applications}
              onNavigate={(tab) => setCurrentTab(tab as TabType)}
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
              onUpdateResumes={async (updatedResumes) => {
                await handleSaveProfile({ ...profile, resumes: updatedResumes });
              }}
              onMergeImportedProfile={async (imported) => {
                await handleSaveProfile({ ...profile, ...imported });
              }}
            />
          )}

          {currentTab === 'history' && (
            <HistoryPage
              applications={applications}
              onUpdateStatus={async (id, newStatus) => {
                await fetch(`/api/applications/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ status: newStatus })
                });
                setApplications((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
                );
              }}
            />
          )}

          {currentTab === 'ai' && (
            <AISettingsPage />
          )}

          {currentTab === 'privacy' && (
            <PrivacyPage
              onDeleteAllData={async () => {
                await fetch('/api/profile', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ confirm: true })
                });
                await logout();
              }}
            />
          )}
        </main>
      </div>

      {/* Onboarding Wizard Modal */}
      {showOnboarding && (
        <OnboardingWizard
          initialProfile={profile}
          onComplete={handleCompleteOnboarding}
          onCancel={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
