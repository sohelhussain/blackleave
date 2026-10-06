import React, { useState } from 'react';
import { Logo, Button } from '@applyflow/ui';
import { ShieldCheck, CheckCircle2, Globe, Sparkles, UserCheck, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGoogleSignIn: () => void;
  onDemoSignIn: () => void;
  isAuthenticating?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoogleSignIn,
  onDemoSignIn,
  isAuthenticating = false
}) => {
  const [showConfigNote, setShowConfigNote] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 px-6 sm:px-12 py-5 flex items-center justify-between backdrop-blur-md bg-slate-950/70 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-inner">
            <Logo variant="white" size={26} />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">blackLeave</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfigNote(!showConfigNote)}
            className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
          >
            OAuth Setup Info
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDemoSignIn}
            disabled={isAuthenticating}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Demo Sign In
          </Button>
          <Button
            size="sm"
            onClick={onGoogleSignIn}
            disabled={isAuthenticating}
            className="bg-white text-slate-900 hover:bg-slate-100 font-semibold"
          >
            Continue with Google
          </Button>
        </div>
      </header>

      {/* Optional OAuth notice modal/alert */}
      {showConfigNote && (
        <div className="bg-sky-950/80 border-b border-sky-800 px-6 py-3 text-xs text-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Google OAuth credentials can be set via <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300">GOOGLE_CLIENT_ID</code> and <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300">GOOGLE_CLIENT_SECRET</code> in <code className="bg-slate-900 px-1.5 py-0.5 rounded text-sky-300">.env</code>. You can also sign in with the Demo Profile anytime.
            </span>
          </div>
          <button onClick={() => setShowConfigNote(false)} className="text-sky-300 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Next-Gen Candidate Profile & Global Application Assistant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl leading-[1.1]">
          Fill job applications once.{' '}
          <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Apply everywhere with full control.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Maintain your verified candidate profile across any profession or industry. Intelligent autofill across Greenhouse, Lever, Workday, Ashby, and Google Forms with 100% human review.
        </p>

        {/* CTA Card */}
        <div className="mt-10 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl max-w-md w-full flex flex-col gap-3.5 backdrop-blur-sm">
          <button
            onClick={onGoogleSignIn}
            disabled={isAuthenticating}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {/* Google G SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isAuthenticating ? 'Signing In...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button
            onClick={onDemoSignIn}
            disabled={isAuthenticating}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700/60 transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Continue as Demo User (Sohel Hussain)</span>
          </button>

          <p className="text-[11px] text-slate-500 mt-1">
            🔒 Zero Auto-Submit Guarantee: blackLeave never submits forms automatically.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Industry-Agnostic</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designed for healthcare, finance, engineering, legal, marketing, education, and all professions. Not just tech jobs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Global Work Authorization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Set country-specific sponsorship and work rights. Explicit and confidential—never inferred or guessed by AI.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Structured Question Library</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized answers for motivation, availability, career goals, and experience. Reusable across every ATS application.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 px-6 text-center text-xs text-slate-500">
        blackLeave © {new Date().getFullYear()} — Intelligent, Privacy-First Candidate Assistant
      </footer>
    </div>
  );
};
