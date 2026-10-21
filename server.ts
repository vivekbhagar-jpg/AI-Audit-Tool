/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Server for NxtWave AI Audit Platform
 * Node.js + Express + SQLite with Durable Background Processing Worker
 * and Server-Side Integrations for Google Drive, Speech Transcription, and Gemini AI.
 */

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

import { db, initDatabase } from './server/db.js';
import { 
  sessionMiddleware, 
  requireAuth, 
  requireRole, 
  requireCsrf, 
  checkLoginRateLimit, 
  recordLoginAttempt, 
  RequestWithAuth 
} from './server/auth.js';
import { parseGoogleDriveUrl, RECORDINGS_TMP_DIR } from './server/drive.js';
import { 
  startAuditWorker, 
  stopAuditWorker, 
  retryJob, 
  cancelJob, 
  logAuditEvent 
} from './server/worker.js';
import { validateProductStage, loadRubricWeights } from './server/auditEngine.js';
import { 
  PRODUCTS, 
  PRODUCT_STAGE_MAP, 
  getStagesForProduct 
} from './src/config/callStages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

// Initialize database schema and migrations
initDatabase();

// Start persistent background audit queue worker
startAuditWorker(2500);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Middleware for parsing JSON, urlencoded forms, and cookies
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser(SESSION_SECRET));
app.use(sessionMiddleware);

/* ==========================================================================
   0. SYSTEM HEALTH & DIAGNOSTICS API
   ========================================================================== */

