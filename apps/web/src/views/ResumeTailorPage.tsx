import React, { useState, useEffect } from 'react';
import { UserProfile, ResumeRecord, JobMatchAnalysis, TailoredResumeDraft } from '@applyflow/types';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Save,
  Check,
  Briefcase,
  Layers,
  GraduationCap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface ResumeTailorPageProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  initialJobTitle?: string;
  initialCompany?: string;
}

const SAMPLE_JDS = [
  {
    name: 'Backend Engineer (Stripe/Go/React)',
    title: 'Senior Backend Engineer',
    company: 'Stripe',
    text: `About Stripe:
Stripe builds economic infrastructure for the internet.

Requirements:
- Strong experience with modern backend systems (Node.js, TypeScript, Go, or Python).
- Proficiency with relational databases such as PostgreSQL or MySQL.
- Familiarity with containerization and orchestration (Docker, Kubernetes).
- Experience building and consuming RESTful and GraphQL APIs.
- Understanding of distributed systems, concurrency, and microservice architectures.

Nice to have:
- Experience with React or Next.js for full-stack collaboration.
- Hands-on knowledge of Redis and caching strategies.
- Prior work with payment processing, PCI-DSS, or security compliance.
- B.Tech/B.E. or MCA in Computer Science or equivalent technical field.`
  },
  {
    name: 'Frontend Developer (React/TypeScript)',
    title: 'Frontend Developer',
    company: 'Vercel',
    text: `Role: Frontend Developer
Location: Remote

Responsibilities:
- Build blazing fast, accessible user interfaces using React, Next.js, and TypeScript.
- Work closely with design teams to craft responsive components using Tailwind CSS.
- Optimize web performance, Core Web Vitals, and client-side rendering.

Qualifications:
- 2+ years experience building production React applications with TypeScript.
- Deep understanding of modern JavaScript (ES6+), DOM APIs, and state management.
- Experience writing integration and unit tests.
- Bachelor's or Master's degree in Computer Science or demonstrated equivalent experience.`
  }
];

