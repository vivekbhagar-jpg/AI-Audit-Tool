/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-Stack Server Entry Point for NxtWave AI Audit Platform
 * Node.js + Express + SQLite Backend with Vite SPA Middleware
 */

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { db } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;
const uploadsDir = path.join(rootDir, 'uploads', 'audio');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON and urlencoded forms
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer storage for audio file uploads
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `audio_${Date.now()}_${cleanName}${ext}`);
  }
});
const upload = multer({
  storage: audioStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max
});

// Simple server session simulation for local environment
let currentSessionUser: any = {
  uid: 'usr-admin-vb',
  email: 'vivekbhagar@gmail.com',
  displayName: 'Vivek Bhagar (Admin)',
  role: 'admin',
  team: 'Platform Administration'
};

/* ==========================================================================
   1. AUTHENTICATION API (/api/auth)
   ========================================================================== */

app.get('/api/auth/me', (_req, res) => {
  res.json({
    user: currentSessionUser
      ? {
          uid: currentSessionUser.uid,
          email: currentSessionUser.email,
          displayName: currentSessionUser.displayName,
        }
      : null,
    userProfile: currentSessionUser || null
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, role: requestedRole } = req.body;

  let userRow: any = null;
  if (email) {
    userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  } else if (requestedRole) {
    userRow = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(requestedRole);
  }

  if (!userRow) {
    userRow = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get('admin');
  }

  currentSessionUser = {
    uid: userRow.id,
    email: userRow.email,
    displayName: userRow.display_name,
    role: userRow.role,
    team: userRow.team,
  };

  res.json({
    success: true,
    user: {
      uid: currentSessionUser.uid,
      email: currentSessionUser.email,
      displayName: currentSessionUser.displayName,
    },
    userProfile: currentSessionUser,
  });
});

app.post('/api/auth/switch-role', (req, res) => {
  const { role } = req.body;
  const userRow: any = db.prepare('SELECT * FROM users WHERE role = ? LIMIT 1').get(role);

  if (userRow) {
    currentSessionUser = {
      uid: userRow.id,
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      team: userRow.team,
    };
    res.json({ success: true, user: currentSessionUser, userProfile: currentSessionUser });
  } else {
    res.status(404).json({ error: `User with role ${role} not found` });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  currentSessionUser = null;
  res.json({ success: true });
});

app.get('/api/auth/users', (_req, res) => {
  const users = db.prepare('SELECT id, email, display_name, role, team FROM users').all();
  res.json({ users });
});

/* ==========================================================================
   2. KNOWLEDGE BASE API (/api/knowledge)
   ========================================================================== */

app.get('/api/knowledge', (req, res) => {
  try {
    const { category, product, stage, search } = req.query;
    let query = 'SELECT * FROM knowledge_docs WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (product && product !== 'All' && product !== 'All Programs') {
      query += " AND (product = ? OR product = 'All Programs' OR product = 'All')";
      params.push(product);
    }
    if (stage && stage !== 'All' && stage !== 'All Stages') {
      query += " AND (stage = ? OR stage IS NULL OR stage = 'All Stages' OR stage = '')";
      params.push(stage);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (title LIKE ? OR summary LIKE ? OR full_content_snippet LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const docs = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      product: r.product,
      stage: r.stage,
      version: r.version,
      lastUpdated: r.last_updated,
      fileSize: r.file_size,
      fileType: r.file_type,
      status: r.status,
      clausesCount: r.clauses_count,
      summary: r.summary,
      clauses: r.clauses_json ? JSON.parse(r.clauses_json) : [],
      prohibitedClaims: r.prohibited_claims_json ? JSON.parse(r.prohibited_claims_json) : [],
      approvedPitchNotes: r.approved_pitch_notes_json ? JSON.parse(r.approved_pitch_notes_json) : [],
      fullContentSnippet: r.full_content_snippet,
      storageUrl: r.storage_url,
    }));

    res.json({ docs });
  } catch (err: any) {
    console.error('[API /api/knowledge] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/knowledge', (req, res) => {
  try {
    const doc = req.body;
    if (!doc.title || !doc.product) {
      return res.status(400).json({ error: 'Title and Product are required.' });
    }

    const now = new Date().toISOString();
    const id = doc.id || `kb-doc-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      INSERT INTO knowledge_docs (
        id, title, category, product, stage, version, last_updated,
        file_size, file_type, status, clauses_count, summary,
        clauses_json, prohibited_claims_json, approved_pitch_notes_json,
        full_content_snippet, storage_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      doc.title,
      doc.category || 'Narratives',
      doc.product,
      doc.stage || null,
      doc.version || 'v1.0',
      doc.lastUpdated || now.slice(0, 10),
      doc.fileSize || '1.0 MB',
      doc.fileType || 'pdf',
      doc.status || 'Active',
      doc.clausesCount || (doc.clauses ? doc.clauses.length : 0),
      doc.summary || '',
      JSON.stringify(doc.clauses || []),
      JSON.stringify(doc.prohibitedClaims || []),
      JSON.stringify(doc.approvedPitchNotes || []),
      doc.fullContentSnippet || '',
      doc.storageUrl || null,
      now,
      now
    );

    const savedDoc = { ...doc, id };
    res.status(201).json({ success: true, doc: savedDoc });
  } catch (err: any) {
    console.error('[API POST /api/knowledge] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/knowledge/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { product, stage, status } = req.body;
    const now = new Date().toISOString();

    const existing: any = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: `Knowledge document ${id} not found.` });
    }

    db.prepare(`
      UPDATE knowledge_docs 
      SET product = COALESCE(?, product),
          stage = COALESCE(?, stage),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `).run(product ?? null, stage ?? null, status ?? null, now, id);

    const updated: any = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id);
    res.json({
      success: true,
      doc: {
        id: updated.id,
        title: updated.title,
        category: updated.category,
        product: updated.product,
        stage: updated.stage,
        version: updated.version,
        lastUpdated: updated.last_updated,
        fileSize: updated.file_size,
        fileType: updated.file_type,
        status: updated.status,
        clausesCount: updated.clauses_count,
        summary: updated.summary,
        clauses: updated.clauses_json ? JSON.parse(updated.clauses_json) : [],
        prohibitedClaims: updated.prohibited_claims_json ? JSON.parse(updated.prohibited_claims_json) : [],
        approvedPitchNotes: updated.approved_pitch_notes_json ? JSON.parse(updated.approved_pitch_notes_json) : [],
        fullContentSnippet: updated.full_content_snippet,
      }
    });
  } catch (err: any) {
    console.error('[API PATCH /api/knowledge] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/knowledge/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   3. AUDIT JOBS API (/api/jobs)
   ========================================================================== */

app.get('/api/jobs', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM audit_jobs ORDER BY submitted_at DESC').all() as any[];
    const jobs = rows.map((r) => ({
      id: r.id,
      recordingName: r.recording_name,
      driveUrl: r.drive_url,
      audioPath: r.audio_path,
      counsellorName: r.counsellor_name,
      counsellorEmpId: r.counsellor_emp_id,
      counsellorEmail: r.counsellor_email,
      product: r.product,
      stage: r.stage,
      language: r.language,
      duration: r.duration,
      submittedAt: r.submitted_at,
      submittedBy: r.submitted_by,
      status: r.status,
      progress: r.progress,
      score: r.score,
      criticalViolationCount: r.critical_violation_count,
      isSample: Boolean(r.is_sample),
      notes: r.notes,
    }));
    res.json({ jobs });
  } catch (err: any) {
    console.error('[API /api/jobs] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', (req, res) => {
  try {
    const job = req.body;
    if (!job.product || !job.stage) {
      return res.status(400).json({ error: 'Product and Call Stage are both mandatory.' });
    }

    const now = new Date().toISOString();
    const id = job.id || `job-nw-${Date.now().toString().slice(-4)}`;

    db.prepare(`
      INSERT INTO audit_jobs (
        id, recording_name, drive_url, audio_path, counsellor_name, counsellor_emp_id,
        counsellor_email, product, stage, language, duration, submitted_at,
        submitted_by, status, progress, score, critical_violation_count, is_sample,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      job.recordingName || 'Untitled Recording',
      job.driveUrl || '',
      job.audioPath || null,
      job.counsellorName || 'Unknown Counsellor',
      job.counsellorEmpId || 'NW-0000',
      job.counsellorEmail || (currentSessionUser?.email || ''),
      job.product,
      job.stage,
      job.language || 'Hinglish (Hindi + English)',
      job.duration || '20m 00s',
      job.submittedAt || now.replace('T', ' ').slice(0, 16),
      currentSessionUser?.uid || 'user-default',
      job.status || 'Queued',
      job.progress || 0,
      job.score ?? null,
      job.criticalViolationCount || 0,
      job.isSample ? 1 : 0,
      job.notes || '',
      now,
      now
    );

    res.status(201).json({ success: true, job: { ...job, id } });
  } catch (err: any) {
    console.error('[API POST /api/jobs] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/jobs/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress, score, criticalViolationCount, notes } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE audit_jobs
      SET status = COALESCE(?, status),
          progress = COALESCE(?, progress),
          score = COALESCE(?, score),
          critical_violation_count = COALESCE(?, critical_violation_count),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `).run(status ?? null, progress ?? null, score ?? null, criticalViolationCount ?? null, notes ?? null, now, id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM audit_reports WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM audit_jobs WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM audit_reports ORDER BY created_at DESC').all() as any[];
    const reports = rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      counsellorName: row.counsellor_name,
      counsellorEmpId: row.counsellor_emp_id,
      team: row.team,
      product: row.product,
      stage: row.stage,
      language: row.language,
      duration: row.duration,
      callDate: row.call_date,
      auditDate: row.audit_date,
      overallScore: row.overall_score,
      maxScore: row.max_score,
      complianceTier: row.compliance_tier,
      isSample: Boolean(row.is_sample),
      criteriaScores: row.criteria_scores_json ? JSON.parse(row.criteria_scores_json) : [],
      criticalViolations: row.critical_violations_json ? JSON.parse(row.critical_violations_json) : [],
      observations: row.observations_json ? JSON.parse(row.observations_json) : [],
      transcript: row.transcript_json ? JSON.parse(row.transcript_json) : [],
      reviewerReview: row.reviewer_review_json ? JSON.parse(row.reviewer_review_json) : null,
    }));
    res.json({ reports });
  } catch (err: any) {
    console.error('[API /api/reports] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    let row: any = db.prepare('SELECT * FROM audit_reports WHERE job_id = ?').get(jobId);

    // If no direct report found, fetch primary report as reference
    if (!row) {
      row = db.prepare('SELECT * FROM audit_reports LIMIT 1').get();
    }

    if (!row) {
      return res.status(404).json({ error: 'No report found.' });
    }

    const report = {
      id: row.id,
      jobId: row.job_id,
      counsellorName: row.counsellor_name,
      counsellorEmpId: row.counsellor_emp_id,
      team: row.team,
      product: row.product,
      stage: row.stage,
      language: row.language,
      duration: row.duration,
      callDate: row.call_date,
      auditDate: row.audit_date,
      overallScore: row.overall_score,
      maxScore: row.max_score,
      complianceTier: row.compliance_tier,
      isSample: Boolean(row.is_sample),
      criteriaScores: row.criteria_scores_json ? JSON.parse(row.criteria_scores_json) : [],
      criticalViolations: row.critical_violations_json ? JSON.parse(row.critical_violations_json) : [],
      observations: row.observations_json ? JSON.parse(row.observations_json) : [],
      transcript: row.transcript_json ? JSON.parse(row.transcript_json) : [],
      reviewerReview: row.reviewer_review_json ? JSON.parse(row.reviewer_review_json) : null,
    };

    res.json({ report });
  } catch (err: any) {
    console.error('[API /api/reports/:jobId] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/:jobId/review', (req, res) => {
  try {
    const { jobId } = req.params;
    const reviewData = req.body;
    const now = new Date().toISOString();

    const reportRow: any = db.prepare('SELECT * FROM audit_reports WHERE job_id = ?').get(jobId);
    if (!reportRow) {
      return res.status(404).json({ error: `Report for job ${jobId} not found.` });
    }

    const finalScore = reviewData.finalScore !== undefined ? reviewData.finalScore : reportRow.overall_score;

    db.prepare(`
      UPDATE audit_reports
      SET reviewer_review_json = ?,
          overall_score = ?,
          updated_at = ?
      WHERE job_id = ?
    `).run(JSON.stringify(reviewData), finalScore, now, jobId);

    // Also update parent audit job status to Completed with finalScore
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Completed',
          progress = 100,
          score = ?,
          updated_at = ?
      WHERE id = ?
    `).run(finalScore, now, jobId);

    res.json({ success: true, updatedScore: finalScore });
  } catch (err: any) {
    console.error('[API POST /api/reports/:jobId/review] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   5. RUBRIC SETTINGS API (/api/rubrics)
   ========================================================================== */

app.get('/api/rubrics', (_req, res) => {
  try {
    const row: any = db.prepare("SELECT * FROM rubric_settings WHERE id = 'rubric-8factor-v5'").get();
    if (row && row.weights_json) {
      return res.json({ weights: JSON.parse(row.weights_json) });
    }
    res.json({
      weights: {
        greeting: 10,
        needAnalysis: 15,
        curriculum: 15,
        placement: 20,
        pricing: 15,
        objection: 10,
        urgency: 10,
        softSkills: 5,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rubrics', (req, res) => {
  try {
    const { weights } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO rubric_settings (id, weights_json, updated_at, updated_by)
      VALUES ('rubric-8factor-v5', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weights_json = excluded.weights_json,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run(JSON.stringify(weights), now, currentSessionUser?.email || 'admin');

    res.json({ success: true, weights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   6. AUDIO UPLOAD & STREAMING API (/api/audio)
   ========================================================================== */

app.post('/api/audio/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    res.status(201).json({
      success: true,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      audioUrl: `/api/audio/stream/${req.file.filename}`,
    });
  } catch (err: any) {
    console.error('[API /api/audio/upload] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audio/stream/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('[API /api/audio/stream] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   7. VITE DEV MIDDLEWARE / STATIC ASSETS
   ========================================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(rootDir, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NxtWave AI Audit Platform running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
