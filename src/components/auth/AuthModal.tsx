/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, X } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authErrorDetails, clearError } = useAuth();

  if (!authErrorDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b flex items-center justify-between bg-rose-50 border-rose-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100 text-rose-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{authErrorDetails.title || 'Authentication Notice'}</h3>
              <p className="text-[11px] text-slate-500 font-mono">Code: {authErrorDetails.code}</p>
            </div>
          </div>
          <button 
            onClick={clearError}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            {authErrorDetails.message}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={clearError}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
