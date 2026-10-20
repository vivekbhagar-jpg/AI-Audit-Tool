/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth, isEmbeddedInIframe, DEMO_USER_PRESETS, DemoUserRole } from '../../contexts/AuthContext';
import { 
  RefreshCw, 
  AlertTriangle, 
  X, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface LoginViewProps {
  onEnterDemoMode?: () => void;
}

const NXTWAVE_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/nxtwave-audit-platform.firebasestorage.app/o/NXT%20WAVE%E2%84%A2%20Geometric%20Blue%20Logo.png?alt=media&token=d070f55a-8c3b-463b-a87d-1be157faf3d7';

export const LoginView: React.FC<LoginViewProps> = ({ onEnterDemoMode }) => {
  const { 
    signInWithGoogle, 
    signInAsDemoUser,
    isSigningIn, 
    error, 
    authErrorDetails, 
    clearError, 
    openStandaloneTab 
  } = useAuth();
  
  const inIframe = isEmbeddedInIframe();
  const isSuspendedOrOffline = 
    authErrorDetails?.code === 'auth/permission-denied' ||
    Boolean(authErrorDetails?.message && (
      authErrorDetails.message.includes('suspended') ||
      authErrorDetails.message.includes('has-been-suspended') ||
      authErrorDetails.message.includes('api-key')
    ));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#2455E8] selection:text-white">
      {/* Central Login Card */}
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgb(0,0,0,0.06)] text-center">
        {/* Official NxtWave Logo */}
        <div className="flex justify-center items-center">
          <img
            src={NXTWAVE_LOGO_URL}
            alt="NxtWave Logo"
            className="h-10 sm:h-12 w-auto object-contain mx-auto"
            loading="eager"
          />
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-5">
          AI Audit Platform
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Admissions Quality, Script Verification &amp; Compliance Assurance
        </p>

        {/* Error Notification Banner */}
        {error && (
          <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-2 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{authErrorDetails?.title || 'Authentication Notice'}</span>
              </div>
              <button 
                onClick={clearError}
                className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              {authErrorDetails?.message || error}
            </p>
            {authErrorDetails?.suggestedAction && (
              <p className="text-[11px] text-rose-800 font-medium pt-1.5 border-t border-rose-200/70">
                {authErrorDetails.suggestedAction}
              </p>
            )}

            {/* Quick 1-Click bypass button directly in error banner */}
            {isSuspendedOrOffline && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => signInAsDemoUser('admin')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                  <span>Enter as Super Admin (Vivek Bhagar)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Primary Google Sign-in */}
        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => signInWithGoogle()}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium text-sm text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] transition-colors shadow-sm hover:shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Google G Logo */}
                <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400">
            Sign in with your authorized NxtWave workspace Google account.
          </p>
        </div>

        {/* Standalone Tab Helper if running in iframe */}
        {inIframe && (
          <div className="mt-3 text-center">
            <button
              onClick={openStandaloneTab}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Running in iframe? Open login in a new window</span>
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
            <span className="bg-white px-3 text-slate-400 font-semibold">
              Fast Sandbox Demo Access
            </span>
          </div>
        </div>

        {/* Role Presets Cards */}
        <div className="space-y-2 text-left">
          <p className="text-[11px] text-slate-500 mb-2 font-medium text-center">
            Instantly test the platform under any staff role:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(DEMO_USER_PRESETS) as DemoUserRole[]).map((roleKey) => {
              const preset = DEMO_USER_PRESETS[roleKey];
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => signInAsDemoUser(roleKey)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    roleKey === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : roleKey === 'auditor'
                      ? 'bg-blue-100 text-blue-800'
                      : roleKey === 'lead'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {preset.avatarLetter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {preset.displayName.split(' (')[0]}
                      </span>
                      <span className={`text-[9px] font-mono uppercase px-1 py-0.5 rounded font-bold border ${preset.badgeClass}`}>
                        {preset.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      {preset.email}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Simple Demo Mode Link */}
        {onEnterDemoMode && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={onEnterDemoMode}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Explore Preview Demonstration Mode without sign-in</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