export const ResumeTailorPage: React.FC<ResumeTailorPageProps> = ({
  profile,
  onSaveProfile,
  initialJobTitle = '',
  initialCompany = ''
}) => {
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [companyName, setCompanyName] = useState(initialCompany);
  const [jobText, setJobText] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    profile.resumes.find((r) => r.isDefault)?.id || profile.resumes[0]?.id || ''
  );

  // Match analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);

  // Resume tailoring state
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailoredDraft, setTailoredDraft] = useState<TailoredResumeDraft | null>(null);
  const [comparisonTab, setComparisonTab] = useState<'tailored' | 'comparison'>('tailored');

  // Save state
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check URL query parameters for prefilled job details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get('role');
      const urlCompany = params.get('company');
      const urlJd = params.get('jd');
      if (urlRole) setJobTitle(urlRole);
      if (urlCompany) setCompanyName(urlCompany);
      if (urlJd) setJobText(urlJd);
    }
  }, []);

  async function handleAnalyzeMatch() {
    if (!jobText.trim()) {
      setAnalysisError('Please paste a job description first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/tailor/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobText,
          jobTitle: jobTitle || undefined,
          companyName: companyName || undefined,
          profileContext: profile
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Match analysis failed (${res.status})`);
      }

      const data = await res.json();
      setMatchAnalysis(data.analysis);
      if (!jobTitle && data.analysis.jobTitle) setJobTitle(data.analysis.jobTitle);
      if (!companyName && data.analysis.company) setCompanyName(data.analysis.company);
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to analyze job match.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerateTailoredResume() {
    if (!jobText.trim()) {
      setTailorError('Please paste a job description first.');
      return;
    }

    setIsTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch('/api/tailor/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobText,
          jobTitle: jobTitle || undefined,
          companyName: companyName || undefined,
          baseResumeId: selectedResumeId || undefined,
          profileContext: profile
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Tailoring failed (${res.status})`);
      }

      const data = await res.json();
      setTailoredDraft(data.draft);
      setSaveName(`${data.draft.targetJobTitle} Tailored (${data.draft.targetCompany || 'Job'})`);
    } catch (err: any) {
      setTailorError(err.message || 'Failed to generate tailored resume.');
    } finally {
      setIsTailoring(false);
    }
  }

  async function handleSaveTailoredResume() {
    if (!tailoredDraft) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/tailor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: saveName || `${tailoredDraft.targetJobTitle} Tailored Resume`,
          targetRoles: [tailoredDraft.targetJobTitle],
          relevantSkills: tailoredDraft.highlightedSkills,
          tailoredDraft,
          isDefault: false
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Save failed (${res.status})`);
      }

      const data = await res.json();
      if (data.resume) {
        await onSaveProfile({
          ...profile,
          resumes: [...profile.resumes, data.resume]
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Error saving tailored resume: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCopyMarkdown() {
    if (!tailoredDraft) return;
    const md = `# ${profile.personal?.fullName}
**${tailoredDraft.headline}**
${profile.personal?.email} | ${profile.personal?.phone} | ${profile.personal?.city}, ${profile.personal?.country}
${profile.personal?.linkedin ? `LinkedIn: ${profile.personal.linkedin} | ` : ''}${profile.personal?.github ? `GitHub: ${profile.personal.github}` : ''}

## Professional Summary
${tailoredDraft.professionalSummary}

## Core Competencies
${tailoredDraft.highlightedSkills.join(' • ')}

## Professional Experience
${tailoredDraft.experience
  .map(
    (exp) => `### ${exp.title} — ${exp.company}
*${exp.location} | ${exp.startDate} – ${exp.endDate || 'Present'}*
${exp.bullets.map((b) => `- ${b.tailored}`).join('\n')}`
  )
  .join('\n\n')}

## Technical Projects
${tailoredDraft.projects
  .map(
    (p) => `### ${p.title}
*Technologies: ${p.technologies.join(', ')}*
${p.bullets.map((b) => `- ${b.tailored}`).join('\n')}`
  )
  .join('\n\n')}

## Education
${tailoredDraft.education
  .map((edu) => `- **${edu.degree}**, ${edu.institution} (${edu.location}) ${edu.score ? `— ${edu.score}` : ''}`)
  .join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function loadSample(sample: typeof SAMPLE_JDS[0]) {
    setJobTitle(sample.title);
    setCompanyName(sample.company);
    setJobText(sample.text);
    setMatchAnalysis(null);
    setTailoredDraft(null);
  }

  const scoreBadgeColor =
    (matchAnalysis?.overallScore || 0) >= 75
      ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
      : (matchAnalysis?.overallScore || 0) >= 50
      ? 'text-amber-700 bg-amber-50 border-amber-300'
      : 'text-slate-700 bg-slate-100 border-slate-300';

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">AI Resume Tailoring & Match Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
              Zero Hallucination
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl">
            Analyze compatibility between target job descriptions and your verified candidate profile. Generate an ATS-aligned, truthful resume draft without fabricating unverified claims.
          </p>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Test:</span>
          {SAMPLE_JDS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => loadSample(sample)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200"
            >
              {sample.company}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left = JD Input & Base Selection, Right = Match Scoring & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Job Description Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-600" />
              1. Job Description & Target
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Backend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stripe, Google"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Paste Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={9}
                placeholder="Paste the full job requirements, responsibilities, and qualifications..."
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Base Resume Source</label>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-500"
              >
                {profile.resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isDefault ? '(Default)' : ''} — {r.targetRoles.join(', ')}
                  </option>
                ))}
              </select>
            </div>

            {analysisError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeMatch}
              disabled={isAnalyzing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Match Compatibility...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Analyze Compatibility Score</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Match Analysis & Scoring Card */}
        <div className="lg:col-span-7 space-y-4">
          {matchAnalysis ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
              {/* Header Score Overview */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {matchAnalysis.jobTitle} @ {matchAnalysis.company}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">{matchAnalysis.summary}</p>
                </div>

                <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 shrink-0 ${scoreBadgeColor}`}>
                  <div className="text-3xl font-extrabold tracking-tight">{matchAnalysis.overallScore}%</div>
                  <div className="text-[11px] font-semibold leading-tight">
                    Compatibility
                    <br />
                    Score
                  </div>
                </div>
              </div>

              {/* Scoring Formula Banner */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500">{matchAnalysis.scoringFormula}</span>
                <span className="text-emerald-700 font-semibold text-[10px] uppercase">Transparent Calculation</span>
              </div>

              {/* Weighted Breakdown Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Weighted Score Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {matchAnalysis.scoreBreakdown.map((cat) => (
                    <div key={cat.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">{cat.label}</span>
                        <span className="font-mono font-bold text-slate-900">{cat.score}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, cat.score)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 truncate" title={cat.explanation}>
                        {cat.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched vs Missing Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Matching Skills ({matchAnalysis.matchingSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {matchAnalysis.matchingSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] rounded-md font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-rose-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Missing / Unverified Skills ({matchAnalysis.missingSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {matchAnalysis.missingSkills.length > 0 ? (
                      matchAnalysis.missingSkills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] rounded-md font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No missing core skills detected!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button to Tailor */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateTailoredResume}
                  disabled={isTailoring}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-2 transition-all"
                >
                  {isTailoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Tailored Draft...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Tailor Resume for this Role</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Empty State for Match Analysis */
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Job Description Analyzed Yet</h3>
              <p className="text-slate-500 text-xs max-w-sm mt-1">
                Paste a target job posting on the left and click "Analyze Compatibility Score" to see matched skills, qualification breakdown, and missing requirements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tailor Error Alert */}
      {tailorError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{tailorError}</span>
        </div>
      )}

      {/* Tailored Resume Draft Section */}
      {tailoredDraft && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Tailored Resume Draft</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                  {tailoredDraft.matchScore}% Match
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Targeting <strong className="text-slate-800">{tailoredDraft.targetJobTitle}</strong> at{' '}
                <strong className="text-slate-800">{tailoredDraft.targetCompany}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setComparisonTab('tailored')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    comparisonTab === 'tailored' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tailored View
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonTab('comparison')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    comparisonTab === 'comparison' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Diff Comparison
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
              </button>
            </div>
          </div>

          {/* Anti-Hallucination Assurance Banner */}
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Truthful AI Guarantee: </span>
              All tailored bullet points originate exclusively from your verified profile experience and projects. No employers, degrees, dates, or false metrics were invented.
              {tailoredDraft.unverifiedWarning && (
                <div className="mt-1 text-amber-800 font-medium">{tailoredDraft.unverifiedWarning}</div>
              )}
            </div>
          </div>

          {/* Changes Summary Card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              What changed and why:
            </h4>
            <ul className="space-y-1">
              {tailoredDraft.changesSummary.map((c, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tailored Content View or Diff Comparison */}
          {comparisonTab === 'tailored' ? (
            <div className="space-y-5">
              {/* Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Targeted Headline</label>
                <input
                  type="text"
                  value={tailoredDraft.headline}
                  onChange={(e) => setTailoredDraft({ ...tailoredDraft, headline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Professional Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tailored Professional Summary</label>
                <textarea
                  rows={3}
                  value={tailoredDraft.professionalSummary}
                  onChange={(e) => setTailoredDraft({ ...tailoredDraft, professionalSummary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Highlighted Skills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Highlighted Core Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {tailoredDraft.highlightedSkills.map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 text-xs rounded-lg font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tailored Experience */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tailored Professional Experience
                </h4>
                {tailoredDraft.experience.map((exp, expIdx) => (
                  <div key={exp.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">
                        {exp.title} — {exp.company}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {exp.startDate} – {exp.endDate || 'Present'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {exp.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="space-y-1">
                          <input
                            type="text"
                            value={bullet.tailored}
                            onChange={(e) => {
                              const updatedExp = [...tailoredDraft.experience];
                              updatedExp[expIdx].bullets[bIdx].tailored = e.target.value;
                              setTailoredDraft({ ...tailoredDraft, experience: updatedExp });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500"
                          />
                          <div className="text-[10px] text-slate-400 italic px-1">
                            Rationale: {bullet.rationale}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tailored Projects */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tailored Technical Projects
                </h4>
                {tailoredDraft.projects.map((proj, pIdx) => (
                  <div key={proj.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">{proj.title}</span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {proj.technologies.slice(0, 4).join(', ')}
                      </span>
                    </div>

                    {proj.bullets.map((bullet, bIdx) => (
                      <input
                        key={bIdx}
                        type="text"
                        value={bullet.tailored}
                        onChange={(e) => {
                          const updatedProjects = [...tailoredDraft.projects];
                          updatedProjects[pIdx].bullets[bIdx].tailored = e.target.value;
                          setTailoredDraft({ ...tailoredDraft, projects: updatedProjects });
                        }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-2 focus:ring-sky-500"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Diff Comparison View */
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Original vs Tailored Bullet Points
              </h4>
              {tailoredDraft.experience.flatMap((exp) =>
                exp.bullets.map((b, idx) => (
                  <div key={`${exp.id}_${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Original ({exp.company})
                      </span>
                      <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-200 text-xs">
                        {b.original}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                        Tailored for ATS & Keywords
                      </span>
                      <p className="text-slate-900 font-medium bg-sky-50/50 p-2.5 rounded border border-sky-200 text-xs">
                        {b.tailored}
                      </p>
                      <span className="text-[10px] text-slate-500 italic block">Why: {b.rationale}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Save Tailored Resume Version Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Save Version Name:</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Backend Engineer Tailored"
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-full sm:w-64 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {saveSuccess && (
                <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved as new resume version!
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveTailoredResume}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-2 transition-all"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save as New Version</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
