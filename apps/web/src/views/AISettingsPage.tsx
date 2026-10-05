import React, { useState } from 'react';
import { Bot, ShieldCheck, CheckCircle2, Lock, Sliders, ExternalLink } from 'lucide-react';

export const AISettingsPage: React.FC = () => {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [conciseness, setConciseness] = useState('concise');
  const [temperature, setTemperature] = useState(0.2);

  const rules = [
    'NEVER invent information.',
    'NEVER fabricate work experience.',
    'NEVER fabricate education.',
    'NEVER fabricate company names.',
    'NEVER fabricate dates.',
    'NEVER fabricate technical skills.',
    'NEVER invent salary information.',
    'NEVER infer demographic information.',
    'NEVER infer work authorization (use exact stored values).',
    'NEVER claim the user has done something that is not in the profile.',
    'If information is missing, return "INSUFFICIENT_INFORMATION".',
    'Keep answers truthful.',
    'Match the requested character/word limit.',
    'Prefer concise answers for application forms.',
    'Use the user\'s actual experience when answering behavioral questions.',
    'Select the most relevant project for the question.',
    'Do not mention that AI generated the answer.',
    'Do not use exaggerated corporate language.',
    'Do not use em dashes.',
    'Write naturally, like a real candidate.'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-sky-600 mb-1">
          <Bot className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Service Configuration</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Gemini AI Service & Rules Engine</h2>
        <p className="text-slate-500 text-xs mt-0.5 max-w-2xl">
          blackLeave uses Google Gemini to answer open-ended or ambiguous questions. Your Gemini API key is stored strictly on the backend server and is never exposed in extension source code.
        </p>
      </div>

      {/* Security Guarantee Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-emerald-950 text-sm">Strict Security Architecture</h3>
          <p className="text-xs text-emerald-800 leading-relaxed">
            The Chrome extension communicates exclusively with your local backend API. The API server holds the Gemini credentials in <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">.env</code>. Only the minimal required profile context is transmitted, preventing unnecessary data exposure.
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-600" />
          <span>Generation Parameters</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Active AI Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
            >
              <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Default - Fast & High Accuracy)</option>
              <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Writing Style</label>
            <select
              value={conciseness}
              onChange={(e) => setConciseness(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
            >
              <option value="concise">Concise & Direct (Recommended for application forms)</option>
              <option value="detailed">Detailed & Impact-Oriented</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 block mb-1">
              Factual Temperature: {temperature} (Low temperature ensures factual adherence)
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* The 20 AI Core Rules */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Enforced AI Rules</h3>
            <p className="text-xs text-slate-500">Every prompt sent to Gemini explicitly enforces these 20 guardrails.</p>
          </div>
          <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-bold border border-sky-200">
            20 / 20 Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {rules.map((rule, idx) => (
            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-slate-700 font-medium leading-tight">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
