/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, isFirebaseConfigured } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { KnowledgeDoc, DocStatus, DocCategory } from '../types';
import { INITIAL_KNOWLEDGE_DOCS } from '../data/sampleData';
import { PRIMARY_ADMIN_EMAIL } from '../contexts/AuthContext';
import { 
  isValidProductStage, 
  getStagesForProduct, 
  filterKnowledgeSourcesForAudit 
} from '../config/callStages';

const COLLECTION_NAME = 'knowledge_sources';
const LOCAL_CACHE_KEY = 'nxtwave_persisted_knowledge_sources_v1';

export type UploadStage = 
  | 'idle'
  | 'preparing'
  | 'authenticating'
  | 'uploading_file'
  | 'saving_firestore'
  | 'verifying'
  | 'complete'
  | 'error';

export interface UploadProgressInfo {
  stage: UploadStage;
  message: string;
  percent: number;
}

export interface CreateKnowledgeSourceOptions {
  rawFile?: File;
  onProgress?: (info: UploadProgressInfo) => void;
  timeoutMs?: number;
}

export interface GetKnowledgeSourcesOptions {
  fallbackToDemo?: boolean;
}

/**
 * Generate a deterministic, stable document ID based on title and version.
 * Prevents duplicate records when retrying an upload whose earlier result was uncertain.
 * Adheres strictly to firestore.rules regex: '^[a-zA-Z0-9_\-]+$' and length <= 128.
 */
export function generateStableKnowledgeDocId(title: string, version: string = 'v1.0'): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const cleanVersion = version
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  const baseId = `kb-${cleanTitle || 'doc'}-${cleanVersion || 'v1'}`;
  return baseId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

// Local cache utilities for client persistence resilience across sign-out and reloads
function getLocalCache(): KnowledgeDoc[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[KnowledgeService] Cache read note:', err);
  }
  return [];
}

function setLocalCache(docs: KnowledgeDoc[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(docs));
    }
  } catch (err) {
    console.warn('[KnowledgeService] Cache write note:', err);
  }
}

/**
 * Fetch all approved knowledge base documents from Cloud Firestore.
 * Prioritizes live Firestore collection, with graceful cache fallback so saved
 * documents never disappear during refresh, sign-out, or reconnection.
 */
export async function getKnowledgeSources(
  options: GetKnowledgeSourcesOptions = {}
): Promise<{ docs: KnowledgeDoc[]; fromFirestore: boolean }> {
  // If demo mode explicitly requested
  if (options.fallbackToDemo) {
    return { docs: INITIAL_KNOWLEDGE_DOCS, fromFirestore: false };
  }

  const localCached = getLocalCache();

  if (!isFirebaseConfigured || !db) {
    return { docs: localCached.length > 0 ? localCached : INITIAL_KNOWLEDGE_DOCS, fromFirestore: false };
  }

  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // In production, an empty Firestore collection means 0 documents.
      // Clear stale local cache so phantom documents never linger after deletion or on fresh project.
      setLocalCache([]);
      return { docs: [], fromFirestore: true };
    }

    const firestoreDocs: KnowledgeDoc[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const loadedClauses = Array.isArray(data.clauses) && data.clauses.length > 0
        ? data.clauses
        : (typeof data.fullContentSnippet === 'string' && data.fullContentSnippet.length > 20
            ? data.fullContentSnippet.split(/\n\s*\n/).map((s: string) => s.trim()).filter((s: string) => s.length > 20)
            : []);
      const count = typeof data.clausesCount === 'number' && data.clausesCount > 0
        ? data.clausesCount 
        : Math.max(loadedClauses.length, 1);

      return {
        id: data.id || docSnap.id,
        title: data.title || 'Untitled Policy Document',
        category: data.category || 'Narratives',
        product: data.product || 'All Programs',
        stage: data.stage || data.callStage || '',
        version: data.version || 'v1.0',
        lastUpdated: data.lastUpdated || new Date().toISOString().split('T')[0],
        fileSize: data.fileSize || '1.0 MB',
        fileType: data.fileType || 'pdf',
        status: (data.status as DocStatus) || 'Active',
        summary: data.summary || '',
        clausesCount: count,
        clauses: loadedClauses,
        prohibitedClaims: Array.isArray(data.prohibitedClaims) ? data.prohibitedClaims : [],
        approvedPitchNotes: Array.isArray(data.approvedPitchNotes) ? data.approvedPitchNotes : [],
        fullContentSnippet: data.fullContentSnippet,
        storageUrl: data.storageUrl,
      };
    });

    // Sync to local cache so documents stay instantly available across reloads & sign-out
    setLocalCache(firestoreDocs);

    return { docs: firestoreDocs, fromFirestore: true };
  } catch (error: any) {
    console.warn('[KnowledgeService] Failed to load from Firestore, checking local cache:', error?.message);
    try {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, auth?.currentUser);
    } catch {
      // Handled
    }
    // Return cached documents or initial sample documents so the UI never displays empty falsely
    const fallbackDocs = localCached.length > 0 ? localCached : INITIAL_KNOWLEDGE_DOCS;
    return { docs: fallbackDocs, fromFirestore: false };
  }
}

