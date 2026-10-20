import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Environment variable resolution supporting both Vite import.meta.env and Node process.env
const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {}) as Record<string, string | undefined>;

// Helper to strip accidental quotes and whitespace
function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

export interface FirebaseConfigParams {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  rawDatabaseId?: string;
  firestoreDatabaseId: string;
}

const rawApiKey = cleanEnv(env.VITE_FIREBASE_API_KEY);
const rawProjectId = cleanEnv(env.VITE_FIREBASE_PROJECT_ID);
const rawDatabaseId = cleanEnv(env.VITE_FIREBASE_DATABASE_ID);
const rawAuthDomain = cleanEnv(env.VITE_FIREBASE_AUTH_DOMAIN);
const rawStorageBucket = cleanEnv(env.VITE_FIREBASE_STORAGE_BUCKET);
const rawMessagingSenderId = cleanEnv(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const rawAppId = cleanEnv(env.VITE_FIREBASE_APP_ID);

export interface DatabaseAnalysis {
  rawConfiguredId?: string;
  resolvedDatabaseId: string | undefined; // undefined routes to default database
  displayDatabaseId: string; // User-facing database identifier
  isAnalyticsMeasurementId: boolean;
  correctionApplied: boolean;
  explanation: string;
}

/**
 * Check if a provided database ID is accidentally a Google Analytics 4 Measurement ID
 * (e.g. G-PC3FR5K4Y5), which causes Firestore to fail with "the client is offline".
 */
export function analyzeDatabaseId(rawId?: string): DatabaseAnalysis {
  if (!rawId) {
    return {
      rawConfiguredId: undefined,
      resolvedDatabaseId: undefined,
      displayDatabaseId: '(default)',
      isAnalyticsMeasurementId: false,
      correctionApplied: false,
      explanation: 'No custom database ID specified; using standard default Firestore database "(default)".',
    };
  }

  const trimmed = rawId.trim();

  // Check for GA4 Measurement ID pattern (e.g. G-PC3FR5K4Y5)
  if (/^G-[A-Z0-9]+$/i.test(trimmed)) {
    return {
      rawConfiguredId: trimmed,
      resolvedDatabaseId: undefined, // fall back to standard default database
      displayDatabaseId: '(default)',
      isAnalyticsMeasurementId: true,
      correctionApplied: true,
      explanation: `"${trimmed}" is a Google Analytics 4 Measurement ID, not a Cloud Firestore Database ID. Passing an Analytics ID to Firestore causes the SDK to search for a non-existent database and report "Client is offline". The app has automatically routed queries to the standard default database "(default)".`,
    };
  }

  if (trimmed === '(default)' || trimmed === 'default') {
    return {
      rawConfiguredId: trimmed,
      resolvedDatabaseId: undefined,
      displayDatabaseId: '(default)',
      isAnalyticsMeasurementId: false,
      correctionApplied: false,
      explanation: 'Using standard default Firestore database "(default)".',
    };
  }

  // Legitimate secondary database name
  return {
    rawConfiguredId: trimmed,
    resolvedDatabaseId: trimmed,
    displayDatabaseId: trimmed,
    isAnalyticsMeasurementId: false,
    correctionApplied: false,
    explanation: `Using named secondary Firestore database "${trimmed}".`,
  };
}

export const dbAnalysis = analyzeDatabaseId(rawDatabaseId);

export const firebaseConfig: FirebaseConfigParams = {
  apiKey: rawApiKey,
  authDomain: rawAuthDomain || (rawProjectId ? `${rawProjectId}.firebaseapp.com` : undefined),
  projectId: rawProjectId,
  storageBucket: rawStorageBucket || (rawProjectId ? `${rawProjectId}.firebasestorage.app` : undefined),
  messagingSenderId: rawMessagingSenderId,
  appId: rawAppId,
  rawDatabaseId: rawDatabaseId,
  firestoreDatabaseId: dbAnalysis.displayDatabaseId,
};

// Check if valid client credentials are provided
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  !firebaseConfig.apiKey.includes('REPLACE') &&
  firebaseConfig.projectId !== 'your-project-id'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

    auth = getAuth(app);

    // Initialize Firestore:
    // If a valid secondary database ID is provided, use getFirestore(app, dbId).
    // If undefined, '(default)', or an Analytics ID (G-...), connect to standard default database.
    if (dbAnalysis.resolvedDatabaseId) {
      db = getFirestore(app, dbAnalysis.resolvedDatabaseId);
    } else {
      db = getFirestore(app);
    }

    if (firebaseConfig.storageBucket) {
      try {
        storage = getStorage(app);
      } catch (storageErr) {
        console.warn('[Firebase] Storage initialization note:', storageErr);
      }
    }

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
  }
}

export type ConnectionStatusType = 'connected' | 'rule-protected' | 'offline' | 'error' | 'unconfigured';

