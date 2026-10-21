/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Local SQLite database layer for NxtWave AI Audit Platform
 * Using built-in Node 22+ node:sqlite
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const recordingsDir = path.join(rootDir, 'tmp', 'recordings');

// Ensure storage directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'nxtwave_audit.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'auditor', 'lead', 'counsellor')),
      team TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      product TEXT NOT NULL,
      stage TEXT,
      version TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      file_size TEXT,
      file_type TEXT,
      status TEXT NOT NULL,
      clauses_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      clauses_json TEXT,
      prohibited_claims_json TEXT,
      approved_pitch_notes_json TEXT,
      full_content_snippet TEXT,
      storage_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_jobs (
      id TEXT PRIMARY KEY,
      recording_name TEXT NOT NULL,
      drive_url TEXT,
      audio_path TEXT,
      counsellor_name TEXT NOT NULL,
      counsellor_emp_id TEXT NOT NULL,
      counsellor_email TEXT,
      product TEXT NOT NULL,
      stage TEXT NOT NULL,
      language TEXT NOT NULL,
      duration TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      submitted_by TEXT,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      critical_violation_count INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_reports (
      id TEXT PRIMARY KEY,
      job_id TEXT UNIQUE NOT NULL,
      counsellor_name TEXT NOT NULL,
      counsellor_emp_id TEXT NOT NULL,
      team TEXT NOT NULL,
      product TEXT NOT NULL,
      stage TEXT NOT NULL,
      language TEXT NOT NULL,
      duration TEXT NOT NULL,
      call_date TEXT NOT NULL,
      audit_date TEXT NOT NULL,
      overall_score INTEGER NOT NULL,
      max_score INTEGER NOT NULL DEFAULT 100,
      compliance_tier TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      criteria_scores_json TEXT NOT NULL,
      critical_violations_json TEXT,
      observations_json TEXT,
      transcript_json TEXT,
      reviewer_review_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES audit_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rubric_settings (
      id TEXT PRIMARY KEY,
      weights_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      job_id TEXT UNIQUE NOT NULL,
      language TEXT NOT NULL,
      duration_seconds REAL,
      provider TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      turns_json TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES audit_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      email TEXT NOT NULL,
      attempted_at TEXT NOT NULL,
      success INTEGER NOT NULL
    );
  `);

  runMigrations();
  seedInitialData();
}

function runMigrations() {
  const addColumnIfNotExists = (table: string, colName: string, colDef: string) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some(c => c.name === colName)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef};`);
      }
    } catch (err) {
      console.warn(`[Migration] Could not add ${colName} to ${table}:`, err);
    }
  };

  // audit_jobs columns
  addColumnIfNotExists('audit_jobs', 'drive_file_id', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'drive_metadata_json', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'retry_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('audit_jobs', 'max_retries', 'INTEGER NOT NULL DEFAULT 3');
  addColumnIfNotExists('audit_jobs', 'error_message', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'is_retryable', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfNotExists('audit_jobs', 'worker_locked_at', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'team', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'assigned_auditor', 'TEXT');
  addColumnIfNotExists('audit_jobs', 'raw_transcript', 'TEXT');

  // audit_reports columns
  addColumnIfNotExists('audit_reports', 'missing_narratives_json', 'TEXT');
  addColumnIfNotExists('audit_reports', 'unsupported_claims_json', 'TEXT');
  addColumnIfNotExists('audit_reports', 'coaching_recommendations_json', 'TEXT');
  addColumnIfNotExists('audit_reports', 'model_identifier', 'TEXT');
  addColumnIfNotExists('audit_reports', 'prompt_version', 'TEXT');

  // Performance and lookup indexes
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_jobs_status ON audit_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_audit_jobs_submitted_by ON audit_jobs(submitted_by);
      CREATE INDEX IF NOT EXISTS idx_audit_reports_job_id ON audit_reports(job_id);
      CREATE INDEX IF NOT EXISTS idx_transcripts_job_id ON transcripts(job_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(ip, email, attempted_at);
      CREATE INDEX IF NOT EXISTS idx_audit_events_job_id ON audit_events(job_id);
    `);
  } catch (err) {
    console.warn('[Migration] Index creation warning:', err);
  }
}

function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Initial administrator provisioning from server environment variables if configured
  // Never ship default passwords, plaintext passwords, or reusable credentials.
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'vivekbhagar@gmail.com').toLowerCase().trim();
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get() as any;

  if (initialAdminPassword) {
    const passwordHash = bcrypt.hashSync(initialAdminPassword, 12);
    if (!existingAdmin) {
      db.prepare(`
        INSERT INTO users (id, email, display_name, role, team, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', 'Platform Administration', ?, ?, ?)
      `).run('usr-admin-vb', adminEmail, 'Vivek Bhagar (Super Admin)', passwordHash, now, now);
      console.log('[SQLite] Initial Super Admin account provisioned from environment variables.');
    } else {
      db.prepare(`
        UPDATE users SET email = ?, password_hash = ?, updated_at = ? WHERE id = ?
      `).run(adminEmail, passwordHash, now, existingAdmin.id);
    }
  }

  // 2. Seed default rubric weights
  const rubricCount = (db.prepare('SELECT COUNT(*) as count FROM rubric_settings').get() as { count: number }).count;
  if (rubricCount === 0) {
    const defaultWeights = {
      greeting: 10,
      needAnalysis: 15,
      curriculum: 15,
      placement: 20,
      pricing: 15,
      objection: 10,
      urgency: 10,
      softSkills: 5,
    };
    db.prepare(`
      INSERT INTO rubric_settings (id, weights_json, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
    `).run('rubric-8factor-v5', JSON.stringify(defaultWeights), now, 'system');
    console.log('[SQLite] Seeded default 8-factor rubric weights.');
  }

  // 3. Seed knowledge docs if empty
  const docCount = (db.prepare('SELECT COUNT(*) as count FROM knowledge_docs').get() as { count: number }).count;
  if (docCount === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO knowledge_docs (
        id, title, category, product, stage, version, last_updated,
        file_size, file_type, status, clauses_count, summary,
        clauses_json, prohibited_claims_json, approved_pitch_notes_json,
        full_content_snippet, storage_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialDocs = [
      {
        id: 'kb-doc-01',
        title: 'CCBP 4.0 - Approved Sales Pitch & Narrative Guidelines v3.2',
        category: 'Narratives',
        product: 'Academy',
        stage: 'Lead Qualification Call',
        version: 'v3.2',
        lastUpdated: '2026-09-18',
        fileSize: '2.4 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 42,
        summary: 'Master narrative guideline covering student qualification, tech transformation mindset, practical coding labs, and mentor-led IRC support.',
        prohibitedClaims: [
          'Never guarantee 100% placement without mentioning student eligibility criteria & 85% attendance prerequisite.',
          'Never state that coding requires no practice or can be mastered in 15 days.',
          'Do not disparage conventional engineering colleges or degrees.',
          'Do not fabricate alumni placement stories not verified in the official hall of fame.'
        ],
        approvedPitchNotes: [
          'Highlight 4.0 industry readiness curriculum (Python, SQL, React, Node.js, System Design basics).',
          'Explain the IRC (Industry Readiness Cell) mock interviews with working tech professionals.',
          'Walk through the day-in-the-life of a CCBP learner with bite-sized video lessons & hands-on code playground.',
          'Clearly disclose the expected weekly effort of 15 to 20 hours.'
        ],
        fullContentSnippet: 'CCBP 4.0 ACADEMY NARRATIVE FRAMEWORK (CONFIDENTIAL - INTERNAL ONLY)...'
      },
      {
        id: 'kb-doc-02',
        title: 'Standard Fee Matrix, Scholarship Slabs & EMI Policy Q4 2026',
        category: 'Pricing and Policies',
        product: 'All Programs',
        stage: 'All Stages',
        version: 'v4.1',
        lastUpdated: '2026-10-02',
        fileSize: '1.8 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 28,
        summary: 'Official pricing schedule, merit scholarship discount bands, 0% interest NBFC loan partners (Bajaj, Propelld, Liquiloans), and refund cancellation terms.',
        prohibitedClaims: [
          'Never offer unapproved "spot cash discounts" or verbally waive standard onboarding fees.',
          'Never promise guaranteed refund after the 7-day initial cooling-off window.',
          'Do not mislead students into thinking NBFC loan installments are flexible or interest-free if paid late.',
          'Never ask students to share OTP or banking passwords on the call.'
        ],
        approvedPitchNotes: [
          'Standard CCBP 4.0 Academy Fee: ₹75,000 + GST (Total: ₹88,500).',
          'Scholarship test (NXT-SAT) awards 10% to 35% based strictly on test percentile score.',
          'No-cost EMI available for 6, 9, or 12 months with valid Aadhaar and PAN verification.',
          '7-day unconditional refund policy starts from batch start date, subject to ₹2,500 registration charge.'
        ],
        fullContentSnippet: 'FINANCIAL COMPLIANCE & LOAN FACILITATION POLICY...'
      },
      {
        id: 'kb-doc-03',
        title: 'Career Assurance & Anti-Misrepresentation Compliance Manual',
        category: 'Pricing and Policies',
        product: 'Intensive',
        stage: 'DM Call/VC',
        version: 'v2.8',
        lastUpdated: '2026-08-22',
        fileSize: '1.1 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 35,
        summary: 'Regulatory compliance rules regarding edtech career guarantees, legal disclosures, and ethical counselling guidelines.',
        prohibitedClaims: [
          'Zero-tolerance: Any promise of "No interviews needed, direct joining letter" leads to immediate termination.',
          'Do not quote minimum starting CTC of more than ₹4.5 LPA unless specific to the Super-60 elite cohort.',
          'Do not claim government accreditation or UGC degree granting status; NxtWave is a skilling accelerator.',
          'Never pressure candidates with false artificial countdowns.'
        ],
        approvedPitchNotes: [
          'Accurate placement track record: Over 18,000+ learners placed across 3,000+ companies.',
          'Average CTC band: ₹4.5 LPA to ₹12 LPA depending on performance tier.',
          'Interview clearance assistance with up to 10 company referral drives.',
          'Transparent portfolio requirement: 4 production-grade projects deployed on GitHub and live domains.'
        ],
        fullContentSnippet: 'ANTI-MISREPRESENTATION DIRECTIVE (ASCI & LEGAL COMPLIANCE)...'
      },
      {
        id: 'kb-doc-04',
        title: 'NxtWave 8-Factor Quality Audit Rubric (Audio & Speech QA)',
        category: 'Audit Rubrics',
        product: 'All Programs',
        stage: 'All Stages',
        version: 'v5.0',
        lastUpdated: '2026-10-01',
        fileSize: '950 KB',
        fileType: 'docx',
        status: 'Active',
        clausesCount: 50,
        summary: 'Core evaluation rubric used to score call recordings across 8 dimensions out of 100 points, with automatic zero-tolerance disqualifiers.',
        prohibitedClaims: [
          'Rubric prohibits any auditor from waiving a Critical Zero-Tolerance violation without VP approval.'
        ],
        approvedPitchNotes: [
          'Dimension 1: Greeting & Rapport Building (10 pts)',
          'Dimension 2: Need Analysis & Student Profiling (15 pts)',
          'Dimension 3: Curriculum & Pedagogy Accuracy (15 pts)',
          'Dimension 4: Placement & Career Claims Adherence (20 pts) [CRITICAL]',
          'Dimension 5: Pricing, Scholarship & EMI Transparency (15 pts) [CRITICAL]',
          'Dimension 6: Objection Handling & Empathy (10 pts)',
          'Dimension 7: Urgency & Ethical Next Steps (10 pts)',
          'Dimension 8: Professional Tone & Hinglish Language Clarity (5 pts)'
        ],
        fullContentSnippet: 'SCORING BENCHMARK SPECIFICATIONS...'
      },
      {
        id: 'kb-doc-05',
        title: 'CCBP Intensive 2.0 - Non-CS to Tech Career Transition Syllabus',
        category: 'Product Knowledge',
        product: 'Intensive',
        stage: 'Student Realisation Call/BOB Call',
        version: 'v2.1',
        lastUpdated: '2026-09-05',
        fileSize: '3.1 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 38,
        summary: 'Detailed module syllabus, lab assignments, project specifications, and eligibility criteria for non-engineering transitions.',
        prohibitedClaims: [
          'Do not say math skills are unnecessary for data structures.',
          'Do not guarantee completion in 3 months; minimum recommended duration is 8 months for non-CS graduates.'
        ],
        approvedPitchNotes: [
          'Foundational module: Computational thinking & Python from ground zero.',
          'Full stack track: React.js, Node.js, Express, SQLite, PostgreSQL.',
          'Practical capstone: Building full-fledged e-commerce or video streaming web app with authentication.',
          'Daily 2-hour doubt clarification rooms staffed by senior teaching assistants.'
        ],
        fullContentSnippet: 'CCBP INTENSIVE TECHNICAL SYLLABUS...'
      },
      {
        id: 'kb-doc-07',
        title: 'NIAT - Admissions Interview & Evaluation Playbook v2.0',
        category: 'Narratives',
        product: 'NIAT',
        stage: 'Interview VC',
        version: 'v2.0',
        lastUpdated: '2026-10-05',
        fileSize: '1.7 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 22,
        summary: 'Candidate interview evaluation framework for NIAT cohorts, testing analytical thinking and problem-solving mindset.',
        prohibitedClaims: [
          'Never guarantee admissions selection before panel sign-off.',
          'Do not quote arbitrary entrance test score waivers.'
        ],
        approvedPitchNotes: [
          'Assess problem-solving logic over rote theoretical knowledge.',
          'Explain the full-time immersive experiential engineering track.'
        ],
        fullContentSnippet: 'NIAT INTERVIEW PLAYBOOK...'
      },
      {
        id: 'kb-doc-08',
        title: 'NIAT - Academy Integrated Cohort Orientation Script',
        category: 'Product Knowledge',
        product: 'NIAT - Academy',
        stage: 'Student Realisation Call/BOB Call',
        version: 'v1.5',
        lastUpdated: '2026-10-08',
        fileSize: '2.1 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 19,
        summary: 'Dual-track curriculum orientation integrating NIAT industry modules with Academy foundation labs.',
        prohibitedClaims: ['Do not overpromise timeline accelerations without academic milestones.'],
        approvedPitchNotes: [
          'Outline concurrent project portfolio development.',
          'Highlight weekly technical assessment benchmarks.'
        ],
        fullContentSnippet: 'NIAT - ACADEMY INTEGRATED ORIENTATION SCRIPT...'
      },
      {
        id: 'kb-doc-09',
        title: 'IIT KGP OCN - Joint Certification Curriculum & Pedagogy Guidelines',
        category: 'Product Knowledge',
        product: 'IIT KGP OCN',
        stage: 'Student Realisation Call/BOB Call',
        version: 'v1.2',
        lastUpdated: '2026-10-10',
        fileSize: '1.9 MB',
        fileType: 'pdf',
        status: 'Active',
        clausesCount: 26,
        summary: 'Executive overview of the joint executive certification in partnership with IIT Kharagpur.',
        prohibitedClaims: [
          'Do not claim that students receive a degree from IIT Kharagpur; it is an executive certification programme.',
          'Never state that on-campus physical hostel residency is provided.'
        ],
        approvedPitchNotes: [
          'Highlight joint curriculum designed with IIT Kharagpur professors.',
          'Explain practical project evaluation and official certificate of completion with verification ID.',
          'Detail weekly doubt resolution sessions with certified industry teaching fellows.'
        ],
        fullContentSnippet: 'IIT KHARAGPUR OCN CERTIFICATION GUIDELINES...'
      }
    ];

    for (const doc of initialDocs) {
      insertDoc.run(
        doc.id,
        doc.title,
        doc.category,
        doc.product,
        doc.stage || null,
        doc.version,
        doc.lastUpdated,
        doc.fileSize,
        doc.fileType,
        doc.status,
        doc.clausesCount,
        doc.summary,
        JSON.stringify([]),
        JSON.stringify(doc.prohibitedClaims),
        JSON.stringify(doc.approvedPitchNotes),
        doc.fullContentSnippet,
        null,
        now,
        now
      );
    }
    console.log(`[SQLite] Seeded ${initialDocs.length} initial knowledge documents.`);
  }
}

// Initialise on import
initDatabase();
