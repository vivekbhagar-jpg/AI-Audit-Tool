/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection,
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { AuditReport, ReviewerReview } from '../types';
import { getAuditReportForJob, SAMPLE_AUDIT_REPORT_PRIMARY } from '../data/sampleData';

const REVIEWS_COLLECTION = 'audit_reviews';
const RESULTS_COLLECTION = 'audit_results';

export interface GetReportOptions {
  fallbackToDemo?: boolean;
}

/**
 * Fetch audit report result for a job.
 * In production mode, returns null if no report has been finalized for the job yet.
 */
export async function getAuditReport(
  jobId: string,
  options: GetReportOptions = {}
): Promise<{ report: AuditReport | null; fromFirestore: boolean }> {
  if (!isFirebaseConfigured || !db) {
    return { report: getAuditReportForJob(jobId) || SAMPLE_AUDIT_REPORT_PRIMARY, fromFirestore: false };
  }

  const docPath = `${RESULTS_COLLECTION}/${jobId}`;
  try {
    const docSnap = await getDoc(doc(db, RESULTS_COLLECTION, jobId));
    if (docSnap.exists()) {
      return { report: docSnap.data() as AuditReport, fromFirestore: true };
    }
  } catch (error) {
    console.warn('[ReportService] Error reading report from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.GET, docPath, auth?.currentUser);
    } catch {
      // Handled
    }
  }

  const demoReport = getAuditReportForJob(jobId) || SAMPLE_AUDIT_REPORT_PRIMARY;
  return { report: demoReport, fromFirestore: false };
}

/**
 * Fetch all stored audit reports from Cloud Firestore
 */
export async function getAllAuditReports(): Promise<AuditReport[]> {
  if (!isFirebaseConfigured || !db) {
    return [];
  }

  try {
    const snapshot = await getDocs(collection(db, RESULTS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as AuditReport);
  } catch (error) {
    console.warn('[ReportService] Failed to load all reports:', error);
    return [];
  }
}

/**
 * Save a complete audit scorecard report into Cloud Firestore
 */
export async function saveAuditReportToDb(report: AuditReport): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    console.info('[ReportService] Firebase unconfigured; report saved in memory.');
    return;
  }

  const docPath = `${RESULTS_COLLECTION}/${report.jobId}`;
  try {
    await setDoc(doc(db, RESULTS_COLLECTION, report.jobId), {
      ...report,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Save human auditor sign-off, comments, and score override to Cloud Firestore
 */
export async function saveAuditorReviewToDb(
  jobId: string,
  reportId: string,
  review: ReviewerReview
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    console.info('[ReportService] Firebase unconfigured; review updated in memory.');
    return;
  }

  const reviewId = `rev-${jobId}-${Date.now().toString().slice(-6)}`;
  const docPath = `${REVIEWS_COLLECTION}/${reviewId}`;

  try {
    await setDoc(doc(db, REVIEWS_COLLECTION, reviewId), {
      id: reviewId,
      jobId,
      reportId,
      auditorId: auth?.currentUser?.uid || 'auditor-guest',
      auditorName: review.auditorName,
      auditorEmail: review.auditorEmail,
      originalScore: review.originalScore,
      finalScore: review.finalScore,
      overrideReason: review.overrideReason || '',
      notes: review.notes || '',
      status: review.status,
      signedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // Also update the audit result document with the latest reviewer feedback
    try {
      const resultDocRef = doc(db, RESULTS_COLLECTION, jobId);
      const resultSnap = await getDoc(resultDocRef);
      if (resultSnap.exists()) {
        await setDoc(resultDocRef, {
          reviewerReview: review,
          overallScore: review.finalScore,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[ReportService] Merging review into result note:', err);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath, auth?.currentUser);
    throw error;
  }
}

/**
 * Seed initial sample audit report to Firestore
 */
export async function seedPrimaryReportToFirestore(): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  await saveAuditReportToDb(SAMPLE_AUDIT_REPORT_PRIMARY);
}
