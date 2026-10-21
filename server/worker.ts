/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistent Background Queue Worker for NxtWave AI Audit Platform
 * Coordinates job lifecycle, state transitions, bounded retries,
 * worker locks, restart recovery, and error diagnostics.
 */

import crypto from 'node:crypto';
import { db } from './db.js';
import { 
  parseGoogleDriveUrl, 
  downloadDriveRecording, 
  cleanupTempRecording 
} from './drive.js';
import { getTranscriptionProvider, TranscriptTurn } from './transcription.js';
import { evaluateAuditWithGemini, AuditEvaluationResult } from './auditEngine.js';

let isWorkerRunning = false;
let workerIntervalTimer: NodeJS.Timeout | null = null;

export function logAuditEvent(jobId: string | null, eventType: string, message: string, details?: any) {
  try {
    const id = `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_events (id, job_id, event_type, message, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, jobId, eventType, message, details ? JSON.stringify(details) : null, now);
  } catch (err) {
    console.warn('[Worker Event] Could not log audit event:', err);
  }
}

/**
 * On server startup, recover any jobs that were abandoned mid-processing
 * (e.g. during a server restart, crash, or unexpected termination).
 */
export function recoverAbandonedJobs(): void {
  try {
    const now = new Date().toISOString();
    const abandonedJobs = db.prepare(`
      SELECT id, status, retry_count, max_retries 
      FROM audit_jobs 
      WHERE status IN ('Retrieving Recording', 'Transcribing', 'Auditing')
    `).all() as any[];

    if (abandonedJobs.length > 0) {
      console.log(`[Worker] Recovering ${abandonedJobs.length} abandoned job(s) from previous server execution...`);

      for (const job of abandonedJobs) {
        if (job.retry_count < (job.max_retries || 3)) {
          db.prepare(`
            UPDATE audit_jobs
            SET status = 'Needs Retry',
                worker_locked_at = NULL,
                error_message = 'Process interrupted by server restart. Scheduled for automatic retry.',
                updated_at = ?
            WHERE id = ?
          `).run(now, job.id);
          logAuditEvent(job.id, 'JOB_RECOVERED', `Job ${job.id} recovered from interrupted state "${job.status}" to "Needs Retry".`);
        } else {
          db.prepare(`
            UPDATE audit_jobs
            SET status = 'Failed',
                worker_locked_at = NULL,
                is_retryable = 0,
                error_message = 'Job abandoned after reaching maximum restart retries.',
                updated_at = ?
            WHERE id = ?
          `).run(now, job.id);
          logAuditEvent(job.id, 'JOB_ABANDONED_MAX_RETRIES', `Job ${job.id} marked as Failed due to exceeding retry limits.`);
        }
      }
    }
  } catch (err) {
    console.error('[Worker] Error during abandoned job recovery:', err);
  }
}

/**
 * Process a single job through the entire pipeline:
 * Queued / Needs Retry -> Retrieving Recording -> Transcribing -> Transcript Ready -> Auditing -> Needs Review
 */
export async function processJob(jobId: string): Promise<void> {
  const job: any = db.prepare('SELECT * FROM audit_jobs WHERE id = ?').get(jobId);
  if (!job) return;

  const now = new Date().toISOString();
  let tempAudioPath: string | null = job.audio_path || null;

  try {
    // --------------------------------------------------------------------------
    // STAGE 1 -> 2: Retrieving Recording
    // --------------------------------------------------------------------------
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Retrieving Recording',
          progress = 15,
          notes = 'Connecting to Google Drive and validating recording access...',
          updated_at = ?
      WHERE id = ?
    `).run(now, jobId);
    logAuditEvent(jobId, 'STAGE_TRANSITION', 'Job entered "Retrieving Recording" stage.');

    const parseResult = parseGoogleDriveUrl(job.drive_url);
    if (!parseResult.valid || !parseResult.fileId) {
      throw new Error(`Invalid Google Drive URL: ${parseResult.error || 'Cannot parse Google Drive file ID.'}`);
    }

    const fileId = parseResult.fileId;
    const downloadRes = await downloadDriveRecording(fileId, jobId, job.drive_url);

    if (!downloadRes.success || !downloadRes.filePath) {
      const isPerm = downloadRes.isPermissionError;
      const errorMsg = downloadRes.error || 'Failed to retrieve recording from Google Drive.';
      
      // Update job with specific drive error
      db.prepare(`
        UPDATE audit_jobs
        SET status = 'Failed',
            progress = 0,
            is_retryable = ?,
            error_message = ?,
            worker_locked_at = NULL,
            updated_at = ?
        WHERE id = ?
      `).run(isPerm ? 0 : 1, errorMsg, new Date().toISOString(), jobId);

      logAuditEvent(jobId, 'RETRIEVAL_FAILED', errorMsg, { isPermissionError: isPerm });
      return;
    }

    tempAudioPath = downloadRes.filePath;
    const metadata = downloadRes.metadata;

    db.prepare(`
      UPDATE audit_jobs
      SET drive_file_id = ?,
          drive_metadata_json = ?,
          recording_name = ?,
          audio_path = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      fileId,
      metadata ? JSON.stringify(metadata) : null,
      metadata?.name || job.recording_name,
      tempAudioPath,
      new Date().toISOString(),
      jobId
    );

    // --------------------------------------------------------------------------
    // STAGE 2 -> 3: Transcribing
    // --------------------------------------------------------------------------
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Transcribing',
          progress = 40,
          notes = 'Performing multi-turn speech diariation and Hinglish translation...',
          updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), jobId);
    logAuditEvent(jobId, 'STAGE_TRANSITION', 'Job entered "Transcribing" stage.');

    const provider = getTranscriptionProvider();
    const transcriptionResult = await provider.transcribe(
      tempAudioPath,
      metadata?.mimeType || 'audio/mpeg',
      job.language || 'Hinglish (Hindi + English)'
    );

    // --------------------------------------------------------------------------
    // STAGE 3 -> 4: Transcript Ready
    // --------------------------------------------------------------------------
    const transcriptId = `tr-${jobId}`;
    const durationFormatted = `${Math.floor(transcriptionResult.durationSeconds / 60)}m ${Math.round(transcriptionResult.durationSeconds % 60)}s`;

    db.prepare(`
      INSERT INTO transcripts (
        id, job_id, language, duration_seconds, provider, raw_text, turns_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        raw_text = excluded.raw_text,
        turns_json = excluded.turns_json,
        duration_seconds = excluded.duration_seconds,
        updated_at = excluded.updated_at
    `).run(
      transcriptId,
      jobId,
      transcriptionResult.language,
      transcriptionResult.durationSeconds,
      `${transcriptionResult.provider}:${transcriptionResult.model}`,
      transcriptionResult.rawText,
      JSON.stringify(transcriptionResult.turns),
      JSON.stringify({ processingDurationMs: transcriptionResult.processingDurationMs }),
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Transcript Ready',
          progress = 65,
          duration = ?,
          raw_transcript = ?,
          notes = 'Transcript diariation ready. Initiating 8-Factor Quality Audit with Gemini...',
          updated_at = ?
      WHERE id = ?
    `).run(durationFormatted, transcriptionResult.rawText, new Date().toISOString(), jobId);
    logAuditEvent(jobId, 'STAGE_TRANSITION', 'Job entered "Transcript Ready" stage.');

    // --------------------------------------------------------------------------
    // STAGE 4 -> 5: Auditing
    // --------------------------------------------------------------------------
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Auditing',
          progress = 80,
          notes = 'Gemini evaluating transcript against active knowledge documents & rubric weights...',
          updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), jobId);
    logAuditEvent(jobId, 'STAGE_TRANSITION', 'Job entered "Auditing" stage.');

    const auditEvaluation: AuditEvaluationResult = await evaluateAuditWithGemini(
      transcriptionResult.turns,
      job.product,
      job.stage,
      job.counsellor_name
    );

    // --------------------------------------------------------------------------
    // STAGE 5 -> 6: Needs Review (Report Persisted, Ready for Human Auditor Review)
    // --------------------------------------------------------------------------
    const reportId = `report-${jobId}`;
    const auditDateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const initialReviewerReview = {
      auditorName: 'QA Auditor',
      auditorEmail: 'qa-audits@nxtwave.tech',
      status: 'Draft',
      originalScore: auditEvaluation.overallScore,
      finalScore: auditEvaluation.overallScore,
      notes: ''
    };

    db.prepare(`
      INSERT INTO audit_reports (
        id, job_id, counsellor_name, counsellor_emp_id, team, product, stage, language,
        duration, call_date, audit_date, overall_score, max_score, compliance_tier,
        is_sample, criteria_scores_json, critical_violations_json, observations_json,
        missing_narratives_json, unsupported_claims_json, coaching_recommendations_json,
        transcript_json, reviewer_review_json, model_identifier, prompt_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        overall_score = excluded.overall_score,
        compliance_tier = excluded.compliance_tier,
        criteria_scores_json = excluded.criteria_scores_json,
        critical_violations_json = excluded.critical_violations_json,
        missing_narratives_json = excluded.missing_narratives_json,
        unsupported_claims_json = excluded.unsupported_claims_json,
        coaching_recommendations_json = excluded.coaching_recommendations_json,
        transcript_json = excluded.transcript_json,
        updated_at = excluded.updated_at
    `).run(
      reportId,
      jobId,
      job.counsellor_name,
      job.counsellor_emp_id,
      job.team || `${job.product} Team`,
      job.product,
      job.stage,
      transcriptionResult.language,
      durationFormatted,
      job.submitted_at,
      auditDateStr,
      auditEvaluation.overallScore,
      auditEvaluation.maxScore,
      auditEvaluation.complianceTier,
      0,
      JSON.stringify(auditEvaluation.criteriaBreakdown),
      JSON.stringify(auditEvaluation.criticalViolations),
      JSON.stringify(auditEvaluation.unsupportedClaims),
      JSON.stringify(auditEvaluation.missingNarratives),
      JSON.stringify(auditEvaluation.unsupportedClaims),
      JSON.stringify(auditEvaluation.coachingRecommendations),
      JSON.stringify(auditEvaluation.evaluatedTranscript),
      JSON.stringify(initialReviewerReview),
      auditEvaluation.modelIdentifier,
      auditEvaluation.promptVersion,
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Update parent audit job to Needs Review with final score and critical violations count
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Needs Review',
          progress = 100,
          score = ?,
          critical_violation_count = ?,
          worker_locked_at = NULL,
          notes = 'AI audit completed successfully. Pending auditor sign-off.',
          updated_at = ?
      WHERE id = ?
    `).run(
      auditEvaluation.overallScore,
      auditEvaluation.criticalViolations.length,
      new Date().toISOString(),
      jobId
    );

    logAuditEvent(jobId, 'AUDIT_COMPLETED', `AI audit evaluation completed with score ${auditEvaluation.overallScore}/100. Entered "Needs Review".`, {
      overallScore: auditEvaluation.overallScore,
      complianceTier: auditEvaluation.complianceTier,
      criticalViolationsCount: auditEvaluation.criticalViolations.length
    });

  } catch (err: any) {
    console.error(`[Worker] Error processing job ${jobId}:`, err);
    const errorMsg = err.message || 'Unexpected audit pipeline processing failure.';
    const currentRetries = (job.retry_count || 0) + 1;
    const maxRetries = job.max_retries || 3;
    const isRetryable = !errorMsg.includes('Google Drive Access Denied') && !errorMsg.includes('Invalid stage');

    if (isRetryable && currentRetries < maxRetries) {
      db.prepare(`
        UPDATE audit_jobs
        SET status = 'Needs Retry',
            retry_count = ?,
            error_message = ?,
            worker_locked_at = NULL,
            notes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        currentRetries,
        errorMsg,
        `Attempt ${currentRetries}/${maxRetries} failed: ${errorMsg}. Scheduled for retry.`,
        new Date().toISOString(),
        jobId
      );
      logAuditEvent(jobId, 'JOB_RETRY_SCHEDULED', `Attempt ${currentRetries} failed. Rescheduled for retry.`);
    } else {
      db.prepare(`
        UPDATE audit_jobs
        SET status = 'Failed',
            retry_count = ?,
            error_message = ?,
            is_retryable = 0,
            worker_locked_at = NULL,
            notes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        currentRetries,
        errorMsg,
        `Permanent failure: ${errorMsg}`,
        new Date().toISOString(),
        jobId
      );
      logAuditEvent(jobId, 'JOB_FAILED_PERMANENTLY', errorMsg);
    }
  } finally {
    // Clean up temporary audio file to save disk space and protect student privacy
    cleanupTempRecording(tempAudioPath);
  }
}

/**
 * Worker polling loop:
 * Queries the durable SQLite database for Queued or Needs Retry jobs
 */
export async function runWorkerIteration(): Promise<void> {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    const now = new Date().toISOString();
    // 10 minutes lock timeout for stale locks
    const staleLockThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const candidate: any = db.prepare(`
      SELECT id, status, retry_count
      FROM audit_jobs
      WHERE (status = 'Queued' OR status = 'Needs Retry')
        AND (worker_locked_at IS NULL OR worker_locked_at < ?)
      ORDER BY created_at ASC
      LIMIT 1
    `).get(staleLockThreshold);

    if (candidate) {
      // Transactional lock
      const lockAcquired = db.prepare(`
        UPDATE audit_jobs
        SET worker_locked_at = ?
        WHERE id = ? AND (worker_locked_at IS NULL OR worker_locked_at < ?)
      `).run(now, candidate.id, staleLockThreshold);

      if (lockAcquired.changes > 0) {
        await processJob(candidate.id);
      }
    }
  } catch (err) {
    console.error('[Worker] Iteration error:', err);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Start the background worker service
 */
export function startAuditWorker(pollIntervalMs: number = 2500): void {
  if (workerIntervalTimer) return;
  console.log('[Worker] Starting persistent background audit queue worker...');
  recoverAbandonedJobs();
  workerIntervalTimer = setInterval(() => {
    runWorkerIteration().catch(err => console.error('[Worker] Unhandled loop error:', err));
  }, pollIntervalMs);
}

/**
 * Stop the background worker service (useful for testing or shutdown)
 */
export function stopAuditWorker(): void {
  if (workerIntervalTimer) {
    clearInterval(workerIntervalTimer);
    workerIntervalTimer = null;
    console.log('[Worker] Background audit queue worker stopped.');
  }
}

/**
 * Controlled manual retry of a failed job
 */
export function retryJob(jobId: string): { success: boolean; error?: string } {
  const job: any = db.prepare('SELECT * FROM audit_jobs WHERE id = ?').get(jobId);
  if (!job) {
    return { success: false, error: 'Job not found.' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE audit_jobs
    SET status = 'Queued',
        progress = 0,
        worker_locked_at = NULL,
        error_message = NULL,
        notes = 'Manually requeued for audit.',
        updated_at = ?
    WHERE id = ?
  `).run(now, jobId);

  logAuditEvent(jobId, 'JOB_MANUALLY_REQUEUED', 'User triggered manual retry.');
  return { success: true };
}

/**
 * Controlled cancellation of a queued or running job
 */
export function cancelJob(jobId: string): { success: boolean; error?: string } {
  const job: any = db.prepare('SELECT * FROM audit_jobs WHERE id = ?').get(jobId);
  if (!job) {
    return { success: false, error: 'Job not found.' };
  }

  if (job.status === 'Completed') {
    return { success: false, error: 'Completed audits cannot be cancelled.' };
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE audit_jobs
    SET status = 'Failed',
        is_retryable = 0,
        worker_locked_at = NULL,
        error_message = 'Job cancelled by user.',
        notes = 'Cancelled by auditor/admin.',
        updated_at = ?
    WHERE id = ?
  `).run(now, jobId);

  cleanupTempRecording(job.audio_path);
  logAuditEvent(jobId, 'JOB_CANCELLED', 'Job cancelled by user.');
  return { success: true };
}
