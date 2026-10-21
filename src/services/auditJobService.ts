/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audit Job Service for NxtWave AI Audit Platform
 * Connects to local Express + SQLite API (/api/jobs).
 */

import { AuditJob, AuditJobStatus } from '../types';
import { isValidProductStage, getStagesForProduct } from '../config/callStages';
import { apiFetch } from '../lib/api';

export interface GetAuditJobsOptions {
  includeSamples?: boolean;
}

/**
 * Fetch all audit jobs from backend API (/api/jobs).
 * Does not fall back to fake operational jobs.
 */
export async function getAuditJobs(
  options: GetAuditJobsOptions = {}
): Promise<{ jobs: AuditJob[]; fromFirestore: boolean }> {
  try {
    const query = options.includeSamples ? '?include_samples=true' : '';
    const res = await apiFetch(`/api/jobs${query}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        return { jobs: data.jobs, fromFirestore: true };
      }
    }
  } catch (error) {
    console.warn('[AuditJobService] Failed to load jobs from API:', error);
  }

  return { jobs: [], fromFirestore: true };
}

/**
 * Save new audit job via backend API
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

  const res = await apiFetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newJob)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit audit job.');
  }
}

/**
 * Update audit job status and progress via backend API
 */
export async function updateAuditJobStatusInDb(
  jobId: string, 
  status: AuditJobStatus, 
  progress: number, 
  score?: number,
  criticalViolationCount?: number,
  notes?: string
): Promise<void> {
  const res = await apiFetch(`/api/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      progress,
      score,
      criticalViolationCount,
      notes
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update job status.');
  }
}

/**
 * Delete an audit job
 */
export async function deleteAuditJobFromDb(jobId: string): Promise<void> {
  const res = await apiFetch(`/api/jobs/${jobId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete audit job.');
  }
}
