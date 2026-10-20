/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditJob, AuditJobStatus, NavScreen } from '../../types';
import { 
  Search, 
  ExternalLink, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Play, 
  ShieldAlert, 
  SlidersHorizontal, 
  FileAudio,
  Loader2,
  FolderOpen,
  X
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { 
  PRODUCTS, 
  PRODUCT_STAGE_MAP, 
  getStagesForProduct, 
  matchesProduct, 
  matchesStage 
} from '../../config/callStages';

interface AuditQueueViewProps {
  jobs: AuditJob[];
  isLoading?: boolean;
  onSelectJobForReport: (jobId: string) => void;
  onNavigate: (screen: NavScreen) => void;
  onUpdateJobStatus?: (jobId: string, newStatus: AuditJobStatus, progress: number) => void;
  onSeedSampleJobs?: () => Promise<void>;
}

export const AuditQueueView: React.FC<AuditQueueViewProps> = ({
  jobs,
  isLoading = false,
  onSelectJobForReport,
  onNavigate,
  onUpdateJobStatus,
  onSeedSampleJobs
}) => {
  const { isAdmin, isLead, isAuditor, isCounsellor, user, userProfile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const statuses: { label: string; value: string }[] = [
    { label: 'All Jobs', value: 'All' },
    { label: 'Queued', value: 'Queued' },
    { label: 'Transcribing', value: 'Transcribing' },
    { label: 'Auditing', value: 'Auditing' },
    { label: 'Needs Review', value: 'Needs Review' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Failed', value: 'Failed' },
  ];

  // Role-based visibility: Counsellors only see their own permitted audits
  const permittedJobs = isCounsellor
    ? jobs.filter((job) => {
        const userDisplayName = (user?.displayName || userProfile?.displayName || '').trim().toLowerCase();
        const userEmail = (user?.email || '').trim().toLowerCase();
        const matchesName = userDisplayName && job.counsellorName.toLowerCase().includes(userDisplayName);
        const matchesEmail = userEmail && (job as any).counsellorEmail === userEmail;
        const matchesUid = (job as any).submittedBy === user?.uid;
        return matchesName || matchesEmail || matchesUid;
      })
    : jobs;

  const filteredJobs = permittedJobs.filter((job) => {
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    const matchesProd = matchesProduct(job.product, productFilter);
    const matchesStg = matchesStage(job.stage, stageFilter);

    const matchesSearch = 
      job.recordingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.counsellorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.counsellorEmpId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.stage && job.stage.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesProd && matchesStg && matchesSearch;
  });

  const getStatusBadge = (status: AuditJobStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'Needs Review':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Needs Review
          </span>
        );
      case 'Auditing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            Auditing
          </span>
        );
      case 'Transcribing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            <FileAudio className="w-3.5 h-3.5 text-indigo-600" />
            Transcribing
          </span>
        );
      case 'Queued':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Queued
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const handleSeed = async () => {
    if (!onSeedSampleJobs) return;
    setIsSeeding(true);
    setToastMessage(null);
    try {
      await onSeedSampleJobs();
      setToastMessage({ text: 'Sample jobs successfully refreshed in the queue.', isError: false });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ text: `Note on seeding: ${err?.message}`, isError: true });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 shadow-xs animate-fadeIn ${
          toastMessage.isError 
            ? 'bg-amber-50 border-amber-200 text-amber-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Title & Queue Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time status of speech transcription, policy alignment parsing, and QA reviews.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {jobs.length === 0 && onSeedSampleJobs && (
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <FolderOpen className="w-4 h-4 text-slate-500" />}
                <span>Load Sample Queue</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('new-audit')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              + Submit New Recording
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Status Segmented Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {statuses.map((s) => {
              const count = s.value === 'All' 
                ? jobs.length 
                : jobs.filter(j => j.status === s.value).length;
              const isSelected = statusFilter === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#2455E8] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white font-bold' : 'text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Product Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by counsellor, emp ID, or recording name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={productFilter}
                onChange={(e) => {
                  const prod = e.target.value;
                  setProductFilter(prod);
                  if (stageFilter !== 'All' && prod !== 'All') {
                    const stages = getStagesForProduct(prod);
                    if (!stages.includes(stageFilter)) {
                      setStageFilter('All');
                    }
                  }
                }}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="All">All Programs</option>
                {PRODUCTS.map((prod) => (
                  <option key={prod} value={prod}>{prod}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
              >
                <option value="All">All Call Stages</option>
                {(productFilter === 'All'
                  ? Array.from(new Set(Object.values(PRODUCT_STAGE_MAP).flat()))
                  : getStagesForProduct(productFilter)
                ).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#2455E8] animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Loading audit queue...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Recording / Job ID</th>
                  <th className="px-4 py-3">Counsellor</th>
                  <th className="px-4 py-3">Product &amp; Call Stage</th>
                  <th className="px-4 py-3">Duration &amp; Submitted</th>
                  <th className="px-4 py-3">Status &amp; Progress</th>
                  <th className="px-4 py-3 text-right">Score / QA Findings</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => {
                  const isReportReady = job.status === 'Completed' || job.status === 'Needs Review';
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Recording / Job ID */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-mono font-medium text-slate-900 text-xs truncate max-w-[240px]">
                            {job.recordingName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span>{job.id}</span>
                            <span>·</span>
                            <a 
                              href={job.driveUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5"
                            >
                              <span>Drive Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            {job.isSample && (
                              <>
                                <span>·</span>
                                <span className="text-amber-700 font-semibold">[Sample]</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Counsellor */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{job.counsellorName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{job.counsellorEmpId}</div>
                      </td>

                      {/* Product & Call Stage */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium truncate max-w-[170px]">{job.product}</div>
                        {job.stage && (
                          <div className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold truncate max-w-[170px]">
                            {job.stage}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5">{job.language}</div>
                      </td>

                      {/* Duration & Submitted */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-700">{job.duration}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{job.submittedAt}</div>
                      </td>

                      {/* Status & Progress */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1.5 min-w-[130px]">
                          <div>{getStatusBadge(job.status)}</div>
                          {job.status !== 'Completed' && job.status !== 'Failed' && (
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.max(job.progress, 5)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Score / QA Findings */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        {isReportReady && typeof job.score === 'number' ? (
                          <div className="space-y-0.5">
                            <span className={`text-sm font-bold ${
                              job.score >= 80 ? 'text-emerald-700' : job.score >= 65 ? 'text-blue-700' : 'text-amber-700'
                            }`}>
                              {job.score} / 100
                            </span>
                            {job.criticalViolationCount > 0 ? (
                              <div className="text-[11px] font-semibold text-rose-700 flex items-center justify-end gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>{job.criticalViolationCount} Critical</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-emerald-600">0 Critical</div>
                            )}
                          </div>
                        ) : job.status === 'Failed' ? (
                          <span className="text-xs text-rose-600">Error processing audio</span>
                        ) : (
                          <span className="text-xs text-slate-400">Processing...</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        {isReportReady ? (
                          <button
                            onClick={() => onSelectJobForReport(job.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>View Report</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectJobForReport(job.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Inspect Job</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredJobs.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            
            {isCounsellor ? (
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">No Permitted Call Audits Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You currently have no call recordings submitted or assigned for QA evaluation. Once your calls are ingested and scored by QA auditors, your scorecards, transcript insights, and personalized coaching recommendations will be accessible here.
                </p>
                <div className="pt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => onNavigate('knowledge-base')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    View Approved Guidelines &amp; Scripts
                  </button>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">No Calls in the Audit Queue</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The audit queue processes Google Drive call recordings against NxtWave knowledge base rubrics. Submit your first counselling recording to begin speech QA.
                </p>
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
                  {(isAdmin || isAuditor) && (
                    <button
                      onClick={() => onNavigate('new-audit')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] rounded-lg transition-colors shadow-xs cursor-pointer w-full sm:w-auto"
                    >
                      + Submit New Recording
                    </button>
                  )}
                  {isAdmin && onSeedSampleJobs && (
                    <button
                      onClick={handleSeed}
                      disabled={isSeeding}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5"
                    >
                      {isSeeding ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <FolderOpen className="w-4 h-4 text-slate-600" />}
                      <span>Load Sample Test Queue</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-slate-800">No jobs match filters</h3>
                <p className="text-xs text-slate-500">
                  Try clearing search query or selecting "All Jobs".
                </p>
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setProductFilter('All');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
