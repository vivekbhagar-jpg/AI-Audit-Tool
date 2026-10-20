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

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(rootDir, 'uploads', 'audio');

// Ensure storage directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
  `);

  seedInitialData();
}

function seedInitialData() {
  const now = new Date().toISOString();

  // 1. Seed authoritative users
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, display_name, role, team, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('usr-admin-vb', 'vivekbhagar@gmail.com', 'Vivek Bhagar (Admin)', 'admin', 'Platform Administration', 'admin123', now, now);
    insertUser.run('usr-auditor-sr', 'sunita.rao@nxtwave.tech', 'Sunita Rao (Auditor)', 'auditor', 'Quality Assurance Lead', 'staff123', now, now);
    insertUser.run('usr-lead-rk', 'rajesh.kumar@nxtwave.tech', 'Rajesh Kumar (Lead)', 'lead', 'Admissions Quality Lead', 'staff123', now, now);
    insertUser.run('usr-counsellor-as', 'ananya.sen@nxtwave.tech', 'Ananya Sen (Counsellor)', 'counsellor', 'Admissions Counselling', 'staff123', now, now);
    console.log('[SQLite] Seeded 4 authoritative users.');
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

  // 4. Seed initial audit jobs if empty
  const jobCount = (db.prepare('SELECT COUNT(*) as count FROM audit_jobs').get() as { count: number }).count;
  if (jobCount === 0) {
    const insertJob = db.prepare(`
      INSERT INTO audit_jobs (
        id, recording_name, drive_url, audio_path, counsellor_name, counsellor_emp_id,
        counsellor_email, product, stage, language, duration, submitted_at,
        submitted_by, status, progress, score, critical_violation_count, is_sample,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const initialJobs = [
      {
        id: 'job-nw-8921',
        recordingName: 'NW_REC_20261014_RahulVerma_AmitKumar.mp3',
        driveUrl: 'https://drive.google.com/file/d/1A8b9qKxLmNoPqRsTuVwXyZ12345/view',
        counsellorName: 'Rahul Verma',
        counsellorEmpId: 'NW-4091',
        counsellorEmail: 'rahul.verma@nxtwave.tech',
        product: 'Academy',
        stage: 'DM Call/VC',
        language: 'Hinglish (Hindi + English)',
        duration: '28m 42s',
        submittedAt: '2026-10-14 16:30',
        submittedBy: 'usr-auditor-sr',
        status: 'Needs Review',
        progress: 100,
        score: 68,
        criticalViolationCount: 1,
        isSample: 1,
        notes: 'Severe placement claim deviation noted at 18:24. Requires auditor review.'
      },
      {
        id: 'job-nw-8920',
        recordingName: 'NW_REC_20261014_PoojaSharma_PriyaPatel.mp3',
        driveUrl: 'https://drive.google.com/file/d/1B7c8rLyMnOpQrStUvWxYz09876/view',
        counsellorName: 'Pooja Sharma',
        counsellorEmpId: 'NW-3820',
        counsellorEmail: 'pooja.sharma@nxtwave.tech',
        product: 'Intensive',
        stage: 'Student Realisation Call/BOB Call',
        language: 'Hinglish (Hindi + English)',
        duration: '34m 10s',
        submittedAt: '2026-10-14 15:15',
        submittedBy: 'usr-admin-vb',
        status: 'Completed',
        progress: 100,
        score: 94,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Exemplary pitch. Deep empathy, crystal clear fee breakdown and 0% EMI disclosure.'
      },
      {
        id: 'job-nw-8919',
        recordingName: 'NW_REC_20261014_KarthikReddy_SureshNaidu.mp3',
        driveUrl: 'https://drive.google.com/file/d/1C6d9sMzAoPqRsTuVwXyZa11223/view',
        counsellorName: 'Karthik Reddy',
        counsellorEmpId: 'NW-4215',
        counsellorEmail: 'karthik.reddy@nxtwave.tech',
        product: 'Academy',
        stage: 'Student Realisation Call/BOB Call',
        language: 'Telugu + English',
        duration: '22m 18s',
        submittedAt: '2026-10-14 14:00',
        submittedBy: 'usr-auditor-sr',
        status: 'Completed',
        progress: 100,
        score: 81,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Solid counselling. Missed mentioning the 4-phase mock interview schedule.'
      },
      {
        id: 'job-nw-8918',
        recordingName: 'NW_REC_20261014_SnehaRoy_RohanMehta.mp3',
        driveUrl: 'https://drive.google.com/file/d/1D5e8tNbBqRsTuVwXyZb33445/view',
        counsellorName: 'Sneha Roy',
        counsellorEmpId: 'NW-3950',
        counsellorEmail: 'sneha.roy@nxtwave.tech',
        product: 'NIAT',
        stage: 'Closure VC',
        language: 'Hindi (Pure)',
        duration: '19m 45s',
        submittedAt: '2026-10-14 11:40',
        submittedBy: 'usr-admin-vb',
        status: 'Completed',
        progress: 100,
        score: 52,
        criticalViolationCount: 2,
        isSample: 1,
        notes: 'Critical zero-tolerance failure: promised unapproved ₹15,000 spot cash waiver.'
      },
      {
        id: 'job-nw-8917',
        recordingName: 'NW_REC_20261015_VikasGupta_DeepakSingh.mp3',
        driveUrl: 'https://drive.google.com/file/d/1E4f7uOcCrStUvWxYzAc55667/view',
        counsellorName: 'Vikas Gupta',
        counsellorEmpId: 'NW-4310',
        counsellorEmail: 'vikas.gupta@nxtwave.tech',
        product: 'NIAT',
        stage: 'Interview VC',
        language: 'Hinglish (Hindi + English)',
        duration: '26m 05s',
        submittedAt: '2026-10-15 10:20',
        submittedBy: 'usr-auditor-sr',
        status: 'Auditing',
        progress: 72,
        score: null,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Audio transcription finished; running multi-dimensional knowledge base audit.'
      },
      {
        id: 'job-nw-8916',
        recordingName: 'NW_REC_20261015_PoojaSharma_AnanyaDas.mp3',
        driveUrl: 'https://drive.google.com/file/d/1F3g6vPdDsTuVwXyZaBd77889/view',
        counsellorName: 'Pooja Sharma',
        counsellorEmpId: 'NW-3820',
        counsellorEmail: 'pooja.sharma@nxtwave.tech',
        product: 'NIAT - Academy',
        stage: 'Lead Qualification Call',
        language: 'English',
        duration: '18m 50s',
        submittedAt: '2026-10-15 11:05',
        submittedBy: 'usr-auditor-sr',
        status: 'Transcribing',
        progress: 38,
        score: null,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Speech diaritization in progress via Hinglish acoustics model.'
      },
      {
        id: 'job-nw-8915',
        recordingName: 'NW_REC_20261015_AdityaNair_VishnuPrasad.mp3',
        driveUrl: 'https://drive.google.com/file/d/1G2h5wQeEtUvWxYzBcCe99001/view',
        counsellorName: 'Aditya Nair',
        counsellorEmpId: 'NW-4402',
        counsellorEmail: 'aditya.nair@nxtwave.tech',
        product: 'Intensive',
        stage: 'Lead Qualification Call',
        language: 'Hinglish (Hindi + English)',
        duration: '15m 30s',
        submittedAt: '2026-10-15 12:10',
        submittedBy: 'usr-admin-vb',
        status: 'Queued',
        progress: 0,
        score: null,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Queued in ingestion pipeline. Awaiting audio pre-processor slot.'
      },
      {
        id: 'job-nw-8914',
        recordingName: 'NW_REC_20261015_MeeraNambiar_SiddharthVerma.mp3',
        driveUrl: 'https://drive.google.com/file/d/1H1i4vRfFtVwXyZaCdDf00112/view',
        counsellorName: 'Meera Nambiar',
        counsellorEmpId: 'NW-4512',
        counsellorEmail: 'meera.nambiar@nxtwave.tech',
        product: 'IIT KGP OCN',
        stage: 'Student Realisation Call/BOB Call',
        language: 'English',
        duration: '24m 15s',
        submittedAt: '2026-10-15 13:45',
        submittedBy: 'usr-auditor-sr',
        status: 'Completed',
        progress: 100,
        score: 88,
        criticalViolationCount: 0,
        isSample: 1,
        notes: 'Excellent clarity on IIT KGP faculty credentials and live project capstones.'
      }
    ];

    for (const j of initialJobs) {
      insertJob.run(
        j.id,
        j.recordingName,
        j.driveUrl,
        null,
        j.counsellorName,
        j.counsellorEmpId,
        j.counsellorEmail,
        j.product,
        j.stage,
        j.language,
        j.duration,
        j.submittedAt,
        j.submittedBy,
        j.status,
        j.progress,
        j.score,
        j.criticalViolationCount,
        j.isSample,
        j.notes,
        now,
        now
      );
    }
    console.log(`[SQLite] Seeded ${initialJobs.length} initial audit jobs.`);
  }

  // 5. Seed primary report if empty
  const reportCount = (db.prepare('SELECT COUNT(*) as count FROM audit_reports').get() as { count: number }).count;
  if (reportCount === 0) {
    const primaryReport = {
      id: 'report-nw-8921',
      jobId: 'job-nw-8921',
      counsellorName: 'Rahul Verma',
      counsellorEmpId: 'NW-4091',
      team: 'Team Alpha (Hyderabad Tech Sales)',
      product: 'Academy',
      stage: 'DM Call/VC',
      language: 'Hinglish (Hindi + English)',
      duration: '28m 42s',
      callDate: '2026-10-14 16:30',
      auditDate: '2026-10-14 17:15',
      overallScore: 68,
      maxScore: 100,
      complianceTier: 'Needs Coaching',
      isSample: 1,
      reviewerReview: {
        auditorName: 'Sunita Rao',
        auditorEmail: 'sunita.rao@nxtwave.tech',
        status: 'Approved',
        originalScore: 68,
        finalScore: 68,
        notes: 'The counsellor demonstrated strong rapport and technical empathy, but committed a serious compliance infraction at 18:24 by assuring a 100% Google interview placement drive without mentioning the mandatory 85% IRC milestone. Assigned 1-on-1 coaching drill with Team Lead.'
      },
      criteriaScores: [
        {
          dimensionId: 'dim-1',
          name: 'Greeting & Rapport Building',
          score: 9,
          maxScore: 10,
          weightPercent: 10,
          status: 'Compliant',
          feedback: 'Warm, professional opening in natural Hinglish. Verified prospect availability and confirmed interest.'
        },
        {
          dimensionId: 'dim-2',
          name: 'Need Analysis & Student Profiling',
          score: 13,
          maxScore: 15,
          weightPercent: 15,
          status: 'Compliant',
          feedback: 'Thoroughly inquired regarding academic branch (ECE), current coding familiarity, and daily available study hours.'
        },
        {
          dimensionId: 'dim-3',
          name: 'Curriculum & Pedagogy Accuracy',
          score: 12,
          maxScore: 15,
          weightPercent: 15,
          status: 'Compliant',
          feedback: 'Accurately outlined Python & SQL tracks. Accurately explained hands-on code playground.'
        },
        {
          dimensionId: 'dim-4',
          name: 'Placement & Career Claims Adherence',
          score: 6,
          maxScore: 20,
          weightPercent: 20,
          status: 'Non-Compliant',
          feedback: 'CRITICAL INFRACTION: Promised guaranteed interview drives with Google and Microsoft without explaining the prerequisite 85% IRC milestone.'
        },
        {
          dimensionId: 'dim-5',
          name: 'Pricing, Scholarship & EMI Transparency',
          score: 11,
          maxScore: 15,
          weightPercent: 15,
          status: 'Needs Coaching',
          feedback: 'Quoted base fee accurately, but hesitated when explaining NBFC partner interest subsidization terms.'
        },
        {
          dimensionId: 'dim-6',
          name: 'Objection Handling & Empathy',
          score: 8,
          maxScore: 10,
          weightPercent: 10,
          status: 'Compliant',
          feedback: 'Handled parent hesitation regarding semester examination clash with great patience and flexible scheduling advice.'
        },
        {
          dimensionId: 'dim-7',
          name: 'Urgency & Ethical Next Steps',
          score: 5,
          maxScore: 10,
          weightPercent: 10,
          status: 'Needs Coaching',
          feedback: 'Applied moderate artificial urgency regarding scholarship deadline expiring at midnight.'
        },
        {
          dimensionId: 'dim-8',
          name: 'Professional Tone & Language Clarity',
          score: 4,
          maxScore: 5,
          weightPercent: 5,
          status: 'Compliant',
          feedback: 'Articulate communication, respectful tone throughout 28-minute call.'
        }
      ],
      criticalViolations: [
        {
          id: 'crit-01',
          dimension: 'Placement & Career Claims Adherence',
          timestamp: '18:24',
          snippet: 'Bhaiya aap tension mat lo, 6 mahine baad direct Google aur Amazon ke interview rounds schedule honge aapke liye.',
          policyClauseRef: 'CCBP-4.0-Policy Clause 3.4 (Tier-1 Company Citation Restriction)',
          severity: 'Critical',
          remedialGuidance: 'Must clarify that NxtWave provides hiring drives with 3,000+ hiring partners based on candidate clearing the 85% IRC benchmark.'
        }
      ],
      observations: [
        {
          type: 'Strength',
          title: 'Strong Technical Empathy',
          description: 'Counsellor spent 6 minutes patiently comforting non-CS student regarding fear of mathematics in programming.'
        },
        {
          type: 'Improvement',
          title: 'Unverified Placement Claims',
          description: 'Avoid naming specific FAANG companies as guaranteed campus drives.'
        }
      ],
      transcript: [
        {
          speaker: 'Counsellor',
          speakerName: 'Rahul Verma',
          timestamp: '00:04',
          originalText: 'Hello Amit! Main Rahul bol raha hoon NxtWave se. Kya abhi baat karne ka sahi time hai?',
          englishTranslation: 'Hello Amit! I am Rahul speaking from NxtWave. Is this a good time to speak?',
          isFlagged: false
        },
        {
          speaker: 'Prospect',
          speakerName: 'Amit Kumar',
          timestamp: '00:12',
          originalText: 'Haan Rahul ji, boliye. Maine scholarship test ke liye register kiya tha.',
          englishTranslation: 'Yes Rahul, please tell me. I had registered for the scholarship test.',
          isFlagged: false
        },
        {
          speaker: 'Counsellor',
          speakerName: 'Rahul Verma',
          timestamp: '18:24',
          originalText: 'Bhaiya aap tension mat lo, 6 mahine baad direct Google aur Amazon ke interview rounds schedule honge aapke liye.',
          englishTranslation: 'Brother do not worry, after 6 months direct interview rounds with Google and Amazon will be scheduled for you.',
          isFlagged: true,
          flaggedReason: 'Unauthorized placement guarantee with Tier-1 tech giants without citing 85% IRC benchmark prerequisite.'
        }
      ]
    };

    db.prepare(`
      INSERT INTO audit_reports (
        id, job_id, counsellor_name, counsellor_emp_id, team, product, stage, language,
        duration, call_date, audit_date, overall_score, max_score, compliance_tier,
        is_sample, criteria_scores_json, critical_violations_json, observations_json,
        transcript_json, reviewer_review_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      primaryReport.id,
      primaryReport.jobId,
      primaryReport.counsellorName,
      primaryReport.counsellorEmpId,
      primaryReport.team,
      primaryReport.product,
      primaryReport.stage,
      primaryReport.language,
      primaryReport.duration,
      primaryReport.callDate,
      primaryReport.auditDate,
      primaryReport.overallScore,
      primaryReport.maxScore,
      primaryReport.complianceTier,
      primaryReport.isSample,
      JSON.stringify(primaryReport.criteriaScores),
      JSON.stringify(primaryReport.criticalViolations),
      JSON.stringify(primaryReport.observations),
      JSON.stringify(primaryReport.transcript),
      JSON.stringify(primaryReport.reviewerReview),
      now,
      now
    );
    console.log('[SQLite] Seeded primary sample audit report.');
  }
}

// Initialise on import
initDatabase();
