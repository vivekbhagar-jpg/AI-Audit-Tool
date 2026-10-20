/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavScreen } from '../../types';
import { useAuth, PRIMARY_ADMIN_EMAIL } from '../../contexts/AuthContext';
import { ShieldAlert, ArrowRight, User, Lock, ListFilter, FileCheck2 } from 'lucide-react';

interface AccessRestrictedProps {
  attemptedScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
}

const SCREEN_TITLES: Record<NavScreen, string> = {
  'dashboard': 'Executive QA Dashboard',
  'knowledge-base': 'Knowledge Base Policy Management',
  'new-audit': 'New Recording Ingestion',
  'audit-queue': 'Audit Queue',
  'audit-reports': 'Audit Reports & Feedback',
  'analytics': 'Compliance Analytics & Leaderboard',
  'settings': 'Platform Settings & Configuration',
};

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  attemptedScreen,
  onNavigate,
}) => {
  const { user, userProfile, role } = useAuth();
  const screenTitle = SCREEN_TITLES[attemptedScreen] || attemptedScreen;

  const requiredRolesText = 
    attemptedScreen === 'settings' 
      ? 'Platform Administrator only'
      : (attemptedScreen === 'new-audit' 
          ? 'Platform Administrator or QA Auditor'
          : 'Platform Administrator or Sales/QA Lead');

  const currentRoleName = (role || userProfile?.role || 'counsellor').toUpperCase();

  return (
    <div className="max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200 inline-block mb-1">
            Access Restricted &bull; {requiredRolesText}
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            {screenTitle}
          </h2>
        </div>
      </div>

      <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
        <p>
          You have navigated to a screen that is restricted under enterprise role-based access control (RBAC). Access to <strong>{screenTitle}</strong> requires the verified role: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-800">{requiredRolesText}</code>.
        </p>

        {/* Current Identity & Role Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <User className="w-4 h-4 text-slate-500" />
            <span>Current Session Credentials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">AUTHENTICATED ACCOUNT</span>
              <span className="text-slate-800 font-medium truncate block">{user?.email || 'Guest / Unauthenticated'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">VERIFIED SYSTEM ROLE</span>
              <span className="text-slate-800 font-semibold capitalize inline-block px-1.5 py-0.5 bg-slate-200 rounded">
                {currentRoleName}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 text-blue-900">
          <span className="font-semibold block flex items-center gap-1.5 text-blue-950">
            <Lock className="w-3.5 h-3.5 text-blue-700" />
            <span>Authorized Workspace Actions</span>
          </span>
          <p className="text-[11px] text-blue-800">
            Based on your assigned role ({currentRoleName}), you can access:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-blue-800">
            <li>Reviewing call audit reports, scorecard ratings, and rubric criteria breakdown.</li>
            <li>Reviewing customized coaching recommendations and approved replacement scripts.</li>
            <li>Tracking queued and processed call recordings in your assigned audit queue.</li>
            <li>Accessing approved narrative scripts and pricing matrices in the Knowledge Base (read-only reference).</li>
          </ul>
        </div>
      </div>

      {/* Navigation actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onNavigate('audit-reports')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <FileCheck2 className="w-4 h-4 text-blue-100" />
          <span>Go to Audit Reports</span>
        </button>

        <button
          onClick={() => onNavigate('audit-queue')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
        >
          <ListFilter className="w-4 h-4 text-slate-500" />
          <span>Go to Audit Queue</span>
        </button>
      </div>
    </div>
  );
};