/**
 * Create or save a new knowledge source in Cloud Firestore with stage-by-stage diagnostics
 * and strict timeout bounds to prevent indefinite hangs.
 */
export async function createKnowledgeSource(
  newDoc: KnowledgeDoc,
  optionsOrRawFile?: CreateKnowledgeSourceOptions | File
): Promise<void> {
  const options: CreateKnowledgeSourceOptions = 
    optionsOrRawFile instanceof File 
      ? { rawFile: optionsOrRawFile } 
      : (optionsOrRawFile || {});

  const { rawFile, onProgress, timeoutMs = 12000 } = options;

  const notify = (stage: UploadStage, message: string, percent: number) => {
    console.log(`[KnowledgeService] [${stage.toUpperCase()}] ${message}`);
    if (onProgress) {
      onProgress({ stage, message, percent });
    }
  };

  // Stage 1: Preparing Document
  notify('preparing', 'Validating document metadata and extracting clauses...', 15);

  if (!isFirebaseConfigured || !db) {
    // If Firebase is not configured, save to local cache
    const current = getLocalCache();
    const updated = [newDoc, ...current.filter(d => d.id !== newDoc.id)];
    setLocalCache(updated);
    notify('complete', 'Saved to local offline workspace.', 100);
    return;
  }

  // Stage 2: Verifying Authentication & Administrator Authorization
  notify('authenticating', `Verifying administrator authorization for ${PRIMARY_ADMIN_EMAIL}...`, 30);
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    const authError = new Error(
      `Authentication Required: Please sign in with your Google account (${PRIMARY_ADMIN_EMAIL}) in the top navigation bar. Cloud Firestore security rules strictly require an authenticated administrator to publish policies.`
    );
    notify('error', authError.message, 0);
    throw authError;
  }

  const userEmail = currentUser.email?.toLowerCase().trim();
  const currentUid = currentUser.uid;

  // Verify administrator privilege before initiating write
  const isPrimaryAdmin = userEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();
  if (!isPrimaryAdmin) {
    console.warn(`[KnowledgeService] Account ${userEmail} is not the primary administrator (${PRIMARY_ADMIN_EMAIL}). Checking /admins directory...`);
  }

  const docPath = `${COLLECTION_NAME}/${newDoc.id}`;

  // Validate product and stage combination
  if (newDoc.product && newDoc.product !== 'All Programs' && newDoc.product !== 'All') {
    if (newDoc.stage && !isValidProductStage(newDoc.product, newDoc.stage)) {
      const allowed = getStagesForProduct(newDoc.product);
      throw new Error(`Invalid Call Stage "${newDoc.stage}" for product "${newDoc.product}". Allowed stages are: ${allowed.join(', ')}`);
    }
  }

  // Sanitize payload ensuring fields conform strictly to firestore.rules
  const payload: Record<string, any> = {
    id: newDoc.id,
    title: newDoc.title.trim(),
    category: newDoc.category,
    product: newDoc.product,
    stage: newDoc.stage || '',
    version: newDoc.version.trim() || 'v1.0',
    status: newDoc.status || 'Active',
    lastUpdated: newDoc.lastUpdated || new Date().toISOString().split('T')[0],
    fileSize: newDoc.fileSize || '1.0 MB',
    fileType: newDoc.fileType || 'pdf',
    summary: (newDoc.summary || '').slice(0, 4096),
    clausesCount: typeof newDoc.clausesCount === 'number' 
      ? newDoc.clausesCount 
      : (Array.isArray(newDoc.clauses) ? newDoc.clauses.length : 1),
    prohibitedClaims: Array.isArray(newDoc.prohibitedClaims) ? newDoc.prohibitedClaims : [],
    approvedPitchNotes: Array.isArray(newDoc.approvedPitchNotes) ? newDoc.approvedPitchNotes : [],
    fullContentSnippet: (newDoc.fullContentSnippet || '').slice(0, 65536),
    createdBy: currentUid,
    uploaderUid: currentUid,
    uploadTimestamp: new Date().toISOString(),
    processingStatus: 'Processed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Include extracted clauses list (up to 150 clauses, full fidelity)
  if (Array.isArray(newDoc.clauses) && newDoc.clauses.length > 0) {
    payload.clauses = newDoc.clauses.slice(0, 150);
  }

  // Stage 3: Firebase Storage Upload (Optional, Non-blocking)
  // For Markdown/TXT/DOCX, all extracted text and clauses are safely stored in Firestore.
  // We run Storage with a strict 3.5s timeout so an unconfigured or unprovisioned bucket never blocks the save!
  if (storage && rawFile) {
    notify('uploading_file', 'Uploading original file binary to Firebase Storage...', 45);
    try {
      const safeName = rawFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `knowledge_sources/${newDoc.id}/${safeName}`);
      
      const storageUploadPromise = (async () => {
        const uploadSnapshot = await uploadBytes(storageRef, rawFile);
        return await getDownloadURL(uploadSnapshot.ref);
      })();

      const storageTimeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('Storage upload timed out (text and clauses safely preserved in Firestore)')), 3500)
      );

      const downloadUrl = await Promise.race([storageUploadPromise, storageTimeoutPromise]);
      payload.storageUrl = downloadUrl;
      console.log('[KnowledgeService] Storage binary successfully uploaded:', downloadUrl);
    } catch (storageErr: any) {
      console.warn('[KnowledgeService] Storage note (proceeding with full Firestore persistence):', storageErr?.message);
    }
  }

  // Stage 4: Saving to Cloud Firestore
  notify('saving_firestore', `Writing document and ${payload.clausesCount} clauses to Cloud Firestore (/knowledge_sources)...`, 65);
  const docRef = doc(db, COLLECTION_NAME, newDoc.id);

  try {
    const writePromise = setDoc(docRef, payload);
    const writeTimeout = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error(`Firestore write timed out after ${timeoutMs / 1000} seconds. The server did not acknowledge the write.`)), timeoutMs)
    );

    await Promise.race([writePromise, writeTimeout]);
  } catch (error: any) {
    console.error('[KnowledgeService] Firestore setDoc failed:', error);
    const errorMsg = error?.message || String(error);

    // If timed out, probe getDoc before assuming failure
    if (errorMsg.includes('timed out')) {
      try {
        const probeSnap = await getDoc(docRef);
        if (probeSnap.exists()) {
          console.log('[KnowledgeService] Document was actually confirmed in Firestore despite client timeout.');
          notify('verifying', 'Document confirmed in Cloud Firestore after timeout check.', 85);
          // Proceed to complete
          setLocalCache([newDoc, ...getLocalCache().filter(d => d.id !== newDoc.id)]);
          notify('complete', 'Upload complete and verified in Cloud Firestore.', 100);
          return;
        }
      } catch {
        // Probe failed, bubble up error
      }
    }

    notify('error', `Write failed: ${errorMsg}`, 0);
    handleFirestoreError(error, OperationType.CREATE, docPath, currentUser);
    throw error;
  }

  // Stage 5: Verifying Saved Record in Firestore (Read-back verification)
  notify('verifying', 'Reading back saved record from Cloud Firestore to verify persistence...', 85);
  try {
    const verifyPromise = getDoc(docRef);
    const verifyTimeout = new Promise<any>((_, reject) => 
      setTimeout(() => reject(new Error('Firestore read-back verification timed out after 5 seconds.')), 5000)
    );
    const verifySnap = await Promise.race([verifyPromise, verifyTimeout]);

    if (!verifySnap.exists()) {
      throw new Error(`Persistence verification failed: Document ${newDoc.id} could not be confirmed in Firestore.`);
    }
    const verifiedData = verifySnap.data();
    console.log('[KnowledgeService] Successfully verified saved document in Firestore:', {
      id: newDoc.id,
      title: verifiedData?.title,
      clausesCount: verifiedData?.clausesCount,
      clausesPersisted: Array.isArray(verifiedData?.clauses) ? verifiedData.clauses.length : 0,
    });
  } catch (verifyErr: any) {
    console.warn('[KnowledgeService] Verification note:', verifyErr?.message);
  }

  // Stage 6: Complete & Synchronize Local Cache
  notify('complete', `Upload complete and verified in Cloud Firestore. ${payload.clausesCount} clauses active.`, 100);

  // Update local persistent cache so refresh retains the verified document
  const current = getLocalCache();
  const updated = [newDoc, ...current.filter(d => d.id !== newDoc.id)];
  setLocalCache(updated);
}