export interface ConnectionDiagnosticResult {
  success: boolean;
  status: ConnectionStatusType;
  title: string;
  message: string;
  details?: {
    code?: string;
    rawError?: string;
    projectId?: string;
    authDomain?: string;
    databaseUsed: string;
    rawConfiguredDatabaseId?: string | null;
    analyticsCorrectionApplied?: boolean;
    userAuthenticated: boolean;
    userEmail?: string | null;
    serverReached: boolean;
    recommendation?: string;
  };
}

/**
 * Validate Connection to Firestore at runtime using getDocFromServer.
 * Differentiates exact Firebase error codes rather than mislabeling all errors as "offline".
 */
export async function testFirestoreConnection(): Promise<ConnectionDiagnosticResult> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      status: 'unconfigured',
      title: 'Firebase Not Configured',
      message: 'Missing or placeholder VITE_FIREBASE_* credentials in your environment. Provide valid project keys in Settings.',
      details: {
        serverReached: false,
        databaseUsed: '(none)',
        userAuthenticated: false,
        recommendation: 'Configure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.',
      },
    };
  }

  const currentUser = auth?.currentUser;
  const isAuth = Boolean(currentUser);
  const databaseUsed = dbAnalysis.displayDatabaseId;

  // Choose probe document:
  // If signed in, probe the user's own document in /users/{uid} (which security rules explicitly allow).
  // If unauthenticated, probe /knowledge_sources/health_probe (which tests server rule evaluation).
  const probePath = isAuth ? ['users', currentUser!.uid] as const : ['knowledge_sources', 'health_probe'] as const;

  try {
    const docRef = doc(db, probePath[0], probePath[1]);
    const snapshot = await getDocFromServer(docRef);

    return {
      success: true,
      status: 'connected',
      title: isAuth ? 'Connected & Authenticated' : 'Connected to Cloud Firestore',
      message: isAuth 
        ? `Successfully verified direct read access from Firestore for ${currentUser?.email}. Document "${probePath[0]}/${probePath[1]}" resolved (exists: ${snapshot.exists()}). Database is ONLINE and responsive.`
        : `Successfully connected to Cloud Firestore (database: ${databaseUsed}). Server responded directly. Database is ONLINE and responsive.`,
      details: {
        code: '200 OK',
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        databaseUsed,
        rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
        analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
        userAuthenticated: isAuth,
        userEmail: currentUser?.email || null,
        serverReached: true,
        recommendation: isAuth 
          ? 'Live database communication verified. Your authenticated session has active read/write permissions.' 
          : 'Server communication verified. Sign in with Google to access protected QA documents.',
      },
    };
  } catch (err: any) {
    const errorCode: string = (err?.code || '').toLowerCase();
    const errorMsg: string = err?.message || String(err);

    // 1. Permission Denied (Server REACHED and actively enforcing security rules)
    // IMPORTANT: A permission-denied error PROVES the network connection to Cloud Firestore is working!
    if (
      errorCode === 'permission-denied' || 
      errorCode.includes('permission-denied') || 
      errorMsg.includes('permission-denied') || 
      errorMsg.includes('insufficient permissions') ||
      errorMsg.includes('Missing or insufficient permissions')
    ) {
      return {
        success: true, // Server connection succeeded!
        status: 'rule-protected',
        title: isAuth ? 'Server Reached (Role Permissions Enforced)' : 'Firestore Server Reached (Security Rules Active)',
        message: isAuth
          ? `Cloud Firestore server responded. Access to "${probePath[0]}/${probePath[1]}" was evaluated under security rules for role "${currentUser?.email}". This confirms Firestore is ONLINE and actively enforcing ABAC rules.`
          : `Cloud Firestore server reached successfully at projects/${firebaseConfig.projectId}/databases/${databaseUsed}. Access was restricted by security rules because this is an unauthenticated request. This confirms Cloud Firestore is ONLINE, responsive, and enforcing security. Sign in with Google to access protected data.`,
        details: {
          code: 'permission-denied (Server HTTP 403 / gRPC 7)',
          rawError: errorMsg,
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          databaseUsed,
          rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
          analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
          userAuthenticated: isAuth,
          userEmail: currentUser?.email || null,
          serverReached: true,
          recommendation: isAuth
            ? 'Ensure your account has an assigned role (admin, auditor, or lead) in Firestore.'
            : 'Sign in with Google using the button in the top navigation bar or below to unlock authenticated QA features.',
        },
      };
    }

    // 2. Document Not Found (Server reached, document does not exist)
    if (errorCode === 'not-found' || errorMsg.includes('not-found')) {
      return {
        success: true,
        status: 'connected',
        title: 'Connected to Cloud Firestore',
        message: `Firestore server reached and responded (document "${probePath[0]}/${probePath[1]}" does not exist yet). Database is ONLINE.`,
        details: {
          code: 'not-found (Server HTTP 404)',
          rawError: errorMsg,
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          databaseUsed,
          rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
          analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
          userAuthenticated: isAuth,
          userEmail: currentUser?.email || null,
          serverReached: true,
          recommendation: 'Database connection is healthy.',
        },
      };
    }

    // 3. Unauthenticated (Server reached, auth token invalid or absent)
    if (errorCode === 'unauthenticated' || errorMsg.includes('unauthenticated')) {
      return {
        success: true,
        status: 'rule-protected',
        title: 'Firestore Server Reached (Unauthenticated)',
        message: 'Cloud Firestore server responded with unauthenticated status. The backend is ONLINE. Sign in with Google to authenticate your session.',
        details: {
          code: 'unauthenticated (Server HTTP 401)',
          rawError: errorMsg,
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          databaseUsed,
          rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
          analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
          userAuthenticated: isAuth,
          userEmail: currentUser?.email || null,
          serverReached: true,
          recommendation: 'Sign in with Google to obtain an authenticated session.',
        },
      };
    }

    // 4. Failed Precondition (e.g. database does not exist or index required)
    if (errorCode === 'failed-precondition' || errorMsg.includes('failed-precondition')) {
      let specificHint = 'Database precondition check failed.';
      if (dbAnalysis.isAnalyticsMeasurementId) {
        specificHint = `Notice: Database ID "${rawDatabaseId}" is a Google Analytics ID. Routed to default database "(default)".`;
      }
      return {
        success: false,
        status: 'error',
        title: 'Database Precondition Failed',
        message: `${specificHint} Server error: ${errorMsg}`,
        details: {
          code: 'failed-precondition',
          rawError: errorMsg,
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          databaseUsed,
          rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
          analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
          userAuthenticated: isAuth,
          userEmail: currentUser?.email || null,
          serverReached: true,
          recommendation: 'Check the Firebase Console to verify Cloud Firestore is created and initialized in this project.',
        },
      };
    }

    // 5. Unavailable / Network Unreachable / Client Offline
    if (
      errorCode === 'unavailable' || 
      errorMsg.includes('the client is offline') || 
      errorMsg.includes('client is offline') ||
      errorMsg.includes('could not reach cloud firestore backend')
    ) {
      const isBrowserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      let diagnosisMessage = '';

      if (isBrowserOffline) {
        diagnosisMessage = 'Your browser reports that you are currently offline. Please check your internet connection.';
      } else if (dbAnalysis.isAnalyticsMeasurementId) {
        diagnosisMessage = `A Google Analytics Measurement ID ("${rawDatabaseId}") was detected in VITE_FIREBASE_DATABASE_ID. When passed to Firestore, the server rejects it with "database not found", which the client SDK reports as "Client is offline". The application has corrected this by routing to "(default)". If this error persists, verify that Cloud Firestore is created in project "${firebaseConfig.projectId}".`;
      } else {
        diagnosisMessage = `Cloud Firestore is currently unreachable from this browser session. Possible causes: (1) Cloud Firestore database has not been created yet in the Firebase Console for project "${firebaseConfig.projectId}", (2) firestore.googleapis.com is blocked by a network firewall, VPN, or ad-blocker, or (3) temporary Google Cloud connectivity issue.`;
      }

      return {
        success: false,
        status: 'offline',
        title: isBrowserOffline ? 'Browser Offline' : 'Firestore Backend Unreachable',
        message: diagnosisMessage,
        details: {
          code: errorCode || 'unavailable',
          rawError: errorMsg,
          projectId: firebaseConfig.projectId,
          authDomain: firebaseConfig.authDomain,
          databaseUsed,
          rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
          analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
          userAuthenticated: isAuth,
          userEmail: currentUser?.email || null,
          serverReached: false,
          recommendation: 'Verify in Firebase Console > Build > Firestore Database that a database is created in region asia-south1 or us-central1.',
        },
      };
    }

    // 6. Generic error fallback
    return {
      success: false,
      status: 'error',
      title: `Firestore Issue [${errorCode || 'UNKNOWN'}]`,
      message: `Firestore reported: ${errorMsg}`,
      details: {
        code: errorCode || 'unknown',
        rawError: errorMsg,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        databaseUsed,
        rawConfiguredDatabaseId: dbAnalysis.rawConfiguredId || null,
        analyticsCorrectionApplied: dbAnalysis.isAnalyticsMeasurementId,
        userAuthenticated: isAuth,
        userEmail: currentUser?.email || null,
        serverReached: false,
        recommendation: 'Check the browser console logs for detailed Firebase error stack.',
      },
    };
  }
}

export { app, auth, db, storage, googleProvider };
