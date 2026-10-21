import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getRubricWeights, 
  saveRubricWeights, 
  RubricWeightsConfig, 
  DEFAULT_RUBRIC_WEIGHTS 
} from '../../services/rubricService';
import { 
  Sliders, 
  Languages, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Lock, 
  Cloud, 
  Check, 
  HardDrive,
  Users, 
  Info,
  Server
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'rubric' | 'languages' | 'roles' | 'retention' | 'integrations'>('rubric');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Rubric weights state
  const [weights, setWeights] = useState<RubricWeightsConfig>(DEFAULT_RUBRIC_WEIGHTS);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Language settings
  const [defaultLanguage, setDefaultLanguage] = useState('Hinglish (Priority)');
  const [codeSwitchingSensitivity, setCodeSwitchingSensitivity] = useState('High (Aggressive code-mixing detection)');

  // Retention settings
  const [retentionDays, setRetentionDays] = useState('90');
  const [anonymizePII, setAnonymizePII] = useState<boolean>(true);
  const [autoPurgeTranscripts, setAutoPurgeTranscripts] = useState<boolean>(false);

  // Load rubric weights from backend on mount
  useEffect(() => {
    async function loadWeights() {
      const res = await getRubricWeights();
      setWeights(res.weights);
    }
    loadWeights();
  }, []);

  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) return;

    try {
      await saveRubricWeights(weights);
      setSaveMessage('Rubric weights saved successfully.');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setSaveMessage(`Error saving rubric: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Settings &amp; Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure audit rubrics, language acoustics, role-based access, and local database storage.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rubric')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'rubric' ? 'bg-[#2455E8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Rubric Weights
        </button>
        <button
          onClick={() => setActiveTab('languages')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'languages' ? 'bg-[#2455E8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Language &amp; Dialects
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'roles' ? 'bg-[#2455E8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          User Roles &amp; Access
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'retention' ? 'bg-[#2455E8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Processing &amp; Retention
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'integrations' ? 'bg-[#2455E8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Database &amp; Storage</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage || 'Configuration saved successfully.'}</span>
        </div>
      )}

      {/* Tab: Database & Storage Status */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Active Local Database Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Primary Database: Local SQLite
                    </h2>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ACTIVE &amp; PERSISTENT
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Engineered using Node 22 built-in SQLite with Write-Ahead Logging (WAL) concurrency and foreign key enforcement.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Storage File</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px] block">data/nxtwave_audit.db</span>
                <span className="text-[10px] text-slate-500 block">Server-side persistent storage</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Concurrency Mode</span>
                <span className="font-mono font-semibold text-emerald-700 text-[11px] block">PRAGMA journal_mode = WAL</span>
                <span className="text-[10px] text-slate-500 block">Fast atomic transactions</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Core Schemas</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px] block">users, jobs, reports, knowledge, rubrics, sessions</span>
                <span className="text-[10px] text-slate-500 block">Relational integrity enforced</span>
              </div>
            </div>
          </div>

          {/* Cloud Integrations Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Cloud Integrations (Firebase / Google Cloud)
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    DISABLED &amp; UNCONFIGURED
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  External cloud connections and Firebase SDK initializations are completely disabled.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <HardDrive className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Zero Cloud Dependency Guarantee</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                The application operates autonomously on the local Express and SQLite server. All network calls, background probes, and authentication queries to external Firebase projects have been permanently decoupled. No requests are sent to suspended or unverified Google Cloud endpoints.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Rubric Weights */}
      {activeTab === 'rubric' && (
        <form onSubmit={handleSaveRubric} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                8-Factor Rubric Weight Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Configure the relative evaluation weights across all 8 quality audit criteria.
              </p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold font-mono tabular-nums ${totalWeight === 100 ? 'text-emerald-700' : 'text-rose-600'}`}>
                Total: {totalWeight}%
              </span>
              {totalWeight !== 100 && (
                <span className="text-[10px] text-rose-600 block">Must equal 100%</span>
              )}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>1. Greeting &amp; Rapport Building</span>
                  <span className="font-mono">{weights.greeting}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.greeting}
                  onChange={(e) => setWeights({ ...weights, greeting: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>2. Need Analysis &amp; Student Profiling</span>
                  <span className="font-mono">{weights.needAnalysis}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.needAnalysis}
                  onChange={(e) => setWeights({ ...weights, needAnalysis: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>3. Curriculum &amp; Pedagogy Accuracy</span>
                  <span className="font-mono">{weights.curriculum}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.curriculum}
                  onChange={(e) => setWeights({ ...weights, curriculum: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex justify-between font-semibold text-rose-900">
                  <span>4. Placement &amp; Career Claims (Zero-Tolerance)</span>
                  <span className="font-mono">{weights.placement}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.placement}
                  onChange={(e) => setWeights({ ...weights, placement: Number(e.target.value) })}
                  className="w-full accent-rose-700 cursor-pointer"
                />
                <span className="text-[10px] text-rose-700 block">Critical: Flagging auto-caps score at 68</span>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex justify-between font-semibold text-amber-900">
                  <span>5. Pricing, Scholarship &amp; EMI Transparency</span>
                  <span className="font-mono">{weights.pricing}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.pricing}
                  onChange={(e) => setWeights({ ...weights, pricing: Number(e.target.value) })}
                  className="w-full accent-amber-700 cursor-pointer"
                />
                <span className="text-[10px] text-amber-700 block">Requires verified NXT-SAT test proof</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>6. Objection Handling &amp; Empathy</span>
                  <span className="font-mono">{weights.objection}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.objection}
                  onChange={(e) => setWeights({ ...weights, objection: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>7. Urgency &amp; Ethical Next Steps</span>
                  <span className="font-mono">{weights.urgency}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.urgency}
                  onChange={(e) => setWeights({ ...weights, urgency: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>8. Professional Tone &amp; Hinglish Clarity</span>
                  <span className="font-mono">{weights.softSkills}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={weights.softSkills}
                  onChange={(e) => setWeights({ ...weights, softSkills: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={totalWeight !== 100}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs ${
                totalWeight === 100 
                  ? 'bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Save Rubric Weights
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Language & Dialects */}
      {activeTab === 'languages' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Indian Language &amp; Dialect Tuning
            </h2>
            <p className="text-slate-500">
              Acoustic normalizer for conversational Hinglish, code-switching, and regional phonetics.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 block">Default Acoustic Priority</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="Hinglish (Priority)">Hinglish (Hindi + English mixed)</option>
                <option value="Pure Hindi">Pure Hindi (Standard Devanagari vocabulary)</option>
                <option value="English (Indian Accents)">English (Indian Corporate Accent)</option>
                <option value="South Regional Code-mixing">Telugu / Tamil mixed with English</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-800 block">Code-Switching Sensitivity</label>
              <select
                value={codeSwitchingSensitivity}
                onChange={(e) => setCodeSwitchingSensitivity(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="High (Aggressive code-mixing detection)">High (Aggressive mid-sentence word translation)</option>
                <option value="Balanced (Sentence-level context)">Balanced (Sentence-level context)</option>
                <option value="Verbatim Phonetic">Verbatim Phonetic Only</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-semibold text-slate-900 block">Specialized Vocabulary Injection</span>
              <p className="text-slate-600 text-[11px]">
                Inject custom edtech terminology so transcription engines recognize CCBP phrases accurately:
              </p>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700">
                IRC, CCBP 4.0, NXT-SAT, No-Cost EMI, Full Stack, Capstone, Doubt Room, Pod Mentor, Placement Drive
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: User Roles & Access */}
      {activeTab === 'roles' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Role-Based Authorization &amp; Access Control
            </h2>
            <p className="text-slate-500">
              Enterprise role-based permissions governing platform visibility, review workflows, and report access.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between bg-purple-50/50 px-3 rounded-xl border border-purple-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 block">Platform Administrator (Super Admin)</span>
                  <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase">Authoritative</span>
                </div>
                <span className="text-slate-500 text-[11px]">Primary administrator: <strong className="font-mono text-purple-900">vivekbhagar@gmail.com</strong>. Full control over rules, knowledge documents, rubric weights, and retention policies.</span>
              </div>
              <span className="font-mono text-purple-800 bg-purple-100 px-2.5 py-1 rounded border border-purple-200 font-semibold text-xs">
                {user?.email === 'vivekbhagar@gmail.com' ? 'Active Session' : 'Authoritative Admin'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Lead QA Auditor</span>
                <span className="text-slate-500 text-[11px]">Can audit calls, override scores, publish knowledge docs, and sign off reports.</span>
              </div>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-semibold">
                {userProfile?.displayName ? `${userProfile.displayName} (${userProfile.role})` : 'Role: Auditor'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Sales Team Lead</span>
                <span className="text-slate-500 text-[11px]">Can view team audit reports, assign coaching drills, and request re-evaluations.</span>
              </div>
              <span className="text-slate-500 font-mono">Role: Lead</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Admissions Counsellor (Learner)</span>
                <span className="text-slate-500 text-[11px]">Can view self-audit scorecards, coaching recommendations, and approved scripts.</span>
              </div>
              <span className="text-slate-500 font-mono">Role: Counsellor</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Processing & Retention */}
      {activeTab === 'retention' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6 text-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data Processing &amp; Audio Retention
            </h2>
            <p className="text-slate-500">
              Compliance policies for storing student audio recordings and redacting confidential information.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 block">Recording Retention Window</label>
              <select
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full max-w-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days (Recommended for ASCI compliance)</option>
                <option value="180">180 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="anonymize"
                checked={anonymizePII}
                onChange={(e) => setAnonymizePII(e.target.checked)}
                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
              />
              <label htmlFor="anonymize" className="text-slate-800 font-medium cursor-pointer">
                Automatic PII Redaction (Mask phone numbers, Aadhaar, and debit card details in transcripts)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autopurge"
                checked={autoPurgeTranscripts}
                onChange={(e) => setAutoPurgeTranscripts(e.target.checked)}
                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
              />
              <label htmlFor="autopurge" className="text-slate-800 font-medium cursor-pointer">
                Auto-purge raw audio from temporary cache once transcript and compliance audit are finalized
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