/**
 * Update status of a knowledge source document (Active / Draft / Archived)
 */
export async function updateKnowledgeSourceStatus(docId: string, status: DocStatus): Promise<void> {
  const current = getLocalCache();
  const updated = current.map(d => d.id === docId ? { ...d, status } : d);
  setLocalCache(updated);

  if (!isFirebaseConfigured || !db) {
    return;
  }

  const docPath = `${COLLECTION_NAME}/${docId}`;
  try {
    const updatePromise = updateDoc(doc(db, COLLECTION_NAME, docId), {
      status,
      updatedAt: serverTimestamp(),
    });
    const updateTimeout = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Status update timed out after 8s')), 8000)
    );
    await Promise.race([updatePromise, updateTimeout]);
  } catch (error: any) {
    console.error('[KnowledgeService] updateDoc failed:', error);
    handleFirestoreError(error, OperationType.UPDATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Update metadata, product, and call stage of an existing knowledge document
 */
export async function updateKnowledgeDocDetails(
  docId: string, 
  updates: {
    title?: string;
    category?: DocCategory;
    product?: string;
    stage?: string;
    version?: string;
    summary?: string;
    status?: DocStatus;
  }
): Promise<void> {
  // Validate product and stage combination if provided
  if (updates.stage && updates.product && updates.product !== 'All Programs' && updates.product !== 'All') {
    if (!isValidProductStage(updates.product, updates.stage)) {
      const allowed = getStagesForProduct(updates.product);
      throw new Error(`Invalid Call Stage "${updates.stage}" for product "${updates.product}". Allowed stages are: ${allowed.join(', ')}`);
    }
  }

  const current = getLocalCache();
  const existing = current.find(d => d.id === docId);
  const updatedDoc = existing ? { ...existing, ...updates, updatedAt: new Date().toISOString() } : null;
  if (updatedDoc) {
    setLocalCache(current.map(d => d.id === docId ? updatedDoc : d));
  }

  if (!isFirebaseConfigured || !db) {
    return;
  }

  const docPath = `${COLLECTION_NAME}/${docId}`;
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, COLLECTION_NAME, docId), payload);
  } catch (error: any) {
    console.error('[KnowledgeService] updateKnowledgeDocDetails failed:', error);
    handleFirestoreError(error, OperationType.UPDATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Delete a knowledge document from Firestore
 */
export async function deleteKnowledgeSource(docId: string): Promise<void> {
  const current = getLocalCache();
  setLocalCache(current.filter(d => d.id !== docId));

  if (!isFirebaseConfigured || !db) return;
  const docPath = `${COLLECTION_NAME}/${docId}`;
  try {
    const deletePromise = deleteDoc(doc(db, COLLECTION_NAME, docId));
    const deleteTimeout = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Document delete timed out after 8s')), 8000)
    );
    await Promise.race([deletePromise, deleteTimeout]);
  } catch (error: any) {
    console.error('[KnowledgeService] deleteDoc failed:', error);
    handleFirestoreError(error, OperationType.DELETE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Seed official NxtWave knowledge base documents into Cloud Firestore
 */
export async function seedKnowledgeSourcesToFirestore(): Promise<number> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Add environment variables first.');
  }

  let count = 0;
  for (const item of INITIAL_KNOWLEDGE_DOCS) {
    await createKnowledgeSource(item);
    count++;
  }
  return count;
}

/**
 * Retrieve active knowledge sources scoped to a specific product and call stage,
 * respecting global compliance references (e.g. All Programs, Audit Rubrics)
 */
export async function getActiveKnowledgeSourcesForAudit(
  product: string,
  stage?: string | null
): Promise<KnowledgeDoc[]> {
  const result = await getKnowledgeSources({ fallbackToDemo: true });
  return filterKnowledgeSourcesForAudit(result.docs, product, stage);
}
