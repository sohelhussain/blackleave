import React from 'react';
import {
  LayoutDashboard,
  User,
  FileText,
  History,
  Bot,
  ShieldCheck,
  CheckCircle2,
  LogOut
} from 'lucide-react';

export type TabType = 'dashboard' | 'profile' | 'resumes' | 'history' | 'ai' | 'privacy';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  userName?: string;
  userEmail?: string;
  userImage?: string | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userName = 'Candidate',
  userEmail = '',
  userImage = null,
  onLogout
}) => {
  const navItems: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'profile', label: 'Candidate Profile', icon: <User className="w-4 h-4" /> },
    { id: 'resumes', label: 'Resumes & Parser', icon: <FileText className="w-4 h-4" /> },
    { id: 'history', label: 'Application History', icon: <History className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Settings', icon: <Bot className="w-4 h-4" /> },
    { id: 'privacy', label: 'Security & Privacy', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'BL';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 p-1 flex items-center justify-center shadow-inner shrink-0">
          <img src="/logo-white.png" alt="blackLeave logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight tracking-tight">blackLeave</h1>
          <p className="text-[11px] text-slate-400">Intelligent Autofill System</p>
        </div>
      </div>

      {/* User Quick Info */}
      <div className="p-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
        {userImage ? (
          <img
            src={userImage}
            alt={userName}
            className="w-9 h-9 rounded-full object-cover border border-emerald-500/30"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="overflow-hidden">
          <div className="text-sm font-semibold text-white truncate flex items-center gap-1">
            {userName}
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
          </div>
          <div className="text-[11px] text-slate-400 truncate">{userEmail}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sign Out Action */}
      {onLogout && (
        <div className="px-3 py-2 border-t border-slate-800/60">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Safety Notice */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Auto-Submit Guarantee</span>
        </div>
        Applications are autofilled upon review. You always submit manually.
      </div>
    </aside>
  );
};
