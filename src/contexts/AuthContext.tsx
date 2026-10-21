/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Authentication & RBAC Context for NxtWave AI Audit Platform
 * Connects to local Node.js/Express + SQLite backend (/api/auth) with secure
 * HTTP-only cookie sessions, bcrypt verification, and CSRF protection.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export const PRIMARY_ADMIN_EMAIL = 'vivekbhagar@gmail.com';
export const PRIMARY_ADMIN_UID = 'usr-admin-vb';

export type AppUserRole = 'admin' | 'lead' | 'auditor' | 'counsellor';

export function normalizeRole(role?: string | null): AppUserRole {
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
  role: AppUserRole;
  team: string;
}

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
}

interface AuthContextType {
  user: AppUserProfile | null;
  userProfile: AppUserProfile | null;
  role: AppUserRole | null;
  isRoleVerified: boolean;
  isAdmin: boolean;
  isLead: boolean;
  isAuditor: boolean;
  isCounsellor: boolean;
  loading: boolean;
  isSigningIn: boolean;
  error: string | null;
  authErrorDetails: AuthErrorInfo | null;
  isConfigured: boolean;
  adminConfigured: boolean;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setupAdmin: (password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
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
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [isRoleVerified, setIsRoleVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<AuthErrorInfo | null>(null);
  const [adminConfigured, setAdminConfigured] = useState<boolean>(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Check setup status (whether an admin password has been initialized)
  const checkSetupStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/setup-status');
      if (res.ok) {
        const data = await res.json();
        setAdminConfigured(Boolean(data.adminConfigured));
      }
    } catch {
      // Ignored
    }
  }, []);

  // Initial session check against local backend
  const refreshSession = useCallback(async () => {
    try {
      await checkSetupStatus();
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.userProfile) {
          const profile: AppUserProfile = {
            uid: data.userProfile.uid || data.userProfile.id,
            email: data.userProfile.email,
            displayName: data.userProfile.displayName || data.userProfile.display_name,
            role: normalizeRole(data.userProfile.role),
            team: data.userProfile.team,
          };
          setUserProfile(profile);
          setRole(profile.role);
          setIsRoleVerified(true);
          setCsrfToken(data.csrfToken || null);
          setError(null);
          setAuthErrorDetails(null);
          return;
        }
      }
      // No active session
      setUserProfile(null);
      setRole(null);
      setIsRoleVerified(false);
      setCsrfToken(null);
    } catch (err: any) {
      console.warn('[AuthContext] Session verification note:', err);
      setUserProfile(null);
      setRole(null);
      setIsRoleVerified(false);
    } finally {
      setLoading(false);
    }
  }, [checkSetupStatus]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsSigningIn(true);
    setError(null);
    setAuthErrorDetails(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.error || 'Invalid email or password.';
        setError(errMsg);
        setAuthErrorDetails({
          code: 'AUTH_FAILED',
          title: 'Sign In Failed',
          message: errMsg,
        });
        return { success: false, error: errMsg };
      }

      if (data.userProfile) {
        const profile: AppUserProfile = {
          uid: data.userProfile.uid,
          email: data.userProfile.email,
          displayName: data.userProfile.displayName,
          role: normalizeRole(data.userProfile.role),
          team: data.userProfile.team,
        };
        setUserProfile(profile);
        setRole(profile.role);
        setIsRoleVerified(true);
        setCsrfToken(data.csrfToken || null);
        return { success: true };
      }

      return { success: false, error: 'User profile not received.' };
    } catch (err: any) {
      const msg = err?.message || 'Network error during authentication.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  const setupAdmin = async (password: string, email?: string): Promise<{ success: boolean; error?: string }> => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email })
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error || 'Failed to initialize administrator password.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      setAdminConfigured(true);
      if (data.userProfile) {
        const profile: AppUserProfile = {
          uid: data.userProfile.uid,
          email: data.userProfile.email,
          displayName: data.userProfile.displayName,
          role: 'admin',
          team: data.userProfile.team,
        };
        setUserProfile(profile);
        setRole('admin');
        setIsRoleVerified(true);
        setCsrfToken(data.csrfToken || null);
        return { success: true };
      }
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error configuring administrator password.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    setAuthErrorDetails(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
    setUserProfile(null);
    setRole(null);
    setIsRoleVerified(false);
    setCsrfToken(null);
  };

  const clearError = () => {
    setError(null);
    setAuthErrorDetails(null);
  };

  const value: AuthContextType = {
    user: userProfile,
    userProfile,
    role,
    isRoleVerified,
    isAdmin: role === 'admin',
    isLead: role === 'lead' || role === 'admin',
    isAuditor: role === 'auditor' || role === 'admin',
    isCounsellor: role === 'counsellor' || role === 'admin' || role === 'lead',
    loading,
    isSigningIn,
    error,
    authErrorDetails,
    isConfigured: true,
    adminConfigured,
    csrfToken,
    login,
    setupAdmin,
    signOutUser,
    clearError,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
