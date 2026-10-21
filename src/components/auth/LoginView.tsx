/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle, 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  RefreshCw, 
  KeyRound,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface LoginViewProps {
  onEnterDemoMode?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onEnterDemoMode }) => {
  const { 
    login, 
    setupAdmin, 
    adminConfigured, 
    isSigningIn, 
    error, 
    clearError 
  } = useAuth();

  const [email, setEmail] = useState('vivekbhagar@gmail.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localValidation, setLocalValidation] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);

    if (!email.trim()) {
      setLocalValidation('Email address is required.');
      return;
    }
    if (!password) {
      setLocalValidation('Password is required.');
      return;
    }

    await login(email.trim(), password);
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);

    if (!password || password.length < 8) {
      setLocalValidation('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalValidation('Passwords do not match. Please re-enter.');
      return;
    }

    await setupAdmin(password, email.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#2455E8] selection:text-white">
      {/* Central Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_12px_40px_rgb(0,0,0,0.06)] text-center">
        {/* NxtWave Official Logo */}
        <div className="flex justify-center items-center">
          <img
            src="/nxtwave-logo.png"
            alt="NxtWave Logo"
            className="h-10 sm:h-12 w-auto object-contain mx-auto"
            loading="eager"
          />
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-4">
          AI Audit Platform
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Admissions Quality, Script Verification &amp; Compliance Assurance
        </p>

        {/* Error Notification Banner */}
        {(error || localValidation) && (
          <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left space-y-1.5 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Authentication Notice</span>
              </div>
              <button 
                onClick={() => {
                  clearError();
                  setLocalValidation(null);
                }}
                className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              {localValidation || error}
            </p>
          </div>
        )}

        {/* Form Container */}
        <div className="mt-6 text-left">
          {!adminConfigured ? (
            /* First-Time Administrator Bootstrap Flow */
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-purple-900">
                  <KeyRound className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Initial Super Admin Setup</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  No default passwords exist in source code. Please initialize your secure administrator password for <strong className="font-mono">{email}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2455E8]/30 focus:border-[#2455E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Admin Password (min. 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Enter secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2455E8]/30 focus:border-[#2455E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2455E8]/30 focus:border-[#2455E8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Configuring Admin Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Set Password &amp; Initialize Platform</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Regular Credentials Sign In */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="you@nxtwave.tech"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2455E8]/30 focus:border-[#2455E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2455E8]/30 focus:border-[#2455E8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2455E8] hover:bg-[#1D46C2] active:bg-[#1638A0] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In with Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security Assurance Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local SQLite Storage &bull; Bcrypt Passwords &bull; HTTP-Only Sessions</span>
        </div>
      </div>
    </div>
  );
};
