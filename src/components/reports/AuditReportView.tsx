import React, { useState } from 'react';
import { 
  AuditReport, 
  ReviewerReview, 
  CriterionScore, 
  AuditFinding 
} from '../../types';
import { 
  SAMPLE_AUDIT_REPORT_PRIMARY 
} from '../../data/sampleData';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download, 
  Share2, 
  UserCheck, 
  MessageSquare, 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  Languages, 
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  AlertCircle,
  X
} from 'lucide-react';

import { saveAuditorReviewToDb } from '../../services/reportService';
import { useAuth } from '../../contexts/AuthContext';

interface AuditReportViewProps {
  currentReport?: AuditReport | null;
  onBackToQueue: () => void;
  onReviewSaved?: (reportId: string, updatedScore: number) => void;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  currentReport,
  onBackToQueue,
  onReviewSaved
}) => {
  const { userProfile, isConfigured, isAdmin, isAuditor } = useAuth();
  const canReview = isAdmin || isAuditor;
  const [activeTab, setActiveTab] = useState<'scorecard' | 'transcript' | 'findings' | 'coaching' | 'reviewer'>('scorecard');
  const [showEnglishTranslation, setShowEnglishTranslation] = useState<boolean>(true);
  const [transcriptFilter, setTranscriptFilter] = useState<'all' | 'flagged'>('all');
  
  // Auditor review form state
  const [reviewerNotes, setReviewerNotes] = useState<string>(
    currentReport?.reviewerReview?.notes || ''
  );
  const [overrideScore, setOverrideScore] = useState<number>(
    currentReport?.reviewerReview?.finalScore || currentReport?.overallScore || 0
  );
  const [overrideReason, setOverrideReason] = useState<string>(
    currentReport?.reviewerReview?.overrideReason || ''
  );
  const [reviewStatus, setReviewStatus] = useState<ReviewerReview['status']>(
    currentReport?.reviewerReview?.status || 'Approved'
  );
  const [isSavedFeedback, setIsSavedFeedback] = useState<boolean>(false);
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<{ message: string; type?: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 3000);
  };

  // Score tier styling
  const getTierBadge = (score: number) => {
    if (score >= 90) {
      return { text: 'Exemplary Compliance', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (score >= 75) {
      return { text: 'Compliant Pitch', color: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
    if (score >= 60) {
      return { text: 'Needs Coaching', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { text: 'Critical Non-Compliant', color: 'bg-rose-50 text-rose-800 border-rose-200' };
  };

  const tier = getTierBadge(overrideScore);

  if (!currentReport) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToQueue}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Audit Queue</span>
          </button>
        </div>

        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">
              Audit Report Pending
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              This call is currently processing in the queue. Transcription, policy alignment, and criteria scoring have not yet been finalized.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onBackToQueue}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Return to Audit Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingReview(true);

    const reviewPayload: ReviewerReview = {
      auditorName: userProfile?.displayName || currentReport.reviewerReview.auditorName,
      auditorEmail: userProfile?.email || currentReport.reviewerReview.auditorEmail,
      status: reviewStatus,
      originalScore: currentReport.overallScore,
      finalScore: overrideScore,
      overrideReason: overrideReason || undefined,
      notes: reviewerNotes,
      signedAt: new Date().toISOString(),
    };

    try {
      if (isConfigured) {
        await saveAuditorReviewToDb(currentReport.jobId, currentReport.id, reviewPayload);
      }
      if (onReviewSaved) {
        onReviewSaved(currentReport.id, overrideScore);
      }
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 3500);
    } catch (err: any) {
      showToast(`Error saving auditor sign-off: ${err?.message}`, 'error');
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {actionToast && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 shadow-xs animate-fadeIn ${
          actionToast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : actionToast.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{actionToast.message}</span>
          <button 
            onClick={() => setActionToast(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToQueue}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Audit Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Report ID: {currentReport.id}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-mono">Call Date: {currentReport.callDate}</span>
        </div>
      </div>

      {/* Main Header Card: Score & Metadata */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {/* Score Ring / Block */}
            <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-2xl font-bold font-mono tracking-tight tabular-nums">
                {overrideScore}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">out of 100</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${tier.color}`}>
                  {tier.text}
                </span>
                {currentReport.criticalViolations.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>{currentReport.criticalViolations.length} Critical Violation</span>
                  </span>
                )}
                {overrideScore !== currentReport.overallScore && (
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Score overridden from {currentReport.overallScore}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-slate-900">
                Call Audit: {currentReport.counsellorName}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="font-mono text-slate-700 font-medium">{currentReport.counsellorEmpId}</span>
                <span aria-hidden="true">·</span>
                <span>{currentReport.team}</span>
                <span className="font-semibold text-slate-700">{currentReport.product}</span>
                {currentReport.stage && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {currentReport.stage}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{currentReport.language}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{currentReport.duration}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => showToast(`Report for ${currentReport.counsellorName} exported as PDF summary.`, 'success')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(window.location.href);
                } catch {
                  // Handled
                }
                showToast('Audit Report link copied to clipboard.', 'success');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>
            {canReview && (
              <button
                onClick={() => setActiveTab('reviewer')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-100" />
                <span>Reviewer Sign-off</span>
              </button>
            )}
          </div>
        </div>

        {/* 5 Tab Navigation Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'scorecard'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Scorecard Breakdown</span>
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Diarized Transcript</span>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {currentReport.transcript.length} turns
            </span>
          </button>

          <button
            onClick={() => setActiveTab('findings')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'findings'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Violations &amp; Evidence</span>
            <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
              {currentReport.criticalViolations.length + currentReport.unsupportedClaims.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('coaching')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'coaching'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Coaching Plan</span>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {currentReport.coachingRecommendations.length}
            </span>
          </button>

          {canReview && (
            <button
              onClick={() => setActiveTab('reviewer')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'reviewer'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Reviewer Notes &amp; Overrides</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Scorecard & Breakdown */}
      {activeTab === 'scorecard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              8-Factor Audio QA Rubric Breakdown
            </h2>
            <div className="text-xs text-slate-500">
              Evaluated against approved NxtWave rubric v5.0
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentReport.criteriaBreakdown.map((criterion, idx) => {
              const isPass = criterion.status === 'pass';
              const isWarning = criterion.status === 'warning';
              const isFail = criterion.status === 'fail';

              return (
                <div
                  key={criterion.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {idx + 1}. {criterion.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">
                          Weight: {criterion.weightPercent}%
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          isPass 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : isWarning 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isPass ? 'Compliant' : isWarning ? 'Needs Work' : 'Violation'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        {criterion.title}
                      </h3>
                      <div className="font-mono text-base font-bold tabular-nums text-slate-900">
                        <span className={isFail ? 'text-rose-600' : 'text-slate-900'}>
                          {criterion.earnedScore}
                        </span>
                        <span className="text-slate-400 text-xs font-normal"> / {criterion.maxScore} pts</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {criterion.feedback}
                    </p>
                  </div>

                  {criterion.kbClauseRef && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Policy Citation:</span>
                      <span className="font-mono text-blue-700 font-medium">
                        {criterion.kbClauseRef}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Diarized Transcript */}
      {activeTab === 'transcript' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Synchronized Diarized Speech Transcript
              </h2>
              <p className="text-xs text-slate-500">
                Speaker turn detection with Hinglish acoustic model &amp; policy highlight flags.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* English Translation Toggle */}
              <button
                onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  showEnglishTranslation
                    ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{showEnglishTranslation ? 'Hide English Translation' : 'Show English Translation'}</span>
              </button>

              {/* Filter Flagged Only */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
                <button
                  onClick={() => setTranscriptFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    transcriptFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  All Dialogue
                </button>
                <button
                  onClick={() => setTranscriptFilter('flagged')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    transcriptFilter === 'flagged' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  Flagged Only
                </button>
              </div>
            </div>
          </div>

          {/* Transcript Dialogue List */}
          <div className="space-y-4">
            {currentReport.transcript
              .filter(turn => transcriptFilter === 'all' || turn.highlightType)
              .map((turn) => {
                const isCounsellor = turn.speaker === 'Counsellor';
                const isCritical = turn.highlightType === 'critical';
                const isUnsupported = turn.highlightType === 'unsupported';
                const isPraise = turn.highlightType === 'praise';

                return (
                  <div
                    key={turn.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isCritical
                        ? 'bg-rose-50/70 border-rose-200'
                        : isUnsupported
                        ? 'bg-amber-50/70 border-amber-200'
                        : isPraise
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isCounsellor
                        ? 'bg-slate-50/60 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Speaker Header */}
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isCounsellor ? 'text-blue-700' : 'text-slate-800'}`}>
                          {turn.speakerName} ({turn.speaker})
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          [{turn.timestamp}]
                        </span>
                      </div>

                      {turn.highlightType && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isUnsupported
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isCritical ? 'Critical Policy Violation' : isUnsupported ? 'Unsupported Claim' : 'Positive Adherence'}
                        </span>
                      )}
                    </div>

                    {/* Hinglish Transcript */}
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {turn.textHinglish}
                    </p>

                    {/* English Translation */}
                    {showEnglishTranslation && (
                      <p className="text-[11px] text-slate-500 italic mt-1.5 leading-normal">
                        Translation: "{turn.textEnglish}"
                      </p>
                    )}

                    {/* Highlight Note */}
                    {turn.highlightNote && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs font-medium flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
                        <span className="text-slate-700">{turn.highlightNote}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 3: Evidence-Backed Findings */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          {/* Critical Violations */}
          <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold">
                Critical Policy Violations ({currentReport.criticalViolations.length})
              </h3>
            </div>
            <p className="text-xs text-rose-700">
              Zero-tolerance infractions that mandate auditor sign-off and counsellor retraining.
            </p>

            <div className="space-y-3">
              {currentReport.criticalViolations.map((v) => (
                <div key={v.id} className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900">{v.title}</span>
                    <span className="font-mono text-rose-700 font-semibold">Timestamp: {v.timestamp}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-rose-200 rounded-lg font-mono text-rose-950 text-[11px]">
                    {v.quote}
                  </div>
                  <p className="text-rose-900 leading-relaxed">
                    <span className="font-semibold">Violation Rule: </span>{v.violationRule}
                  </p>
                  <div className="pt-2 border-t border-rose-200 flex items-center justify-between text-[11px] text-rose-800">
                    <span>Reference Doc: <span className="font-semibold">{v.policyDoc}</span></span>
                    <span className="font-semibold">Action: {v.zeroToleranceAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Narrative Points */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Missing Narrative Points</h3>
                <p className="text-xs text-slate-500">
                  Approved pitch elements and disclosures that were omitted during the call.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {currentReport.missingNarratives.length} items missed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentReport.missingNarratives.map((mn) => (
                <div key={mn.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{mn.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      mn.importance === 'Mandatory' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {mn.importance}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    {mn.expectedTopic}
                  </p>
                  <p className="text-slate-500 text-[10px] italic">
                    Impact: {mn.impactNote}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Unsupported Claims */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Incorrect or Unsupported Claims</h3>
              <p className="text-xs text-slate-500">
                Statements made by counsellor contrasted with verified knowledge base policies.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {currentReport.unsupportedClaims.map((uc) => (
                <div key={uc.id} className="py-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-500">Timestamp: {uc.timestamp}</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {uc.riskSeverity} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg">
                      <span className="text-[10px] font-semibold text-rose-800 uppercase block mb-1">
                        Claim Made on Call
                      </span>
                      <p className="text-rose-900">{uc.claimMade}</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <span className="text-[10px] font-semibold text-emerald-800 uppercase block mb-1">
                        Verified Policy Fact
                      </span>
                      <p className="text-emerald-900">{uc.actualPolicy}</p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Source: {uc.referenceDoc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Coaching Recommendations */}
      {activeTab === 'coaching' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Manager &amp; Counsellor Coaching Recommendations
            </h2>
            <p className="text-xs text-slate-500">
              Prescribed phrasing adjustments and required training modules to address identified gaps.
            </p>
          </div>

          <div className="space-y-4">
            {currentReport.coachingRecommendations.map((cr, idx) => (
              <div key={cr.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{cr.area}</span>
                  </div>
                  <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {cr.trainingModule}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase block">
                    Observed Problem:
                  </span>
                  <p className="text-slate-800">{cr.observedDeficiency}</p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase block">
                    Approved Replacement Script ("Say this instead"):
                  </span>
                  <p className="text-slate-900 italic font-medium leading-relaxed">
                    {cr.recommendedPhrasing}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Human Reviewer & Score Override */}
      {activeTab === 'reviewer' && canReview && (
        <form onSubmit={handleSaveReview} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Auditor Sign-off &amp; Score Override
            </h2>
            <p className="text-xs text-slate-500">
              Human review controls. Change scores, log overrides, and update training workflows.
            </p>
          </div>

          {isSavedFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Auditor sign-off and score adjustments saved successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800">Lead QA Auditor</label>
              <input
                type="text"
                disabled
                value={currentReport.reviewerReview.auditorName}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-800">Audit Sign-off Status</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none"
              >
                <option value="Approved">Approved</option>
                <option value="Score Overridden">Score Overridden</option>
                <option value="Sent for Retraining">Sent for Retraining</option>
                <option value="Draft">Draft Review</option>
              </select>
            </div>
          </div>

          {/* Score Override section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Manual Score Override</span>
                <span className="text-[11px] text-slate-500">
                  Default automated score was {currentReport.overallScore}/100.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-sm text-center"
                />
                <span className="font-mono text-slate-500">/ 100</span>
              </div>
            </div>

            {overrideScore !== currentReport.overallScore && (
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="font-semibold text-slate-800 block">
                  Mandatory Override Reason <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Counsellor corrected the claim in follow-up closing call; softened severity."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Auditor Comments */}
          <div className="space-y-1 text-xs">
            <label className="font-semibold text-slate-800 block">Auditor Feedback &amp; Manager Directives</label>
            <textarea
              rows={4}
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Enter specific managerial remarks for Team Lead review."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Audit recorded on {currentReport.auditDate}
            </span>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Save Auditor Sign-Off
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
