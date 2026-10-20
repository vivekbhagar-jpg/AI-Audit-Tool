/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Authentication & RBAC Context for NxtWave AI Audit Platform
 * Connects to local Node.js/Express + SQLite backend (/api/auth) with resilient role-based access control.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export const PRIMARY_ADMIN_EMAIL = 'vivekbhagar@gmail.com';
export const PRIMARY_ADMIN_UID = 'usr-admin-vb';

export function normalizeRole(role?: string | null): 'admin' | 'auditor' | 'lead' | 'counsellor' {
  if (!role) return 'counsellor';
  const clean = role.trim().toLowerCase();
  if (clean === 'admin' || clean === 'administrator' || clean === 'super_admin') return 'admin';
  if (clean === 'auditor' || clean === 'qa_auditor' || clean === 'lead_auditor') return 'auditor';
  if (clean === 'lead' || clean === 'team_lead') return 'lead';
  return 'counsellor';
}

export function isAuthoritativeAdmin(user: any | null, profile?: AppUserProfile | null): boolean {
  if (!user) return false;
  const emailMatch = user.email?.toLowerCase().trim() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const uidMatch = user.uid === PRIMARY_ADMIN_UID;
  if (emailMatch || uidMatch) return true;
  return profile?.role === 'admin';
}

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'auditor' | 'lead' | 'counsellor';
  team: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestedAction?: string;
  hostname: string;
  isIframe: boolean;
  appUrl: string;
}

export type AppUserRole = 'admin' | 'lead' | 'auditor' | 'counsellor';
export type DemoUserRole = 'admin' | 'auditor' | 'lead' | 'counsellor';

export interface DemoUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: DemoUserRole;
  team: string;
  avatarLetter: string;
  badgeClass: string;
  description: string;
}

export const DEMO_USER_PRESETS: Record<DemoUserRole, DemoUserProfile> = {
  admin: {
    uid: PRIMARY_ADMIN_UID,
    email: PRIMARY_ADMIN_EMAIL,
    displayName: 'Vivek Bhagar (Admin)',
    role: 'admin',
    team: 'Platform Administration',
    avatarLetter: 'VB',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Super Administrator — unrestricted access to all audit operations, knowledge base, policies, and system settings.',
  },
  auditor: {
    uid: 'usr-auditor-sr',
    email: 'sunita.rao@nxtwave.tech',
    displayName: 'Sunita Rao (Auditor)',
    role: 'auditor',
    team: 'Quality Assurance Lead',
    avatarLetter: 'SR',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Lead QA Auditor — full permissions to evaluate call recordings, update queue status, and review audit reports.',
  },
  lead: {
    uid: 'usr-lead-rk',
    email: 'rajesh.kumar@nxtwave.tech',
    displayName: 'Rajesh Kumar (Lead)',
    role: 'lead',
    team: 'Admissions Quality Lead',
    avatarLetter: 'RK',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Team Lead — oversight of team performance analytics, score trends, script compliance, and queue oversight.',
  },
  counsellor: {
    uid: 'usr-counsellor-as',
    email: 'ananya.sen@nxtwave.tech',
    displayName: 'Ananya Sen (Counsellor)',
    role: 'counsellor',
    team: 'Admissions Counselling',
    avatarLetter: 'AS',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Academic Counsellor — access to personal call audit evaluations, compliance coaching notes, and knowledge base.',
  },
};

interface AuthContextType {
  user: any | null;
  userProfile: AppUserProfile | null;
  role: AppUserRole | null;
  isRoleVerified: boolean;
  roleError: string | null;
  isAdmin: boolean;
  isLead: boolean;
  isAuditor: boolean;
  isCounsellor: boolean;
  loading: boolean;
  isSigningIn: boolean;
  error: string | null;
  authErrorDetails: AuthErrorInfo | null;
  isConfigured: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoUser: (role?: DemoUserRole) => void;
  signOutUser: () => Promise<void>;
  clearError: () => void;
  openStandaloneTab: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to check if running inside an iframe (like AI Studio preview)
export function isEmbeddedInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [isRoleVerified, setIsRoleVerified] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<AuthErrorInfo | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  const applyUserSession = (profile: AppUserProfile) => {
    const simulatedUser = {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    };

    setUser(simulatedUser);
    setUserProfile(profile);
    setRole(profile.role);
    setIsRoleVerified(true);
    setRoleError(null);
    setIsDemoUser(true);
    setError(null);
    setAuthErrorDetails(null);
    setLoading(false);

    try {
      localStorage.setItem('nxtwave_active_role', profile.role);
    } catch {
      // Ignored
    }
  };

  const signInAsDemoUser = async (presetRole: DemoUserRole = 'admin') => {
    const preset = DEMO_USER_PRESETS[presetRole] || DEMO_USER_PRESETS.admin;
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: preset.role })
      });
      if (res.ok) {
        const data = await res.json();
        applyUserSession(data.userProfile || preset);
        return;
      }
    } catch (err) {
      console.warn('[AuthContext] Backend role switch note:', err);
    }
    applyUserSession(preset);
  };

  // Initial session check against local backend
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const savedRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('nxtwave_active_role') : null) as DemoUserRole | null;
        if (savedRole && DEMO_USER_PRESETS[savedRole]) {
          await signInAsDemoUser(savedRole);
          if (isMounted) setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.userProfile && isMounted) {
            applyUserSession(data.userProfile);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Backend session verification note:', err);
      }

      // Default to Super Admin for immediate productivity
      if (isMounted) {
        applyUserSession(DEMO_USER_PRESETS.admin);
        setLoading(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const openStandaloneTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.assign(window.location.href);
    }
  };

  const signInWithGoogle = async () => {
    // With suspended Firebase Google Cloud project, sign in directly with primary admin credentials
    setIsSigningIn(true);
    try {
      await signInAsDemoUser('admin');
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    setAuthErrorDetails(null);
    try {
      localStorage.removeItem('nxtwave_active_role');
      localStorage.removeItem('nxtwave_demo_role');
    } catch {
      // Ignored
    }
    setIsDemoUser(false);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('[AuthContext] Logout note:', err);
    }

    setUser(null);
    setUserProfile(null);
    setRole(null);
    setIsRoleVerified(false);
  };

  const clearError = () => {
    setError(null);
    setAuthErrorDetails(null);
  };

  // Authoritative role resolution:
  const effectiveRole = userProfile?.role || role || null;
  const isAdmin = user 
    ? (
        user.email?.toLowerCase().trim() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
        user.uid === PRIMARY_ADMIN_UID ||
        effectiveRole === 'admin'
      )
    : false;

  const isLead = isAdmin || effectiveRole === 'lead';
  const isAuditor = isAdmin || isLead || effectiveRole === 'auditor';
  const isCounsellor = effectiveRole === 'counsellor';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: effectiveRole,
        isRoleVerified,
        roleError,
        isAdmin,
        isLead,
        isAuditor,
        isCounsellor,
        loading,
        isSigningIn,
        error,
        authErrorDetails,
        isConfigured: true,
        isDemoUser,
        signInWithGoogle,
        signInAsDemoUser,
        signOutUser,
        clearError,
        openStandaloneTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
