import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';

export const PRIMARY_ADMIN_EMAIL = 'vivekbhagar@gmail.com';

export function normalizeRole(role?: string | null): 'admin' | 'auditor' | 'lead' | 'counsellor' {
  if (!role) return 'counsellor';
  const clean = role.trim().toLowerCase();
  if (clean === 'admin' || clean === 'administrator' || clean === 'super_admin') return 'admin';
  if (clean === 'auditor' || clean === 'qa_auditor' || clean === 'lead_auditor') return 'auditor';
  if (clean === 'lead' || clean === 'team_lead') return 'lead';
  return 'counsellor';
}

export const PRIMARY_ADMIN_UID = 'D9G89blBpVVvMtd0xkg6LBmmf7o1';

export function isAuthoritativeAdmin(user: FirebaseUser | null, profile?: AppUserProfile | null): boolean {
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
    uid: 'demo-auditor-sunita',
    email: 'sunita.rao@nxtwave.tech',
    displayName: 'Sunita Rao (Auditor)',
    role: 'auditor',
    team: 'Quality Assurance Lead',
    avatarLetter: 'SR',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Lead QA Auditor — full permissions to evaluate call recordings, update queue status, and review audit reports.',
  },
  lead: {
    uid: 'demo-lead-rajesh',
    email: 'rajesh.kumar@nxtwave.tech',
    displayName: 'Rajesh Kumar (Lead)',
    role: 'lead',
    team: 'Admissions Quality Lead',
    avatarLetter: 'RK',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Team Lead — oversight of team performance analytics, score trends, script compliance, and queue oversight.',
  },
  counsellor: {
    uid: 'demo-counsellor-ananya',
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
  user: FirebaseUser | null;
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

// Default mock profile for development when Firebase credentials are not yet entered
const DEFAULT_DEMO_PROFILE: AppUserProfile = {
  uid: 'demo-auditor-sunita',
  email: 'sunita.rao@nxtwave.tech',
  displayName: 'Sunita Rao',
  role: 'auditor',
  team: 'Quality Assurance Lead',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [isRoleVerified, setIsRoleVerified] = useState<boolean>(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authErrorDetails, setAuthErrorDetails] = useState<AuthErrorInfo | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  const applyDemoPreset = (presetRole: DemoUserRole = 'admin') => {
    const preset = DEMO_USER_PRESETS[presetRole] || DEMO_USER_PRESETS.admin;
    const simulatedUser = {
      uid: preset.uid,
      email: preset.email,
      displayName: preset.displayName,
      photoURL: undefined,
      emailVerified: true,
      isAnonymous: false,
    } as unknown as FirebaseUser;

    const profile: AppUserProfile = {
      uid: preset.uid,
      email: preset.email,
      displayName: preset.displayName,
      role: preset.role,
      team: preset.team,
    };

    setUser(simulatedUser);
    setUserProfile(profile);
    setRole(preset.role);
    setIsRoleVerified(true);
    setRoleError(null);
    setIsDemoUser(true);
    setError(null);
    setAuthErrorDetails(null);
    setLoading(false);

    try {
      localStorage.setItem('nxtwave_demo_role', presetRole);
    } catch {
      // Ignored
    }
  };

  const signInAsDemoUser = (presetRole: DemoUserRole = 'admin') => {
    applyDemoPreset(presetRole);
  };

  useEffect(() => {
    // 1. Check if user already opted into a persistent demo role
    try {
      const savedRole = localStorage.getItem('nxtwave_demo_role') as DemoUserRole | null;
      if (savedRole && DEMO_USER_PRESETS[savedRole]) {
        applyDemoPreset(savedRole);
        return;
      }
    } catch {
      // Ignored
    }

    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsDemoUser(false);
        setUser(currentUser);
        setRoleError(null);
        try {
          localStorage.removeItem('nxtwave_demo_role');
        } catch {
          // Ignored
        }

        const isPrimaryAdmin = 
          currentUser.email?.toLowerCase().trim() === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
          currentUser.uid === PRIMARY_ADMIN_UID;

        // Base profile from authenticated Google account
        const baseProfile: AppUserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || (isPrimaryAdmin ? 'Vivek Bhagar (Admin)' : (currentUser.email?.split('@')[0] || 'Staff')),
          photoURL: currentUser.photoURL || undefined,
          role: isPrimaryAdmin ? 'admin' : 'counsellor',
          team: isPrimaryAdmin ? 'Platform Administration' : 'Admissions Quality Team',
        };

        if (db) {
          try {
            if (isPrimaryAdmin) {
              // 1. Authoritative Super Administrator: vivekbhagar@gmail.com / PRIMARY_ADMIN_UID
              const adminDocRef = doc(db, 'admins', currentUser.uid);
              try {
                await setDoc(adminDocRef, {
                  uid: currentUser.uid,
                  email: currentUser.email || PRIMARY_ADMIN_EMAIL,
                  assignedAt: serverTimestamp(),
                  assignedBy: 'system-bootstrap',
                }, { merge: true });
              } catch (adminErr) {
                console.warn('[AuthContext] Admin directory sync note:', adminErr);
              }

              // Sync user profile in /users/{uid} as verified admin
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDocSnap = await getDoc(userDocRef);
              const existingData = userDocSnap.exists() ? userDocSnap.data() : {};

              const adminPayload: Record<string, any> = {
                uid: currentUser.uid,
                email: currentUser.email || PRIMARY_ADMIN_EMAIL,
                displayName: currentUser.displayName || existingData.displayName || 'Vivek Bhagar (Admin)',
                role: 'admin',
                team: 'Platform Administration',
                updatedAt: serverTimestamp(),
              };

              if (currentUser.photoURL) {
                adminPayload.photoURL = currentUser.photoURL;
              }
              if (existingData.createdAt) {
                adminPayload.createdAt = existingData.createdAt;
              } else {
                adminPayload.createdAt = serverTimestamp();
              }

              try {
                await setDoc(userDocRef, adminPayload, { merge: true });
              } catch (userErr) {
                console.warn('[AuthContext] User profile update note:', userErr);
              }

              const resolvedProfile: AppUserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || PRIMARY_ADMIN_EMAIL,
                displayName: adminPayload.displayName,
                photoURL: currentUser.photoURL || undefined,
                role: 'admin',
                team: 'Platform Administration',
              };

              setUserProfile(resolvedProfile);
              setRole('admin');
              setIsRoleVerified(true);
            } else {
              // 2. Standard Staff Account (lead, auditor, counsellor)
              // First verify if account was granted super-admin in /admins/{uid}
              let hasAdminDoc = false;
              try {
                const adminDocSnap = await getDoc(doc(db, 'admins', currentUser.uid));
                hasAdminDoc = adminDocSnap.exists();
              } catch {
                hasAdminDoc = false;
              }

              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                // Ensure users cannot self-assign admin without /admins/{uid}
                let resolvedRole: AppUserRole = 'counsellor';
                if (hasAdminDoc) {
                  resolvedRole = 'admin';
                } else if (data.role === 'admin') {
                  // Role mismatch: in /users as admin but not in /admins -> downgrade for security
                  resolvedRole = 'counsellor';
                } else {
                  resolvedRole = normalizeRole(data.role);
                }

                const verifiedProfile: AppUserProfile = {
                  uid: currentUser.uid,
                  email: currentUser.email || data.email || '',
                  displayName: data.displayName || currentUser.displayName || baseProfile.displayName,
                  photoURL: currentUser.photoURL || data.photoURL || undefined,
                  role: resolvedRole,
                  team: data.team || (resolvedRole === 'lead' ? 'Admissions Quality Leadership' : 'Admissions Quality Team'),
                };

                setUserProfile(verifiedProfile);
                setRole(resolvedRole);
                setIsRoleVerified(true);
              } else {
                // New user self-registration: strictly locked to 'counsellor' by security rules
                const newProfilePayload: Record<string, any> = {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  displayName: currentUser.displayName || (currentUser.email?.split('@')[0] || 'Staff Counsellor'),
                  role: 'counsellor',
                  team: 'Admissions Quality Team',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                };
                if (currentUser.photoURL) {
                  newProfilePayload.photoURL = currentUser.photoURL;
                }

                try {
                  await setDoc(userDocRef, newProfilePayload);
                  const newProfile: AppUserProfile = {
                    uid: currentUser.uid,
                    email: currentUser.email || '',
                    displayName: newProfilePayload.displayName,
                    photoURL: currentUser.photoURL || undefined,
                    role: 'counsellor',
                    team: 'Admissions Quality Team',
                  };
                  setUserProfile(newProfile);
                  setRole('counsellor');
                  setIsRoleVerified(true);
                } catch (createErr: any) {
                  console.error('[AuthContext] Failed to provision default counsellor role:', createErr);
                  setUserProfile(null);
                  setRole(null);
                  setIsRoleVerified(false);
                  setRoleError('Account could not be provisioned in the user registry. Please contact an administrator.');
                }
              }
            }
          } catch (err: any) {
            console.warn('[AuthContext] Profile verification error:', err);
            // If role cannot be verified from database, do not grant unverified elevated access
            setUserProfile(null);
            setRole(null);
            setIsRoleVerified(false);
            setRoleError(`Could not verify account role with Firestore: ${err?.message || 'Access Denied'}`);
          }
        } else {
          // If Firestore is unconfigured, cannot verify role
          setUserProfile(null);
          setRole(null);
          setIsRoleVerified(false);
          setRoleError('Cloud Firestore is not initialized.');
        }
      } else {
        // When signed out, clear state
        setUserProfile(null);
        setRole(null);
        setIsRoleVerified(false);
        setRoleError(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openStandaloneTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.assign(window.location.href);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setAuthErrorDetails(null);

    if (!isFirebaseConfigured || !auth || !googleProvider) {
      const errInfo: AuthErrorInfo = {
        code: 'auth/not-configured',
        title: 'Firebase Not Configured',
        message: 'Firebase credentials are missing or incomplete in your environment. Provide valid project keys in Settings.',
        suggestedAction: 'Verify VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in Settings.',
        hostname: window.location.hostname,
        isIframe: isEmbeddedInIframe(),
        appUrl: window.location.href,
      };
      setError(errInfo.message);
      setAuthErrorDetails(errInfo);
      return;
    }

    setIsSigningIn(true);
    try {
      console.log('[AuthContext] Launching signInWithPopup using GoogleAuthProvider...');
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('[AuthContext] Google sign-in completed successfully for:', userCredential.user.email);
      setError(null);
      setAuthErrorDetails(null);
    } catch (err: any) {
      console.error('[AuthContext] Google Sign-in error caught:', err);
      const code: string = err?.code || 'auth/unknown';
      const rawMessage: string = err?.message || String(err);
      const hostname = window.location.hostname;
      const isIframe = isEmbeddedInIframe();

      let title = 'Google Authentication Error';
      let message = rawMessage;
      let action = 'Please try again or check your Firebase Authentication configuration.';

      if (
        code === 'auth/permission-denied' ||
        rawMessage.includes('has-been-suspended') ||
        rawMessage.includes('suspended') ||
        (rawMessage.includes('api-key') && rawMessage.includes('permission-denied'))
      ) {
        title = 'Firebase API Key Suspended';
        message = 'The configured Firebase API key has been suspended by Google Cloud / Firebase. Live Google OAuth is temporarily disabled.';
        action = 'Click "Sign in as Super Admin" or select any Sandbox Test Account below to test all platform features without restriction.';
      } else if (code === 'auth/unauthorized-domain' || rawMessage.includes('unauthorized-domain')) {
        title = 'Firebase Domain Not Authorized';
        message = `The current hosting domain "${hostname}" is not authorized for OAuth in your Firebase project.`;
        action = `Add "${hostname}" to Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (code === 'auth/popup-blocked' || rawMessage.includes('popup-blocked')) {
        title = 'Sign-In Popup Blocked';
        message = isIframe
          ? `The Google Sign-in popup was blocked by your browser because the app is running inside the Google AI Studio embedded iframe.`
          : `The Google Sign-in popup window was blocked by your browser's popup blocker.`;
        action = isIframe
          ? `Click "Open App in New Tab" below to run the app in a standalone window, or enable popups in your browser address bar.`
          : `Enable popups for this site in your browser address bar, then click "Sign in with Google" again.`;
      } else if (code === 'auth/popup-closed-by-user' || rawMessage.includes('popup-closed-by-user')) {
        title = 'Sign-In Window Closed';
        message = 'The sign-in popup window was closed before completing Google Authentication.';
        action = 'Click "Sign in with Google" to open the sign-in window again.';
      } else if (code === 'auth/operation-not-allowed') {
        title = 'Google Provider Not Enabled';
        message = 'Google Sign-in is not enabled as an authentication provider in your Firebase project.';
        action = 'Go to Firebase Console > Authentication > Sign-in method, click "Google", enable it, and click Save.';
      } else if (code === 'auth/cancelled-popup-request') {
        title = 'Popup Request Superseded';
        message = 'Another sign-in window was already open. Please complete or close that window first.';
        action = 'Close existing sign-in windows and try again.';
      }

      const errInfo: AuthErrorInfo = {
        code,
        title,
        message,
        suggestedAction: action,
        hostname,
        isIframe,
        appUrl: window.location.href,
      };

      setError(`${title}: ${message}`);
      setAuthErrorDetails(errInfo);
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    setAuthErrorDetails(null);
    try {
      localStorage.removeItem('nxtwave_demo_role');
    } catch {
      // Ignored
    }
    setIsDemoUser(false);

    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setIsRoleVerified(false);
      return;
    }

    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setIsRoleVerified(false);
    } catch (err: any) {
      console.error('[AuthContext] Sign out error:', err);
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
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
        isConfigured: isFirebaseConfigured,
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
