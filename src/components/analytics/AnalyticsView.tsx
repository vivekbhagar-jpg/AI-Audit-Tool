/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuditJob, CounsellorSummary } from '../../types';
import { 
  COUNSELLOR_SUMMARIES as SAMPLE_COUNSELLOR_SUMMARIES, 
  TEAM_ANALYTICS as SAMPLE_TEAM_ANALYTICS, 
  COMMON_AUDIT_FAILURES as SAMPLE_COMMON_FAILURES, 
  SCORE_TREND_WEEKS as SAMPLE_SCORE_TRENDS 
} from '../../data/sampleData';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Award, 
  Flame, 
  ShieldCheck, 
  SlidersHorizontal,
  Calendar,
  Layers
} from 'lucide-react';
import { getAllAuditReports } from '../../services/reportService';
import { 
  PRODUCTS, 
  PRODUCT_STAGE_MAP, 
  getStagesForProduct, 
  matchesProduct, 
  matchesStage 
} from '../../config/callStages';

interface AnalyticsViewProps {
  jobs?: AuditJob[];
  isDemoMode?: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  jobs = [],
  isDemoMode = false,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [sortField, setSortField] = useState<'averageScore' | 'auditsCount' | 'violationRate'>('averageScore');
  const [showDemoPreview, setShowDemoPreview] = useState<boolean>(isDemoMode);

  const completedJobs = jobs.filter(
    (j) => (j.status === 'Completed' || j.status === 'Needs Review') && 
           typeof j.score === 'number' &&
           matchesProduct(j.product, selectedProduct) &&
           matchesStage(j.stage, selectedStage)
  );

  // Compute dynamic counsellor summaries from real jobs
  const dynamicCounsellors: CounsellorSummary[] = React.useMemo(() => {
    if (completedJobs.length === 0) return [];

    const map = new Map<string, {
      name: string;
      empId: string;
      product: string;
      scores: number[];
      criticalCount: number;
    }>();

    completedJobs.forEach((job) => {
      const key = job.counsellorEmpId || job.counsellorName;
      if (!map.has(key)) {
        map.set(key, {
          name: job.counsellorName,
          empId: job.counsellorEmpId,
          product: job.product,
          scores: [],
          criticalCount: 0,
        });
      }
      const entry = map.get(key)!;
      if (typeof job.score === 'number') {
        entry.scores.push(job.score);
      }
      entry.criticalCount += job.criticalViolationCount || 0;
    });

    return Array.from(map.entries()).map(([key, val], idx) => {
      const avg = Math.round((val.scores.reduce((a, b) => a + b, 0) / val.scores.length) * 10) / 10;
      const violationRate = Math.round((val.criticalCount / val.scores.length) * 100);
      let status: CounsellorSummary['status'] = 'Compliant';
      if (avg >= 85 && val.criticalCount === 0) status = 'Top Performer';
      else if (avg < 70 || val.criticalCount > 0) status = 'Under Review';

      return {
        id: `counsellor-${idx + 1}`,
        name: val.name,
        empId: val.empId,
        team: `${val.product} Squad`,
        auditsCount: val.scores.length,
        averageScore: avg,
        violationRate,
        status,
        streakWeeks: 2,
      };
    });
  }, [completedJobs]);

  const hasRealData = dynamicCounsellors.length > 0;
  const isShowingDemo = showDemoPreview || !hasRealData;

  const counsellorsToDisplay = isShowingDemo ? SAMPLE_COUNSELLOR_SUMMARIES : dynamicCounsellors;
  const commonFailuresToDisplay = SAMPLE_COMMON_FAILURES;
  const scoreTrendsToDisplay = SAMPLE_SCORE_TRENDS;

