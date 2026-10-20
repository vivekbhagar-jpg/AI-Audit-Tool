/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth, PRIMARY_ADMIN_EMAIL } from '../../contexts/AuthContext';
import { 
  ShieldAlert, 
  LogOut, 
  RefreshCw, 
  User, 
  Lock, 
  Mail, 
  ExternalLink 
} from 'lucide-react';

const NXTWAVE_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/nxtwave-audit-platform.firebasestorage.app/o/NXT%20WAVE%E2%84%A2%20Geometric%20Blue%20Logo.png?alt=media&token=d070f55a-8c3b-463b-a87d-1be157faf3d7';

export const UnauthorizedView: React.FC = () => {
  const { user, roleError, signOutUser } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#2455E8] selection:text-white">
      <div className="max-w-xl w-full bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-6 text-center">
        {/* Official NxtWave Logo */}
        <div className="flex justify-center items-center">
          <img
            src={NXTWAVE_LOGO_URL}
            alt="NxtWave Logo"
            className="h-10 sm:h-12 w-auto object-contain mx-auto"
            loading="eager"
          />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200 inline-block mb-2">
            Authorization Verification Required
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Account Role Pending Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your Google account is signed in, but your role in the NxtWave directory is awaiting assignment.
          </p>
        </div>

        {/* Current credentials box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Session Identity</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
              UNASSIGNED ROLE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">ACCOUNT EMAIL</span>
              <span className="text-slate-800 font-medium truncate block">{user?.email || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">USER UID</span>
              <span className="text-slate-600 truncate block">{user?.uid || 'Unknown'}</span>
            </div>
          </div>

          {roleError && (
            <div className="pt-2 border-t border-slate-200 text-[11px] text-rose-700">
              <strong>Detail:</strong> {roleError}
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-blue-900 text-left text-xs">
          <span className="font-semibold block flex items-center gap-1.5 text-blue-950">
            <Lock className="w-3.5 h-3.5 text-[#2455E8]" />
            <span>Enterprise Access Control</span>
          </span>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Roles (<code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">admin</code>, <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">lead</code>, <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">auditor</code>, <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-900">counsellor</code>) are provisioned through backend administrator controls.
          </p>
          <p className="text-[11px] text-blue-800 leading-relaxed pt-1">
            Contact administrator at <strong className="font-mono text-slate-900">{PRIMARY_ADMIN_EMAIL}</strong> to activate your permissions.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>Retry Verification</span>
          </button>

          <button
            onClick={() => signOutUser()}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
