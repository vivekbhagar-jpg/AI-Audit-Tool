/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp, 
  query 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { AuditJob, AuditJobStatus } from '../types';
import { INITIAL_AUDIT_JOBS } from '../data/sampleData';
import { isValidProductStage, getStagesForProduct, getDefaultStageForProduct } from '../config/callStages';

const COLLECTION_NAME = 'audit_jobs';

export interface GetAuditJobsOptions {
  fallbackToDemo?: boolean;
}

/**
 * Fetch all audit jobs from Cloud Firestore
 */
export async function getAuditJobs(
  options: GetAuditJobsOptions = {}
): Promise<{ jobs: AuditJob[]; fromFirestore: boolean }> {
  if (!isFirebaseConfigured || !db) {
    if (options.fallbackToDemo) {
      return { jobs: INITIAL_AUDIT_JOBS, fromFirestore: false };
    }
    return { jobs: [], fromFirestore: false };
  }

  try {
    const q = query(collection(db, COLLECTION_NAME));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      if (options.fallbackToDemo) {
        return { jobs: INITIAL_AUDIT_JOBS, fromFirestore: false };
      }
      return { jobs: [], fromFirestore: true };
    }

    const firestoreJobs: AuditJob[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: data.id || docSnap.id,
        recordingName: data.recordingName || 'Untitled Recording',
        driveUrl: data.driveUrl || '',
        counsellorName: data.counsellorName || 'Unknown Counsellor',
        counsellorEmpId: data.counsellorEmpId || 'NW-0000',
        product: data.product || 'Intensive',
        language: data.language || 'Hinglish (Hindi + English)',
        stage: data.stage || getDefaultStageForProduct(data.product),
        duration: data.duration || '20m 00s',
        submittedAt: data.submittedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: (data.status as AuditJobStatus) || 'Queued',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        score: typeof data.score === 'number' ? data.score : undefined,
        criticalViolationCount: typeof data.criticalViolationCount === 'number' ? data.criticalViolationCount : 0,
        isSample: Boolean(data.isSample),
        notes: data.notes,
      };
    });

    return { jobs: firestoreJobs, fromFirestore: true };
  } catch (error) {
    console.warn('[AuditJobService] Failed to load jobs from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, auth?.currentUser);
    } catch {
      // Handled
    }
    return { jobs: INITIAL_AUDIT_JOBS, fromFirestore: false };
  }
}

/**
 * Save new audit job in Cloud Firestore
 */
export async function createAuditJobInDb(newJob: AuditJob): Promise<void> {
  // Enforce product and call stage pairing validation
  if (!newJob.product || !newJob.stage) {
    throw new Error('Both Product and Call Stage are required to submit an audit job.');
  }
  if (!isValidProductStage(newJob.product, newJob.stage)) {
    const allowed = getStagesForProduct(newJob.product);
    throw new Error(`Invalid Call Stage "${newJob.stage}" for product "${newJob.product}". Valid stages are: ${allowed.join(', ')}`);
  }

  if (!isFirebaseConfigured || !db) {
    console.info('[AuditJobService] Firebase unconfigured; job saved in memory.');
    return;
  }

  const docPath = `${COLLECTION_NAME}/${newJob.id}`;
  try {
    const payload = {
      ...newJob,
      submittedBy: auth?.currentUser?.uid || 'anonymous',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, COLLECTION_NAME, newJob.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Update audit job status and progress in Cloud Firestore
 */
export async function updateAuditJobStatusInDb(
  jobId: string, 
  status: AuditJobStatus, 
  progress: number, 
  score?: number,
  criticalViolationCount?: number,
  notes?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    return;
  }

  const docPath = `${COLLECTION_NAME}/${jobId}`;
  try {
    const updatePayload: Record<string, any> = {
      status,
      progress,
      updatedAt: serverTimestamp(),
    };
    if (score !== undefined) {
      updatePayload.score = score;
    }
    if (criticalViolationCount !== undefined) {
      updatePayload.criticalViolationCount = criticalViolationCount;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    await updateDoc(doc(db, COLLECTION_NAME, jobId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Delete an audit job from Cloud Firestore
 */
export async function deleteAuditJobFromDb(jobId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const docPath = `${COLLECTION_NAME}/${jobId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Seed initial sample audit jobs into Cloud Firestore
 */
export async function seedAuditJobsToFirestore(): Promise<number> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Add environment variables first.');
  }

  let count = 0;
  for (const job of INITIAL_AUDIT_JOBS) {
    await createAuditJobInDb(job);
    count++;
  }
  return count;
}
