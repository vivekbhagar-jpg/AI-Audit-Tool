/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audit Report Service for NxtWave AI Audit Platform
 * Connects to local Express + SQLite API (/api/reports).
 */

import { AuditReport, ReviewerReview } from '../types';
import { getAuditReportForJob, SAMPLE_AUDIT_REPORT_PRIMARY } from '../data/sampleData';

export interface GetReportOptions {
  fallbackToDemo?: boolean;
}

/**
 * Fetch audit report result for a job via backend API
 */
export async function getAuditReport(
  jobId: string,
  options: GetReportOptions = {}
): Promise<{ report: AuditReport | null; fromFirestore: boolean }> {
  try {
    const res = await fetch(`/api/reports/${jobId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.report) {
        return { report: data.report, fromFirestore: true };
      }
    }
  } catch (error) {
    console.warn('[ReportService] Error reading report from API, using fallback:', error);
  }

  const demoReport = getAuditReportForJob(jobId) || SAMPLE_AUDIT_REPORT_PRIMARY;
  return { report: demoReport, fromFirestore: false };
}

/**
 * Fetch all audit reports via backend API
 */
export async function getAllAuditReports(): Promise<AuditReport[]> {
  try {
    const res = await fetch('/api/reports');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reports)) {
        return data.reports;
      }
    }
  } catch (error) {
    console.warn('[ReportService] Error fetching all reports:', error);
  }
  return [SAMPLE_AUDIT_REPORT_PRIMARY];
}

/**
 * Save human auditor sign-off, comments, and score override via backend API
 */
export async function saveAuditorReviewToDb(
  jobId: string,
  reportId: string,
  review: ReviewerReview
): Promise<void> {
  const res = await fetch(`/api/reports/${jobId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save auditor review.');
  }
}

/**
 * Seed initial sample audit report
 */
export async function seedPrimaryReportToFirestore(): Promise<void> {
  // SQLite database seeds this on boot automatically
}
