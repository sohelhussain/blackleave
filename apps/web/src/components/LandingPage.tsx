import React, { useEffect, useRef, useState } from 'react';
import { Logo } from '@applyflow/ui';
import { Globe, ShieldCheck, AlertCircle } from 'lucide-react';

interface LandingPageProps {
  onGoogleCredential: (credential: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticating?: boolean;
  errorMessage?: string | null;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
        };
      };
    };
  }
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoogleCredential,
  isAuthenticating = false,
  errorMessage = null
}) => {
  const [localError, setLocalError] = useState<string | null>(null);
  const [gsiLoaded, setGsiLoaded] = useState<boolean>(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
      setGsiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiLoaded(true);
    script.onerror = () => {
      console.warn('[LandingPage] Could not load Google Identity Services SDK');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Google Identity Services when script is ready and Client ID is available
  useEffect(() => {
    if (!gsiLoaded || !window.google?.accounts?.id || !clientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          setLocalError(null);
          const res = await onGoogleCredential(response.credential);
          if (!res.success) {
            setLocalError(res.error || 'Google sign-in failed. Please try again.');
          }
        }
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320
        });
      }
    } catch (err: any) {
      console.error('[LandingPage] Google One Tap initialization failed:', err);
    }
  }, [gsiLoaded, clientId, onGoogleCredential]);

  const handleManualGoogleClick = () => {
    setLocalError(null);
    if (!clientId) {
      setLocalError('Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.');
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If prompt could not be displayed, show standard guidance
            console.log('[LandingPage] One Tap prompt dismissed or not displayed');
          }
        });
      } catch {
        setLocalError('Google sign-in failed. Please try again.');
      }
    } else {
      setLocalError('Google Identity Services is still loading. Please try again in a moment.');
    }
  };

  const activeError = localError || errorMessage;

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
            onClick={handleManualGoogleClick}
            disabled={isAuthenticating}
            className="text-xs font-semibold px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <span>Continue with Google</span>
          </button>
        </div>
      </header>

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

        {/* Auth Box */}
        <div className="mt-10 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl max-w-md w-full flex flex-col items-center gap-4 backdrop-blur-sm">
          {activeError && (
            <div className="w-full p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-300 text-xs text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Official Google Button Container */}
          <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]">
            {/* Fallback button if GSI container is rendering */}
            <button
              onClick={handleManualGoogleClick}
              disabled={isAuthenticating}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isAuthenticating ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>
          </div>

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
              Configure country-by-country work authorization across 45+ nations with clear sponsorship declarations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Privacy & Verified Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No fabrication or AI hallucination. Sensitive demographic data is never inferred and 100% human-verified.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
