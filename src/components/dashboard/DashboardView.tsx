/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditJob, NavScreen } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  ArrowUpRight, 
  ChevronRight, 
  BookOpen, 
  ShieldAlert,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PRODUCTS, 
  getStagesForProduct, 
  matchesProduct, 
  matchesStage 
} from '../../config/callStages';

interface DashboardViewProps {
  jobs: AuditJob[];
  isDemoMode?: boolean;
  onNavigate: (screen: NavScreen) => void;
  onSelectJobForReport: (jobId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  isDemoMode = false,
  onNavigate,
  onSelectJobForReport
}) => {
  const { isConfigured } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<string>('Intensive');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');

  // Filter jobs based on selected product and call stage with mapping to existing/legacy audit records
  const filteredJobs = jobs.filter((j) => {
    if (!j.product) return false;
    const matchesProd = matchesProduct(j.product, selectedProduct);
    const matchesStg = matchesStage(j.stage, selectedStage);
    return matchesProd && matchesStg;
  });
  const completedJobs = filteredJobs.filter(j => (j.status === 'Completed' || j.status === 'Needs Review') && typeof j.score === 'number');
  const pendingJobs = filteredJobs.filter(j => j.status === 'Queued' || j.status === 'Transcribing' || j.status === 'Auditing');
  
  const hasCompletedJobs = completedJobs.length > 0;
  const avgScore = hasCompletedJobs
    ? Math.round((completedJobs.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedJobs.length) * 10) / 10
    : null;
  
  const criticalViolations = filteredJobs.reduce((acc, curr) => acc + (curr.criticalViolationCount || 0), 0);

  // Dynamic Tier Distribution
  const exemplaryCount = completedJobs.filter(j => (j.score || 0) >= 90).length;
  const compliantCount = completedJobs.filter(j => (j.score || 0) >= 75 && (j.score || 0) < 90).length;
  const coachingCount = completedJobs.filter(j => (j.score || 0) >= 60 && (j.score || 0) < 75).length;
  const criticalCount = completedJobs.filter(j => (j.score || 0) < 60 || j.criticalViolationCount > 0).length;

  const totalScored = completedJobs.length;
  const exemplaryPct = totalScored > 0 ? Math.round((exemplaryCount / totalScored) * 100) : 0;
  const compliantPct = totalScored > 0 ? Math.round((compliantCount / totalScored) * 100) : 0;
  const coachingPct = totalScored > 0 ? Math.round((coachingCount / totalScored) * 100) : 0;
  const criticalPct = totalScored > 0 ? Math.round((criticalCount / totalScored) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Quality Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time quality intelligence across NxtWave tech career counselling calls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Product Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => {
                const prod = e.target.value;
                setSelectedProduct(prod);
                if (selectedStage !== 'All' && prod !== 'All') {
                  const stages = getStagesForProduct(prod);
                  if (!stages.includes(selectedStage)) {
                    setSelectedStage('All');
                  }
                }
              }}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="Intensive">Intensive</option>
              <option value="Academy">Academy</option>
              <option value="NIAT">NIAT</option>
              <option value="IIT KGP OCN">IIT KGP OCN</option>
              <option value="NIAT - Academy">NIAT - Academy</option>
            </select>
          </div>

          {/* Call Stage Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Call Stages</option>
              {getStagesForProduct(selectedProduct).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Time Filter Segmented Control */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setSelectedTimeRange('today')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedTimeRange === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedTimeRange === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedTimeRange === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={() => onNavigate('new-audit')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-100" />
            <span>Audit Call</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls Audited */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Calls Audited</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {completedJobs.length}
            </span>
            {hasCompletedJobs && (
              <span className="text-xs text-emerald-600 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Active
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {hasCompletedJobs ? `Audited across ${new Set(completedJobs.map(j => j.product)).size} product tracks` : 'Awaiting completed audits in queue'}
          </div>
        </div>

        {/* Pending Audits */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Audits in Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {pendingJobs.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              in queue pipeline
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {pendingJobs.length > 0 ? 'Ready for speech transcription' : 'Queue is currently clear'}
          </div>
        </div>

        {/* Average Audit Score */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Average Quality Score</span>
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {avgScore !== null ? avgScore : '—'}
            </span>
            {avgScore !== null && <span className="text-xs text-slate-400 font-medium">/ 100</span>}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {hasCompletedJobs ? 'Target benchmark: 80.0 minimum' : 'Calculated upon first completed audit'}
          </div>
        </div>

        {/* Critical Violations */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Critical Violations</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${criticalViolations > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {criticalViolations}
            </span>
            {totalScored > 0 && (
              <span className="text-xs text-rose-600 font-medium">
                {Math.round((criticalViolations / totalScored) * 100)}% violation rate
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {criticalViolations === 0 ? 'Zero critical compliance flags' : 'Requires auditor sign-off review'}
          </div>
        </div>
      </div>

      {/* Main Grid: Activity Feed & Scoring Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Audit Activity */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Audit Activity</h2>
              <p className="text-xs text-slate-500">
                Latest recordings scored across Hinglish &amp; Indian dialect streams.
              </p>
            </div>
            <button
              onClick={() => onNavigate('audit-queue')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({jobs.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {jobs.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {jobs.slice(0, 6).map((job) => (
                <div 
                  key={job.id} 
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {job.counsellorName}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">({job.counsellorEmpId})</span>
                      <span className="text-xs text-slate-500">{job.product}</span>
                      {job.stage && (
                        <>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {job.stage}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="truncate max-w-[220px] font-mono text-[11px] text-slate-600">
                        {job.recordingName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{job.language}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status / Score display */}
                    {job.score !== undefined ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-base font-bold font-mono tabular-nums ${
                            job.score >= 85 ? 'text-emerald-700' : job.score >= 70 ? 'text-blue-700' : 'text-amber-700'
                          }`}>
                            {job.score}/100
                          </span>
                          {job.criticalViolationCount > 0 && (
                            <span title="Critical Policy Violation Flagged" className="inline-flex text-rose-600">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {job.status}
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-medium text-blue-600 block">
                          {job.status} ({job.progress}%)
                        </span>
                        <span className="text-[10px] text-slate-400">Audio processing</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (job.status === 'Completed' || job.status === 'Needs Review') {
                          onSelectJobForReport(job.id);
                        } else {
                          onNavigate('audit-queue');
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="View details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">No calls submitted to the queue yet</p>
              <p className="text-[11px] text-slate-500">Enqueue a counselling call recording from Google Drive to view activity here.</p>
              <button
                onClick={() => onNavigate('new-audit')}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                + Audit Call
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quality Breakdown & Alert Summaries */}
        <div className="space-y-6">
          {/* Quality Distribution Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Score Distribution</h3>
              <p className="text-xs text-slate-500">Tier classification of audited calls this cycle</p>
            </div>

            {hasCompletedJobs ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Exemplary (&gt;= 90 pts)</span>
                    <span className="font-mono text-slate-500 tabular-nums">{exemplaryPct}% ({exemplaryCount})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${exemplaryPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Compliant (75 - 89 pts)</span>
                    <span className="font-mono text-slate-500 tabular-nums">{compliantPct}% ({compliantCount})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${compliantPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Needs Coaching (60 - 74 pts)</span>
                    <span className="font-mono text-slate-500 tabular-nums">{coachingPct}% ({coachingCount})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${coachingPct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Critical (&lt; 60 pts)</span>
                    <span className="font-mono text-slate-500 tabular-nums">{criticalPct}% ({criticalCount})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-600 h-full rounded-full transition-all" style={{ width: `${criticalPct}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-1.5 border border-dashed border-slate-200 rounded-xl">
                <Flame className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">No completed audits yet</p>
                <p className="text-[11px] text-slate-400">Score distribution tiers will compute dynamically from completed calls.</p>
              </div>
            )}
          </div>

          {/* Quick Knowledge Base Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Knowledge Base Status</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Approved policy documents, pricing matrices, and sales scripts are actively referenced during speech QA audits.
            </p>
            <button
              onClick={() => onNavigate('knowledge-base')}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer text-center block"
            >
              Open Approved Knowledge Base →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