  const filteredCounsellors = counsellorsToDisplay
    .filter(c => selectedTeam === 'All' || c.team.includes(selectedTeam))
    .sort((a, b) => {
      if (sortField === 'averageScore') return b.averageScore - a.averageScore;
      if (sortField === 'auditsCount') return b.auditsCount - a.auditsCount;
      return a.violationRate - b.violationRate;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quality &amp; Compliance Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aggregated audit performance benchmarks, trends, and common script deviations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
              <option value="All">All Programs</option>
              {PRODUCTS.map((prod) => (
                <option key={prod} value={prod}>{prod}</option>
              ))}
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
              {(selectedProduct === 'All'
                ? Array.from(new Set(Object.values(PRODUCT_STAGE_MAP).flat()))
                : getStagesForProduct(selectedProduct)
              ).map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Counselling Teams</option>
              <option value="Hyderabad">Team Alpha (Hyderabad)</option>
              <option value="Bengaluru">Team Beta (Bengaluru)</option>
              <option value="Delhi">Team Delta (Delhi NCR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 1: Weekly Score Trend & Common Failure Root Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend Trajectory */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Quality Score Trajectory</h2>
              <p className="text-xs text-slate-500">Weekly average quality score across audited calls</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isShowingDemo ? '+8.1 pts over 6 weeks' : `${completedJobs.length} audited`}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {scoreTrendsToDisplay.map((w) => (
              <div key={w.week} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{w.week}</span>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-500">{w.audits} calls</span>
                    <span className="font-bold text-slate-900">{w.avgScore} / 100</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${w.avgScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common Audit Failures Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Common Audit Failures (Pareto Distribution)</h2>
            <p className="text-xs text-slate-500">Most frequent non-compliance findings in speech QA</p>
          </div>

          <div className="space-y-3 pt-1">
            {commonFailuresToDisplay.map((f) => (
              <div key={f.issue} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 max-w-[70%]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      f.severity === 'Critical' ? 'bg-rose-600' : f.severity === 'High' ? 'bg-amber-500' : 'bg-slate-400'
                    }`} />
                    <span className="font-medium text-slate-800 truncate">{f.issue}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                    {f.count} calls ({f.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      f.severity === 'Critical' ? 'bg-rose-600' : f.severity === 'High' ? 'bg-amber-500' : 'bg-slate-500'
                    }`}
                    style={{ width: `${f.percentage * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            Audit finding: Over 60% of critical failures stem from placement guarantee oversell and unauthorized discounting.
          </div>
        </div>
      </div>

      {/* Row 2: Team Performance Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Team Quality Benchmarks</h2>
          <p className="text-xs text-slate-500">Cross-team adherence and critical violation rates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_TEAM_ANALYTICS.map((t) => (
            <div key={t.team} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">{t.team}</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                  {t.avgScore} / 100
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Audits This Month:</span>
                  <span className="font-mono font-semibold text-slate-800">{t.auditsThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auditors:</span>
                  <span className="font-mono text-slate-700">{t.auditorsCount} active</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Flags:</span>
                  <span className={`font-mono font-semibold ${t.criticalViolations > 5 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {t.criticalViolations}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Counsellor Performance Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Counsellor Compliance Leaderboard</h2>
            <p className="text-xs text-slate-500">Individual performance metrics and coaching flags</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setSortField('averageScore')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  sortField === 'averageScore' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Avg Score
              </button>
              <button
                onClick={() => setSortField('auditsCount')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  sortField === 'auditsCount' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Audits Count
              </button>
              <button
                onClick={() => setSortField('violationRate')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  sortField === 'violationRate' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Violation Rate
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Counsellor</th>
                <th className="px-4 py-3">Team / Program</th>
                <th className="px-4 py-3 text-center">Audits Count</th>
                <th className="px-4 py-3 text-right">Average Score</th>
                <th className="px-4 py-3 text-right">Violation Rate</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCounsellors.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{c.empId}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{c.team}</td>
                  <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700">
                    {c.auditsCount}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold">
                    <span className={c.averageScore >= 80 ? 'text-emerald-700' : c.averageScore >= 70 ? 'text-blue-700' : 'text-amber-700'}>
                      {c.averageScore}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                    <span className={c.violationRate > 5 ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                      {c.violationRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      c.status === 'Top Performer' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : c.status === 'Compliant'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
