import React, { useState } from 'react';
import { NavScreen } from '../../types';
import { useAuth, isEmbeddedInIframe, DEMO_USER_PRESETS, DemoUserRole } from '../../contexts/AuthContext';
import { 
  PlusCircle, 
  LogIn, 
  LogOut, 
  RefreshCw,
  ExternalLink,
  Users
} from 'lucide-react';

interface NavbarProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  pendingQueueCount: number;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
}

export const NXTWAVE_LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/nxtwave-audit-platform.firebasestorage.app/o/NXT%20WAVE%E2%84%A2%20Geometric%20Blue%20Logo.png?alt=media&token=d070f55a-8c3b-463b-a87d-1be157faf3d7';

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  pendingQueueCount,
  isDemoMode = false,
  onToggleDemoMode
}) => {
  const { 
    user, 
    userProfile, 
    isAdmin,
    isLead,
    isAuditor,
    isCounsellor,
    isConfigured, 
    isDemoUser,
    signInWithGoogle, 
    signInAsDemoUser,
    signOutUser, 
    loading, 
    isSigningIn, 
    openStandaloneTab 
  } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const inIframe = isEmbeddedInIframe();

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 bg-white border-b border-slate-200/90 shrink-0 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left: Official NxtWave Logo + AI Audit Platform Title */}
      <div 
        onClick={() => onNavigate(isAdmin ? 'dashboard' : 'audit-queue')}
        className="flex items-center gap-3 cursor-pointer select-none shrink-0"
        title="NxtWave AI Audit Platform"
      >
        <img
          src={NXTWAVE_LOGO_URL}
          alt="NxtWave Logo"
          className="h-7 sm:h-8 w-auto object-contain shrink-0"
          loading="eager"
        />
        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-slate-900 leading-tight whitespace-nowrap">
            AI Audit Platform
          </span>
          <span className="text-[10px] text-slate-400 font-medium leading-none hidden sm:block mt-0.5">
            Admissions Quality &amp; Compliance
          </span>
        </div>
      </div>

      {/* Zone 3: Actions & User Account */}
      <div className="flex items-center gap-3 shrink-0">
        {(isAdmin || isAuditor) && (
          <button
            onClick={() => onNavigate('new-audit')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-100" />
            <span>New Audit</span>
          </button>
        )}

        {/* User Auth Section */}
        <div className="relative pl-2 border-l border-slate-200">
          {user ? (
            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title="Click to view account and role details"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono leading-tight">
                    {user.email}
                  </span>
                </div>
                <span className={`hidden md:inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                  isAdmin 
                    ? 'bg-purple-100 text-purple-800 border-purple-200' 
                    : isLead
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : isAuditor
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {userProfile?.role || 'counsellor'}
                </span>
              </div>

              <button
                onClick={() => signOutUser()}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Sign out of Google Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          ) : isConfigured ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => signInWithGoogle()}
                disabled={loading || isSigningIn}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
              {inIframe && (
                <button
                  onClick={openStandaloneTab}
                  className="hidden md:flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Open app in new tab to sign in without iframe restrictions"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-[11px]">New Tab</span>
                </button>
              )}
            </div>
          ) : (
            <div 
              onClick={() => onNavigate('settings')} 
              className="flex items-center gap-2 cursor-pointer"
              title="Demo Mode: Sunita Rao. Configure Firebase in Settings to enable live Google Sign-in."
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200">
                SR
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-900 leading-tight">Sunita Rao</span>
                <span className="text-[10px] text-slate-500 leading-tight">Lead QA Auditor</span>
              </div>
            </div>
          )}

          {/* Profile Dropdown */}
          {showProfileMenu && user && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 truncate">{user.displayName || 'Staff'}</p>
                <p className="text-[11px] text-slate-500 truncate font-mono">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border ${
                    isAdmin ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {isAdmin ? 'ADMINISTRATOR' : (userProfile?.role?.toUpperCase() || 'COUNSELLOR')}
                  </span>
                  {isDemoUser && (
                    <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Sandbox Session
                    </span>
                  )}
                </div>
              </div>

              {/* Fast Role Switcher */}
              <div className="py-2 border-b border-slate-100">
                <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                  Switch Active Role
                </span>
                <div className="space-y-0.5">
                  {(Object.keys(DEMO_USER_PRESETS) as DemoUserRole[]).map((rKey) => {
                    const preset = DEMO_USER_PRESETS[rKey];
                    const isActive = userProfile?.role === rKey || (rKey === 'admin' && isAdmin);
                    return (
                      <button
                        key={rKey}
                        onClick={() => {
                          setShowProfileMenu(false);
                          signInAsDemoUser(rKey);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 text-blue-900 font-semibold' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{preset.displayName.split(' (')[0]}</span>
                        <span className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded border ${preset.badgeClass}`}>
                          {preset.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-md transition-colors font-medium flex items-center justify-between"
                  >
                    <span>Settings &amp; Rules</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    signOutUser();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