app.get('/api/health', (_req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    const isDbConnected = dbCheck?.healthy === 1;
    res.json({
      status: isDbConnected ? 'healthy' : 'degraded',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/diagnostics', requireAuth, requireRole('admin'), (_req, res) => {
  try {
    const jobStats = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM audit_jobs 
      GROUP BY status
    `).all() as any[];

    const recentEvents = db.prepare(`
      SELECT * FROM audit_events 
      ORDER BY created_at DESC 
      LIMIT 25
    `).all();

    const activeSessionsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?
    `).get(new Date().toISOString()) as any)?.count || 0;

    const knowledgeCount = (db.prepare(`
      SELECT COUNT(*) as count FROM knowledge_docs WHERE status = 'Active'
    `).get() as any)?.count || 0;

    res.json({
      systemTime: new Date().toISOString(),
      nodeVersion: process.version,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY'),
      googleDriveTokenConfigured: Boolean(process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_DRIVE_API_KEY),
      activeSessions: activeSessionsCount,
      activeKnowledgeDocs: knowledgeCount,
      jobStatusBreakdown: jobStats,
      recentAuditEvents: recentEvents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   1. PRODUCTS & STAGES CONFIG API
   ========================================================================== */

app.get('/api/config/products-and-stages', (_req, res) => {
  res.json({
    products: PRODUCTS,
    productStageMap: PRODUCT_STAGE_MAP
  });
});

/* ==========================================================================
   2. AUTHENTICATION & SESSION API (/api/auth)
   ========================================================================== */

app.get('/api/auth/setup-status', (_req, res) => {
  try {
    const admin: any = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
    const isConfigured = Boolean(
      admin && 
      admin.password_hash && 
      (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$'))
    );
    res.json({
      adminConfigured: isConfigured,
      adminEmail: admin ? admin.email : 'vivekbhagar@gmail.com'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/setup-admin', async (req, res) => {
  try {
    const admin: any = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
    const isConfigured = Boolean(
      admin && 
      admin.password_hash && 
      (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$'))
    );
    if (isConfigured) {
      return res.status(403).json({ error: 'Administrator is already configured. Please sign in.' });
    }

    const { password, email } = req.body;
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const targetEmail = (email && typeof email === 'string' && email.trim())
      ? email.trim().toLowerCase()
      : (admin?.email || 'vivekbhagar@gmail.com');

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();

    if (admin) {
      db.prepare('UPDATE users SET email = ?, password_hash = ?, updated_at = ? WHERE id = ?')
        .run(targetEmail, passwordHash, now, admin.id);
    } else {
      db.prepare(`
        INSERT INTO users (id, email, display_name, role, team, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 'Platform Administration', ?, ?, ?)
      `).run('usr-admin-vb', targetEmail, 'Vivek Bhagar (Super Admin)', passwordHash, now, now);
    }

    const updatedAdmin: any = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, csrf_token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, updatedAdmin.id, csrfToken, now, expiresAt);

    res.cookie('session_token', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    const profile = {
      uid: updatedAdmin.id,
      email: updatedAdmin.email,
      displayName: updatedAdmin.display_name,
      role: updatedAdmin.role,
      team: updatedAdmin.team,
    };

    res.json({
      success: true,
      user: profile,
      userProfile: profile,
      csrfToken
    });
  } catch (err: any) {
    console.error('[API /api/auth/setup-admin] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req: RequestWithAuth, res) => {
  if (req.user && req.sessionInfo) {
    res.json({
      user: {
        uid: req.user.id,
        email: req.user.email,
        displayName: req.user.displayName,
        role: req.user.role,
        team: req.user.team,
      },
      userProfile: {
        uid: req.user.id,
        email: req.user.email,
        displayName: req.user.displayName,
        role: req.user.role,
        team: req.user.team,
      },
      csrfToken: req.sessionInfo.csrfToken
    });
  } else {
    res.json({ user: null, userProfile: null, csrfToken: null });
  }
});

app.get('/api/auth/csrf', (req: RequestWithAuth, res) => {
  if (req.sessionInfo?.csrfToken) {
    res.json({ csrfToken: req.sessionInfo.csrfToken });
  } else {
    res.status(401).json({ error: 'No active session.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Rate limiting check
    const rateLimit = checkLoginRateLimit(ip, email);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${Math.ceil((rateLimit.retryAfterSeconds || 900) / 60)} minutes before trying again.`
      });
    }

    const userRow: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());

    if (!userRow || !userRow.password_hash) {
      recordLoginAttempt(ip, email, false);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isPasswordValid) {
      recordLoginAttempt(ip, email, false);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    recordLoginAttempt(ip, email, true);

    // Generate secure session token and CSRF token
    const sessionId = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, csrf_token, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userRow.id, csrfToken, now, expiresAt);

    res.cookie('session_token', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    const profile = {
      uid: userRow.id,
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
      team: userRow.team,
    };

    res.json({
      success: true,
      user: profile,
      userProfile: profile,
      csrfToken
    });
  } catch (err: any) {
    console.error('[API /api/auth/login] Error:', err);
    res.status(500).json({ error: 'An unexpected authentication error occurred.' });
  }
});

app.post('/api/auth/logout', (req: RequestWithAuth, res) => {
  try {
    const sessionToken = req.cookies?.session_token;
    if (sessionToken) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToken);
    }
    res.clearCookie('session_token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   3. USER MANAGEMENT API (/api/users) - Admin Only
   ========================================================================== */

app.get('/api/users', requireAuth, requireRole('admin'), (_req, res) => {
  try {
    const users = db.prepare('SELECT id, email, display_name, role, team, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAuth, requireRole('admin'), requireCsrf, async (req: RequestWithAuth, res) => {
  try {
    const { email, displayName, role, team, password } = req.body;
    if (!email || !displayName || !role) {
      return res.status(400).json({ error: 'Email, display name, and role are required.' });
    }

    const cleanRole = role.toLowerCase().trim();
    if (!['admin', 'auditor', 'lead', 'counsellor'].includes(cleanRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, auditor, lead, or counsellor.' });
    }

    const now = new Date().toISOString();
    const id = `usr-${cleanRole}-${Date.now().toString().slice(-4)}`;
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    db.prepare(`
      INSERT INTO users (id, email, display_name, role, team, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), displayName.trim(), cleanRole, team || 'General', passwordHash, now, now);

    res.status(201).json({
      success: true,
      user: { id, email, displayName, role: cleanRole, team: team || 'General' }
    });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/role', requireAuth, requireRole('admin'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const cleanRole = (role || '').toLowerCase().trim();

    if (!['admin', 'auditor', 'lead', 'counsellor'].includes(cleanRole)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .run(cleanRole, new Date().toISOString(), id);

    res.json({ success: true, role: cleanRole });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   4. KNOWLEDGE BASE API (/api/knowledge)
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

app.post('/api/knowledge', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
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

    res.status(201).json({ success: true, doc: { ...doc, id } });
  } catch (err: any) {
    console.error('[API POST /api/knowledge] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/knowledge/:id', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    const { product, stage, status, title, version, summary } = req.body;
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
          title = COALESCE(?, title),
          version = COALESCE(?, version),
          summary = COALESCE(?, summary),
          updated_at = ?
      WHERE id = ?
    `).run(product ?? null, stage ?? null, status ?? null, title ?? null, version ?? null, summary ?? null, now, id);

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

app.delete('/api/knowledge/:id', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   5. RUBRIC SETTINGS API (/api/rubrics)
   ========================================================================== */

app.get('/api/rubrics', (_req, res) => {
  try {
    const weights = loadRubricWeights();
    res.json({ weights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rubrics', requireAuth, requireRole('admin'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { weights } = req.body;
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({ error: 'Rubric weights object is required.' });
    }

    const totalWeight = Object.values(weights).reduce((a: any, b: any) => Number(a) + Number(b), 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ error: `Total rubric weight must sum to 100%. Received: ${totalWeight}%.` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO rubric_settings (id, weights_json, updated_at, updated_by)
      VALUES ('rubric-8factor-v5', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weights_json = excluded.weights_json,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run(JSON.stringify(weights), now, req.user?.email || 'admin');

    res.json({ success: true, weights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   6. AUDIT JOBS API (/api/jobs) - Google Drive Only
   ========================================================================== */

app.get('/api/jobs', requireAuth, (req: RequestWithAuth, res) => {
  try {
    const user = req.user!;
    const isCounsellor = user.role === 'counsellor';
    
    let query = 'SELECT * FROM audit_jobs WHERE is_sample = 0';
    const params: any[] = [];

    // Role-based scoping: counsellors only see their own assigned calls
    if (isCounsellor) {
      query += ' AND (LOWER(counsellor_email) = LOWER(?) OR LOWER(counsellor_name) LIKE ? OR submitted_by = ?)';
      params.push(user.email, `%${user.displayName}%`, user.id);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params) as any[];

    const jobs = rows.map((r) => ({
      id: r.id,
      recordingName: r.recording_name,
      driveUrl: r.drive_url,
      driveFileId: r.drive_file_id,
      audioPath: r.audio_path,
      counsellorName: r.counsellor_name,
      counsellorEmpId: r.counsellor_emp_id,
      counsellorEmail: r.counsellor_email,
      team: r.team || `${r.product} Team`,
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
      retryCount: r.retry_count,
      errorMessage: r.error_message,
      isRetryable: Boolean(r.is_retryable),
      notes: r.notes,
    }));

    res.json({ jobs });
  } catch (err: any) {
    console.error('[API /api/jobs] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id', requireAuth, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    const r: any = db.prepare('SELECT * FROM audit_jobs WHERE id = ?').get(id);
    if (!r) {
      return res.status(404).json({ error: `Audit job ${id} not found.` });
    }

    // Role check: counsellors can only inspect their own calls
    if (req.user?.role === 'counsellor') {
      const matchEmail = (r.counsellor_email || '').toLowerCase() === req.user.email.toLowerCase();
      const matchName = (r.counsellor_name || '').toLowerCase().includes(req.user.displayName.toLowerCase());
      const matchUid = r.submitted_by === req.user.id;
      if (!matchEmail && !matchName && !matchUid) {
        return res.status(403).json({ error: 'Access forbidden: You cannot view audit jobs assigned to other counsellors.' });
      }
    }

    res.json({
      job: {
        id: r.id,
        recordingName: r.recording_name,
        driveUrl: r.drive_url,
        driveFileId: r.drive_file_id,
        audioPath: r.audio_path,
        counsellorName: r.counsellor_name,
        counsellorEmpId: r.counsellor_emp_id,
        counsellorEmail: r.counsellor_email,
        team: r.team || `${r.product} Team`,
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
        retryCount: r.retry_count,
        errorMessage: r.error_message,
        isRetryable: Boolean(r.is_retryable),
        notes: r.notes,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new audit job.
 * RESTRICTION: Google Drive links only! Direct audio file upload is disabled.
 */
app.post('/api/jobs', requireAuth, requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const job = req.body;

    if (!job.driveUrl || typeof job.driveUrl !== 'string' || !job.driveUrl.trim()) {
      return res.status(400).json({
        error: 'A valid Google Drive recording share URL is strictly required. Direct file uploads are disabled.'
      });
    }

    // Server-side Google Drive URL parsing & SSRF validation
    const driveParsed = parseGoogleDriveUrl(job.driveUrl);
    if (!driveParsed.valid || !driveParsed.fileId) {
      return res.status(400).json({
        error: driveParsed.error || 'Invalid Google Drive recording link.'
      });
    }

    // Validate product and stage pairing
    try {
      validateProductStage(job.product, job.stage);
    } catch (valErr: any) {
      return res.status(400).json({ error: valErr.message });
    }

    if (!job.counsellorName || !job.counsellorEmpId) {
      return res.status(400).json({ error: 'Counsellor Name and Employee ID are required.' });
    }

    const now = new Date().toISOString();
    const id = job.id || `job-nw-${Date.now().toString().slice(-4)}`;
    const recordingIdentifier = job.recordingName || `Drive_Recording_${driveParsed.fileId}.mp3`;

    db.prepare(`
      INSERT INTO audit_jobs (
        id, recording_name, drive_url, drive_file_id, audio_path, counsellor_name, counsellor_emp_id,
        counsellor_email, team, product, stage, language, duration, submitted_at,
        submitted_by, status, progress, score, critical_violation_count, is_sample,
        retry_count, max_retries, error_message, is_retryable, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Queued', 0, NULL, 0, 0, 0, 3, NULL, 1, ?, ?, ?)
    `).run(
      id,
      recordingIdentifier,
      job.driveUrl.trim(),
      driveParsed.fileId,
      null,
      job.counsellorName.trim(),
      job.counsellorEmpId.trim().toUpperCase(),
      job.counsellorEmail || req.user?.email || '',
      job.team || `${job.product} Team`,
      job.product,
      job.stage,
      job.language || 'Hinglish (Hindi + English)',
      job.duration || '20m 00s',
      now.replace('T', ' ').slice(0, 16),
      req.user?.id || 'usr-system',
      job.notes || 'Queued for automatic Google Drive audio download, diariation, and Gemini 8-Factor audit.',
      now,
      now
    );

    logAuditEvent(id, 'JOB_CREATED', `Audit job ${id} registered from Google Drive link (${driveParsed.fileId}).`);

    res.status(201).json({
      success: true,
      job: {
        id,
        recordingName: recordingIdentifier,
        driveUrl: job.driveUrl.trim(),
        driveFileId: driveParsed.fileId,
        counsellorName: job.counsellorName.trim(),
        counsellorEmpId: job.counsellorEmpId.trim().toUpperCase(),
        product: job.product,
        stage: job.stage,
        status: 'Queued',
        progress: 0
      }
    });
  } catch (err: any) {
    console.error('[API POST /api/jobs] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/retry', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const result = retryJob(id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: `Job ${id} has been requeued for audit.` });
});

app.post('/api/jobs/:id/cancel', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const result = cancelJob(id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: `Job ${id} cancelled.` });
});

app.delete('/api/jobs/:id', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM audit_reports WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM transcripts WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM audit_jobs WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   7. TRANSCRIPTS API (/api/jobs/:id/transcript)
   ========================================================================== */

app.get('/api/jobs/:id/transcript', requireAuth, (req: RequestWithAuth, res) => {
  try {
    const { id } = req.params;
    const row: any = db.prepare('SELECT * FROM transcripts WHERE job_id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Transcript not ready or not generated yet for this job.' });
    }

    res.json({
      transcript: {
        id: row.id,
        jobId: row.job_id,
        language: row.language,
        durationSeconds: row.duration_seconds,
        provider: row.provider,
        rawText: row.raw_text,
        turns: row.turns_json ? JSON.parse(row.turns_json) : [],
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
        createdAt: row.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   8. AUDIT REPORTS API (/api/reports)
   ========================================================================== */

app.get('/api/reports', requireAuth, (req: RequestWithAuth, res) => {
  try {
    const user = req.user!;
    let query = 'SELECT * FROM audit_reports WHERE is_sample = 0';
    const params: any[] = [];

    if (user.role === 'counsellor') {
      query += ' AND (LOWER(counsellor_name) LIKE ?)';
      params.push(`%${user.displayName.toLowerCase()}%`);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params) as any[];

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
      criteriaBreakdown: row.criteria_scores_json ? JSON.parse(row.criteria_scores_json) : [],
      criticalViolations: row.critical_violations_json ? JSON.parse(row.critical_violations_json) : [],
      missingNarratives: row.missing_narratives_json ? JSON.parse(row.missing_narratives_json) : [],
      unsupportedClaims: row.unsupported_claims_json ? JSON.parse(row.unsupported_claims_json) : [],
      coachingRecommendations: row.coaching_recommendations_json ? JSON.parse(row.coaching_recommendations_json) : [],
      transcript: row.transcript_json ? JSON.parse(row.transcript_json) : [],
      reviewerReview: row.reviewer_review_json ? JSON.parse(row.reviewer_review_json) : null,
    }));

    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:jobId', requireAuth, (req: RequestWithAuth, res) => {
  try {
    const { jobId } = req.params;
    const row: any = db.prepare('SELECT * FROM audit_reports WHERE job_id = ?').get(jobId);

    if (!row) {
      return res.status(404).json({
        error: 'Audit report not generated yet for this recording.',
        jobId,
        report: null
      });
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
      criteriaBreakdown: row.criteria_scores_json ? JSON.parse(row.criteria_scores_json) : [],
      criticalViolations: row.critical_violations_json ? JSON.parse(row.critical_violations_json) : [],
      missingNarratives: row.missing_narratives_json ? JSON.parse(row.missing_narratives_json) : [],
      unsupportedClaims: row.unsupported_claims_json ? JSON.parse(row.unsupported_claims_json) : [],
      coachingRecommendations: row.coaching_recommendations_json ? JSON.parse(row.coaching_recommendations_json) : [],
      transcript: row.transcript_json ? JSON.parse(row.transcript_json) : [],
      reviewerReview: row.reviewer_review_json ? JSON.parse(row.reviewer_review_json) : {
        auditorName: req.user?.displayName || 'QA Auditor',
        auditorEmail: req.user?.email || 'qa@nxtwave.tech',
        status: 'Draft',
        originalScore: row.overall_score,
        finalScore: row.overall_score,
        notes: ''
      },
    };

    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Human Auditor Sign-off and Score Override
 */
app.post('/api/reports/:jobId/review', requireAuth, requireRole('admin', 'auditor'), requireCsrf, (req: RequestWithAuth, res) => {
  try {
    const { jobId } = req.params;
    const reviewData = req.body;
    const now = new Date().toISOString();

    const reportRow: any = db.prepare('SELECT * FROM audit_reports WHERE job_id = ?').get(jobId);
    if (!reportRow) {
      return res.status(404).json({ error: `Cannot sign off: No genuine audit report exists for job ${jobId}.` });
    }

    const originalScore = reportRow.overall_score;
    const finalScore = reviewData.finalScore !== undefined ? Number(reviewData.finalScore) : originalScore;

    const reviewerReviewRecord = {
      auditorName: req.user?.displayName || reviewData.auditorName || 'QA Auditor',
      auditorEmail: req.user?.email || reviewData.auditorEmail || 'audits@nxtwave.tech',
      status: reviewData.status || 'Approved',
      originalScore,
      finalScore,
      overrideReason: reviewData.overrideReason || '',
      notes: reviewData.notes || '',
      signedAt: now
    };

    db.prepare(`
      UPDATE audit_reports
      SET reviewer_review_json = ?,
          overall_score = ?,
          updated_at = ?
      WHERE job_id = ?
    `).run(JSON.stringify(reviewerReviewRecord), finalScore, now, jobId);

    // Update parent audit job status to Completed
    db.prepare(`
      UPDATE audit_jobs
      SET status = 'Completed',
          progress = 100,
          score = ?,
          assigned_auditor = ?,
          updated_at = ?
      WHERE id = ?
    `).run(finalScore, req.user?.displayName || 'QA Auditor', now, jobId);

    logAuditEvent(jobId, 'AUDIT_SIGN_OFF', `Auditor ${req.user?.email} signed off report with final score ${finalScore} (Original: ${originalScore}).`);

    res.json({
      success: true,
      updatedScore: finalScore,
      reviewerReview: reviewerReviewRecord
    });
  } catch (err: any) {
    console.error('[API POST /api/reports/:jobId/review] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   9. CONTROLLED AUDIO STREAMING API (/api/audio/stream/:filename)
   ========================================================================== */

app.get('/api/audio/stream/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(RECORDINGS_TMP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found or already cleaned up.' });
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
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   10. VITE DEV MIDDLEWARE / STATIC ASSETS
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
