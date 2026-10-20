import React, { useState, useEffect } from 'react';
import { useAuth, isEmbeddedInIframe } from '../../contexts/AuthContext';
import { 
  firebaseConfig, 
  isFirebaseConfigured, 
  testFirestoreConnection,
  dbAnalysis,
  ConnectionDiagnosticResult
} from '../../lib/firebase';
import { 
  getRubricWeights, 
  saveRubricWeights, 
  RubricWeightsConfig, 
  DEFAULT_RUBRIC_WEIGHTS 
} from '../../services/rubricService';
import { seedKnowledgeSourcesToFirestore } from '../../services/knowledgeService';
import { seedAuditJobsToFirestore } from '../../services/auditJobService';
import { 
  Sliders, 
  Languages, 
  ShieldCheck, 
  Database, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Lock, 
  Cloud,
  FileCode,
  Check,
  RefreshCw,
  ExternalLink,
  Copy,
  Users,
  Info,
  LogIn
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    user, 
    userProfile, 
    isConfigured, 
    signInWithGoogle, 
    loading: authLoading, 
    isSigningIn, 
    openStandaloneTab 
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'rubric' | 'languages' | 'roles' | 'retention' | 'integrations'>('rubric');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Rubric weights state
  const [weights, setWeights] = useState<RubricWeightsConfig>(DEFAULT_RUBRIC_WEIGHTS);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  // Firestore test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionDiagnosticResult | null>(null);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingMessage, setSeedingMessage] = useState<string | null>(null);

  // Language settings
  const [defaultLanguage, setDefaultLanguage] = useState('Hinglish (Priority)');
  const [codeSwitchingSensitivity, setCodeSwitchingSensitivity] = useState('High (Aggressive code-mixing detection)');

  // Retention settings
  const [retentionDays, setRetentionDays] = useState('90');
  const [autoPurgeTranscripts, setAutoPurgeTranscripts] = useState(true);
  const [anonymizePII, setAnonymizePII] = useState(true);

  // Load rubric weights from Firestore on mount
  useEffect(() => {
    async function loadWeights() {
      const res = await getRubricWeights();
      setWeights(res.weights);
    }
    loadWeights();
  }, []);

  // Auto-refresh connection test when auth state changes (e.g. user signs in or out)
  useEffect(() => {
    if (activeTab === 'integrations' && isFirebaseConfigured) {
      handleTestConnection();
    }
  }, [user?.uid, activeTab]);

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

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const result = await testFirestoreConnection();
      setConnectionTestResult(result);
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        status: 'error',
        title: 'Unexpected Connection Test Failure',
        message: err?.message || 'Connection test threw an unexpected error.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSeedData = async () => {
    if (!isFirebaseConfigured) {
      setSeedingMessage('Firebase credentials are not configured or active. Provide active keys in your environment before seeding.');
      return;
    }
    setIsSeeding(true);
    setSeedingMessage(null);
    try {
      const docsCount = await seedKnowledgeSourcesToFirestore();
      const jobsCount = await seedAuditJobsToFirestore();
      setSeedingMessage(`Successfully seeded ${docsCount} knowledge sources and ${jobsCount} sample audit jobs into Cloud Firestore!`);
    } catch (err: any) {
      setSeedingMessage(`Seeding error: ${err?.message || String(err)}`);
    } finally {
      setIsSeeding(false);
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
          Configure audit rubrics, language acoustics, role-based access, and Cloud Firestore integration.
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
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>Cloud Connection</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage || 'Configuration saved successfully.'}</span>
        </div>
      )}

      {/* Tab 1: Firebase & Firestore Status (PRIMARY) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Status Diagnostic Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Firebase &amp; Cloud Firestore Foundation
                    </h2>
                    {(() => {
                      if (connectionTestResult) {
                        if (connectionTestResult.status === 'connected') {
                          return (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              CONNECTED &amp; ONLINE
                            </span>
                          );
                        }
                        if (connectionTestResult.status === 'rule-protected') {
                          return (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              ONLINE (RULES ACTIVE)
                            </span>
                          );
                        }
                        if (connectionTestResult.status === 'offline') {
                          return (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                              OFFLINE / UNREACHABLE
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            CONNECTION ERROR
                          </span>
                        );
                      }
                      if (user) {
                        return (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            AUTHENTICATED
                          </span>
                        );
                      }
                      if (isConfigured) {
                        return (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            CONFIGURED (READY TO TEST)
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          STANDBY (AWAITING KEYS)
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500">
                    Client SDK, Firestore service layer, data schemas, and role security rules are fully implemented.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-blue-600' : ''}`} />
                  <span>{isTestingConnection ? 'Probing Server...' : 'Test Connection'}</span>
                </button>

                {isConfigured && (
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Seed Initial Data</span>
                  </button>
                )}
              </div>
            </div>

            {/* Analytics ID Auto-Correction Warning Banner */}
            {dbAnalysis.isAnalyticsMeasurementId && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Google Analytics Measurement ID Detected in Database Configuration</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-semibold">{dbAnalysis.rawConfiguredId}</code> was entered in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">VITE_FIREBASE_DATABASE_ID</code>, but this is a <strong>Google Analytics 4 Measurement ID</strong> (G-...), not a Firestore Database ID. Passing an Analytics ID causes the Firestore SDK to search for a non-existent database and error with <em>"Client is offline"</em>.
                </p>
                <p className="text-amber-900 font-medium text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Automatic Correction Active:</strong> The application automatically routes queries to Cloud Firestore's standard default database <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold text-slate-900">(default)</code>.</span>
                </p>
              </div>
            )}

            {/* Test Connection Output */}
            {connectionTestResult && (
              <div className={`p-4 rounded-xl text-xs border space-y-2.5 ${
                connectionTestResult.status === 'connected' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : connectionTestResult.status === 'rule-protected'
                  ? 'bg-blue-50 border-blue-200 text-blue-950'
                  : connectionTestResult.status === 'offline'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start gap-2.5">
                  {connectionTestResult.status === 'connected' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : connectionTestResult.status === 'rule-protected' ? (
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  ) : connectionTestResult.status === 'offline' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm block">
                        {connectionTestResult.title}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded uppercase ${
                        connectionTestResult.details?.serverReached ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {connectionTestResult.details?.serverReached ? 'Server Reached' : 'Unreachable'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      {connectionTestResult.message}
                    </p>
                    {connectionTestResult.details?.recommendation && (
                      <p className="text-[11px] font-medium text-slate-700 bg-white/70 p-2 rounded-lg border border-slate-200/50 mt-1.5">
                        <span className="font-semibold text-slate-900">Next Action:</span> {connectionTestResult.details.recommendation}
                      </p>
                    )}
                  </div>
                </div>

                {connectionTestResult.details && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-1.5 bg-white/80 rounded border border-slate-200/40">
                      <span className="text-slate-500 block text-[10px] font-sans">Active Database</span>
                      <span className="font-semibold text-slate-800">{connectionTestResult.details.databaseUsed}</span>
                    </div>
                    <div className="p-1.5 bg-white/80 rounded border border-slate-200/40">
                      <span className="text-slate-500 block text-[10px] font-sans">Response Code</span>
                      <span className="font-semibold text-slate-800 truncate block">{connectionTestResult.details.code || '200 OK'}</span>
                    </div>
                    <div className="p-1.5 bg-white/80 rounded border border-slate-200/40">
                      <span className="text-slate-500 block text-[10px] font-sans">Auth State</span>
                      <span className={`font-semibold ${connectionTestResult.details.userAuthenticated ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {connectionTestResult.details.userAuthenticated ? 'Signed In' : 'Unauthenticated'}
                      </span>
                    </div>
                    <div className="p-1.5 bg-white/80 rounded border border-slate-200/40">
                      <span className="text-slate-500 block text-[10px] font-sans">User Account</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {connectionTestResult.details.userEmail || 'Guest (Unauthenticated)'}
                      </span>
                    </div>
                  </div>
                )}

                {!user && isConfigured && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 p-2.5 rounded-lg">
                    <p className="text-[11px] text-slate-600">
                      You are in guest mode. Sign in with your Google account to test authenticated reads on protected Firestore collections.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => signInWithGoogle()}
                        disabled={authLoading || isSigningIn}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                      >
                        {isSigningIn ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-300" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3.5 h-3.5 text-blue-300" />
                            <span>Sign in with Google</span>
                          </>
                        )}
                      </button>
                      {isEmbeddedInIframe() && (
                        <button
                          onClick={openStandaloneTab}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                          title="Open in new window to sign in without iframe popup restrictions"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>New Tab</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {user && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/80 border border-emerald-200/70 p-3 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        ✓
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-emerald-950 block">
                          Authenticated as: {user.email}
                        </span>
                        <span className="text-[11px] text-emerald-800">
                          Role: <strong className="capitalize">{userProfile?.role || 'counsellor'}</strong> &bull; UID: <code className="font-mono text-[10px] bg-emerald-100 px-1 rounded">{user.uid}</code>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestConnection()}
                      disabled={isTestingConnection}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                      <span>Refresh Connection</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {seedingMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs">
                {seedingMessage}
              </div>
            )}

            {/* Config Parameter Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Project ID</span>
                <span className="font-mono font-medium text-slate-800 text-[11px] truncate block">
                  {firebaseConfig.projectId || 'Not set in .env'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Auth Domain</span>
                <span className="font-mono font-medium text-slate-800 text-[11px] truncate block">
                  {firebaseConfig.authDomain || 'Not set in .env'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Configured DB ID</span>
                <span className="font-mono font-medium text-slate-800 text-[11px] truncate block" title={firebaseConfig.rawDatabaseId || '(default)'}>
                  {firebaseConfig.rawDatabaseId || '(default)'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Route</span>
                <span className="font-mono font-bold text-[#2455E8] text-[11px] truncate block">
                  {dbAnalysis.displayDatabaseId}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rubric Weights */}
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
              Save Rubric to Firestore
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
                {userProfile?.displayName ? `${userProfile.displayName} (${userProfile.role})` : 'Sunita Rao (Auditor)'}
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Sales Team Lead</span>
                <span className="text-slate-500 text-[11px]">Can view team audit reports, assign coaching drills, and request re-evaluations.</span>
              </div>
              <span className="text-slate-500 font-mono">14 Active Leads</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Admissions Counsellor (Learner)</span>
                <span className="text-slate-500 text-[11px]">Can view self-audit scorecards, coaching recommendations, and approved scripts.</span>
              </div>
              <span className="text-slate-500 font-mono">180 Counsellors</span>
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
