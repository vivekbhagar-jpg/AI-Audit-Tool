/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audit Report Service for NxtWave AI Audit Platform
 * Connects to local Express + SQLite API (/api/reports).
 */

import { AuditReport, ReviewerReview } from '../types';
import { apiFetch } from '../lib/api';

export interface GetReportOptions {
  includeSamples?: boolean;
}

/**
 * Fetch audit report result for a job via backend API.
 * Never returns a demo fallback when real report is missing.
 */
export async function getAuditReport(
  jobId: string,
  _options: GetReportOptions = {}
): Promise<{ report: AuditReport | null; fromFirestore: boolean }> {
  try {
    const res = await apiFetch(`/api/reports/${jobId}`);
    if (res.ok) {
      const data = await res.json();
      return { report: data.report || null, fromFirestore: true };
    }
    if (res.status === 404) {
      return { report: null, fromFirestore: true };
    }
  } catch (error) {
    console.warn('[ReportService] Error reading report from API:', error);
  }

  return { report: null, fromFirestore: true };
}

/**
 * Fetch all audit reports via backend API.
 * Excludes sample reports unless explicitly requested.
 */
export async function getAllAuditReports(includeSamples: boolean = false): Promise<AuditReport[]> {
  try {
    const query = includeSamples ? '?include_samples=true' : '';
    const res = await apiFetch(`/api/reports${query}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reports)) {
        return data.reports;
      }
    }
  } catch (error) {
    console.warn('[ReportService] Error fetching all reports:', error);
  }
  return [];
}

/**
 * Save human auditor sign-off, comments, and score override via backend API.
 * Protected by CSRF token and auditor/admin role check on server.
 */
export async function saveAuditorReviewToDb(
  jobId: string,
  _reportId: string,
  review: ReviewerReview
): Promise<void> {
  const res = await apiFetch(`/api/reports/${jobId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save auditor review.');
  }
}
