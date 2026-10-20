/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  NavScreen, 
  KnowledgeDoc, 
  AuditJob, 
  AuditJobStatus,
  DocStatus,
  AuditReport
} from './types';
import { 
  INITIAL_KNOWLEDGE_DOCS, 
  INITIAL_AUDIT_JOBS, 
  SAMPLE_AUDIT_REPORT_PRIMARY 
} from './data/sampleData';
import { useAuth } from './contexts/AuthContext';
import { 
  getKnowledgeSources, 
  createKnowledgeSource, 
  updateKnowledgeSourceStatus,
  deleteKnowledgeSource,
  seedKnowledgeSourcesToFirestore,
  UploadProgressInfo
} from './services/knowledgeService';
import { 
  getAuditJobs, 
  createAuditJobInDb, 
  updateAuditJobStatusInDb,
  seedAuditJobsToFirestore
} from './services/auditJobService';
import { 
  getAuditReport, 
  seedPrimaryReportToFirestore 
} from './services/reportService';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { KnowledgeBaseView } from './components/knowledge/KnowledgeBaseView';
import { NewAuditView } from './components/new-audit/NewAuditView';
import { AuditQueueView } from './components/queue/AuditQueueView';
import { AuditReportView } from './components/reports/AuditReportView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { AuthModal } from './components/auth/AuthModal';
import { LoginView } from './components/auth/LoginView';
import { UnauthorizedView } from './components/auth/UnauthorizedView';
import { AccessRestricted } from './components/common/AccessRestricted';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export default function App() {
  const { 
    isConfigured, 
    isAdmin, 
    isLead, 
    isAuditor, 
    isCounsellor, 
    role, 
    isRoleVerified, 
    user, 
    loading 
  } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('dashboard');
  
  // Data mode: false = Live Firestore (production mode), true = Sample Demonstration mode
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [jobs, setJobs] = useState<AuditJob[]>([]);
  const [selectedJobIdForReport, setSelectedJobIdForReport] = useState<string>('job-nw-8921');
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isFirestoreSource, setIsFirestoreSource] = useState<boolean>(false);

  // Helper to determine if a screen is permitted for the verified role
  const isScreenAllowed = useCallback((screen: NavScreen): boolean => {
    if (isDemoMode) return true;
    if (isAdmin) return true;
    if (isLead) {
      return ['dashboard', 'audit-queue', 'audit-reports', 'analytics', 'knowledge-base'].includes(screen);
    }
    if (isAuditor) {
      return ['new-audit', 'audit-queue', 'audit-reports', 'knowledge-base'].includes(screen);
    }
    if (isCounsellor) {
      return ['audit-queue', 'audit-reports', 'knowledge-base'].includes(screen);
    }
    return false;
  }, [isAdmin, isLead, isAuditor, isCounsellor, isDemoMode]);

  // Load data based on mode (Production Firestore vs Demo)
  // CRITICAL: Only queries Firestore when the user is authenticated or in demo mode!
  const refreshData = useCallback(async (demoMode: boolean) => {
    setIsLoadingData(true);
    try {
      if (demoMode) {
        setKnowledgeDocs(INITIAL_KNOWLEDGE_DOCS);
        setJobs(INITIAL_AUDIT_JOBS);
        setActiveReport(SAMPLE_AUDIT_REPORT_PRIMARY);
        setIsFirestoreSource(false);
      } else {
        const [docsRes, jobsRes] = await Promise.all([
          getKnowledgeSources({ fallbackToDemo: false }),
          getAuditJobs({ fallbackToDemo: false })
        ]);
        
        setKnowledgeDocs(docsRes.docs);
        setJobs(jobsRes.jobs);
        setIsFirestoreSource(docsRes.fromFirestore || jobsRes.fromFirestore);

        // Fetch report for selected job if present
        if (selectedJobIdForReport) {
          const reportRes = await getAuditReport(selectedJobIdForReport, { fallbackToDemo: false });
          setActiveReport(reportRes.report);
        }
      }
    } catch (err) {
      console.warn('[App] Error refreshing data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedJobIdForReport]);

  // Only refresh data when authenticated or explicitly previewing demo
  useEffect(() => {
    if (user || isDemoMode) {
      refreshData(isDemoMode);
    }
  }, [user, isConfigured, isDemoMode, refreshData]);

  // Direct user to their appropriate landing screen upon role verification
  useEffect(() => {
    if (user && isRoleVerified) {
      if (!isScreenAllowed(currentScreen)) {
        if (isCounsellor || isAuditor) {
          setCurrentScreen('audit-queue');
        } else {
          setCurrentScreen('dashboard');
        }
      }
    }
  }, [user, isRoleVerified, role, currentScreen, isScreenAllowed, isCounsellor, isAuditor]);

  // Count pending queue items
  const pendingCount = jobs.filter(
    (j) => j.status === 'Queued' || j.status === 'Transcribing' || j.status === 'Auditing'
  ).length;

  // Knowledge Base Handlers
  const handleAddDoc = async (
    newDoc: KnowledgeDoc, 
    rawFile?: File,
    onProgress?: (info: UploadProgressInfo) => void
  ) => {
    if (!isDemoMode && isConfigured) {
      await createKnowledgeSource(newDoc, {
        rawFile,
        onProgress,
        timeoutMs: 12000,
      });
    }
    // Only update local state if Firestore write succeeds, avoiding duplicates on retry
    setKnowledgeDocs((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
  };

  const handleToggleDocStatus = async (docId: string, newStatus: DocStatus) => {
    if (!isDemoMode && isConfigured) {
      await updateKnowledgeSourceStatus(docId, newStatus);
    }
    setKnowledgeDocs((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, status: newStatus } : doc))
    );
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!isDemoMode && isConfigured) {
      await deleteKnowledgeSource(docId);
    }
    setKnowledgeDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // Audit Job Handlers
  const handleAddJob = async (newJob: AuditJob) => {
    setJobs((prev) => [newJob, ...prev]);
    if (!isDemoMode && isConfigured) {
      try {
        await createAuditJobInDb(newJob);
      } catch (err) {
        console.error('[App] Failed to persist audit job to Firestore:', err);
      }
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: AuditJobStatus, progress: number) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id === jobId) {
          return {
            ...job,
            status: newStatus,
            progress,
          };
        }
        return job;
      })
    );

    if (!isDemoMode && isConfigured) {
      try {
        await updateAuditJobStatusInDb(jobId, newStatus, progress);
      } catch (err) {
        console.error('[App] Failed to update job status in Firestore:', err);
      }
    }
  };

  const handleSelectJobForReport = async (jobId: string) => {
    setSelectedJobIdForReport(jobId);
    setCurrentScreen('audit-reports');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await getAuditReport(jobId, { fallbackToDemo: isDemoMode });
      setActiveReport(res.report);
    } catch (err) {
      console.warn('[App] Error fetching report for selected job:', err);
      setActiveReport(null);
    }
  };

  const handleReviewSaved = (reportId: string, updatedScore: number) => {
    // Sync the updated score into the job queue list
    setJobs((prev) =>
      prev.map((j) => (j.id === selectedJobIdForReport ? { ...j, score: updatedScore, status: 'Completed' } : j))
    );
  };

  const handleSeedSampleJobs = async () => {
    await seedAuditJobsToFirestore();
    try {
      await seedPrimaryReportToFirestore();
    } catch {
      // Handled
    }
    await refreshData(false);
  };

  // 1. Loading state during Firebase Auth initialization
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">NxtWave AI Audit Platform</h2>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span>Verifying security credentials and access permissions...</span>
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Login Screen (unless user explicitly previews demo)
  if (!user && !isDemoMode) {
    return <LoginView onEnterDemoMode={() => setIsDemoMode(true)} />;
  }

  // 3. Authenticated but unverified role state
  if (user && !isRoleVerified && !isDemoMode) {
    return <UnauthorizedView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFC] text-slate-900 font-sans selection:bg-[#2455E8]/10 selection:text-[#2455E8]">
      {/* Top Navbar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        pendingQueueCount={pendingCount}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          pendingCount={pendingCount}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* RBAC Route Protection: Guard protected screens against unauthorized role access */}
          {!isScreenAllowed(currentScreen) ? (
            <AccessRestricted 
              attemptedScreen={currentScreen} 
              onNavigate={setCurrentScreen} 
            />
          ) : (
            <>
              {currentScreen === 'dashboard' && (
                <DashboardView
                  jobs={jobs}
                  isDemoMode={isDemoMode}
                  onNavigate={setCurrentScreen}
                  onSelectJobForReport={handleSelectJobForReport}
                />
              )}

              {currentScreen === 'knowledge-base' && (
                <KnowledgeBaseView
                  docs={knowledgeDocs}
                  onAddDoc={handleAddDoc}
                  onToggleStatus={handleToggleDocStatus}
                  onDeleteDoc={handleDeleteDoc}
                  onRefresh={() => refreshData(isDemoMode)}
                />
              )}

              {currentScreen === 'new-audit' && (
                <NewAuditView
                  onAddJob={handleAddJob}
                  onNavigate={setCurrentScreen}
                />
              )}

              {currentScreen === 'audit-queue' && (
                <AuditQueueView
                  jobs={jobs}
                  isLoading={isLoadingData}
                  onSelectJobForReport={handleSelectJobForReport}
                  onNavigate={setCurrentScreen}
                  onUpdateJobStatus={handleUpdateJobStatus}
                  onSeedSampleJobs={handleSeedSampleJobs}
                />
              )}

              {currentScreen === 'audit-reports' && (
                <AuditReportView
                  currentReport={activeReport}
                  onBackToQueue={() => setCurrentScreen('audit-queue')}
                  onReviewSaved={handleReviewSaved}
                />
              )}

              {currentScreen === 'analytics' && (
                <AnalyticsView
                  jobs={jobs}
                  isDemoMode={isDemoMode}
                />
              )}

              {currentScreen === 'settings' && (
                <SettingsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Google Authentication Dialog */}
      <AuthModal />
    </div>
  );
}
