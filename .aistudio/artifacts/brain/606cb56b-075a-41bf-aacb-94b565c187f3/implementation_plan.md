# NxtWave AI Audit Platform: Local Full-Stack Migration & Architecture Plan

## Title & Summary
Transitioning the NxtWave AI Audit Platform from suspended Firebase/Google Cloud client services into an enterprise-grade, locally-persistent full-stack system powered by Node.js/Express and SQLite. This delivers persistent storage for audit jobs, knowledge sources, rubrics, and reports while maintaining 100% of the existing UI aesthetics, product-to-call-stage mappings, and role-based access control.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The original Firebase project is suspended. All data persistence and authentication will be migrated to a local Node.js/Express backend backed by SQLite. No calls or deployment requests will be made to Firebase.

- **Confirmed Decision 1 (Persistence Layer)**: SQLite with a file-backed database (`data/nxtwave_audit.db`). Zero external cloud database dependency; runs reliably in both local and container environments.
- **Confirmed Decision 2 (Full-Stack Runtime)**: Node.js/Express server (`server.ts`) running concurrently with Vite dev middleware on port 3000 (`"dev": "tsx server.ts"`).
- **Confirmed Decision 3 (Auth & RBAC Strategy)**: Server-side session/token authentication replacing `signInWithPopup`, supporting real email/password accounts and instant 1-click role switcher for `admin`, `auditor`, `lead`, and `counsellor`.
- **Confirmed Decision 4 (Server-Side AI Auditing Phase)**: Audio file ingestion and Gemini evaluation are scoped to a dedicated subsequent phase using server-side `@google/genai` and server-managed `GEMINI_API_KEY` (never exposed to client).

---

## 1. Existing Repository Architecture Analysis

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Current Client-Only SPA                         │
│  React 19 + TypeScript + Vite + Tailwind CSS v4                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
   │  Auth Context │         │ UI Components │         │ Data Services │
   │ (Firebase SDK)│         │ (Views/Modals)│         │ (Direct SDK)  │
   └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
           │                         │                         │
           └─────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │        External Firebase Services        │
                │ ⛔ Google Cloud Project Suspended        │
                │ ⛔ Client API Key Permission Denied      │
                │ ⚠️ Firestore / Storage Inaccessible      │
                └──────────────────────────────────────────┘
```

### Current Strengths & Reusable Assets
1. **Domain-Specific UI & Routing**: Complete, high-polish workflows for Admissions Quality & Compliance:
   - **DashboardView**: Real-time score distribution, critical violations summary, call volume analytics.
   - **KnowledgeBaseView**: Multi-category policies (Narratives, Product Knowledge, Pricing & Policies, Audit Rubrics) with file parsing (PDF, DOCX, TXT via `documentProcessor.ts`).
   - **NewAuditView**: Audio file / Drive recording ingestion with counselor selection and strict product-stage scoping.
   - **AuditQueueView**: Multi-filter queue (Status, Product, Call Stage, Search) with progress and violation tags.
   - **AuditReportView**: Comprehensive scorecard with 8 audit dimensions, line-by-line transcript inspection, and auditor sign-off.
   - **AnalyticsView**: Aggregated compliance tiers, failure categorization, and counselor performance tables.
   - **SettingsView**: Dynamic 8-factor rubric weighting system (must total 100%).
2. **Centralized Configuration (`src/config/callStages.ts`)**:
   - Canonical 5-product definitions: `Intensive`, `Academy`, `NIAT`, `IIT KGP OCN`, `NIAT - Academy`.
   - Strict product-to-call-stage mapping and filtering (`filterKnowledgeSourcesForAudit`).
3. **TypeScript Type System (`src/types.ts`)**:
   - Strongly-typed data contracts: `KnowledgeDoc`, `AuditJob`, `AuditReport`, `CriterionScore`, `AppUserProfile`.

### Architectural Bottlenecks To Solve
1. **Client-Direct Firebase Coupling**: `src/lib/firebase.ts`, `src/contexts/AuthContext.tsx`, and services make client-side calls to a suspended Firebase project.
2. **Lack of Server API Proxy**: No backend routes exist yet; all logic is client-side.
3. **Storage & Ingestion Void**: Without Cloud Storage or a server file receiver, audio recordings cannot be stored or fed into multimodal Gemini models.

---

## 2. Target Full-Stack Architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                       Browser Client (Port 3000)                              │
│  React 19 SPA (Navbar, Sidebar, Dashboard, Queue, Reports, Knowledge Base)    │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ HTTP Fetch (/api/*)
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                     Node.js / Express Server (server.ts)                      │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │     Auth Routes      │  │   Audit Job Routes   │  │   Knowledge Routes  │  │
│  │   (/api/auth/*)      │  │   (/api/jobs/*)      │  │  (/api/knowledge/*) │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │    Report Routes     │  │    Rubric Routes     │  │  Future AI Engine   │  │
│  │   (/api/reports/*)   │  │   (/api/rubrics/*)   │  │  (@google/genai)    │  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ SQL Queries
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Local SQLite Database                                 │
│                         (data/nxtwave_audit.db)                               │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │    users     │  │  audit_jobs  │  │knowledge_docs│  │   audit_reports   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                         │
│  │rubric_weights│  │ transcripts  │  │ audit_reviews│                         │
│  └──────────────┘  └──────────────┘  └──────────────┘                         │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Design (SQLite)

### Table: `users`
- `id` (TEXT PRIMARY KEY) - e.g. `usr_admin_01`
- `email` (TEXT UNIQUE NOT NULL) - e.g. `vivekbhagar@gmail.com`
- `display_name` (TEXT NOT NULL) - e.g. `Vivek Bhagar`
- `role` (TEXT NOT NULL) - `admin` | `auditor` | `lead` | `counsellor`
- `team` (TEXT NOT NULL) - e.g. `Platform Administration`
- `password_hash` (TEXT) - Secure bcrypt / salt-hash for password auth
- `created_at` (TEXT NOT NULL), `updated_at` (TEXT NOT NULL)

### Table: `knowledge_docs`
- `id` (TEXT PRIMARY KEY) - e.g. `kb-doc-01`
- `title` (TEXT NOT NULL)
- `category` (TEXT NOT NULL) - `Narratives` | `Product Knowledge` | `Pricing and Policies` | `Audit Rubrics`
- `product` (TEXT NOT NULL) - `Intensive` | `Academy` | `NIAT` | `IIT KGP OCN` | `NIAT - Academy` | `All Programs`
- `stage` (TEXT) - Scoped call stage (e.g. `Lead Qualification Call`, `DM Call/VC`, etc.)
- `version` (TEXT NOT NULL)
- `last_updated` (TEXT NOT NULL)
- `file_size` (TEXT)
- `file_type` (TEXT) - `pdf` | `docx` | `txt`
- `status` (TEXT NOT NULL) - `Active` | `Archived`
- `clauses_count` (INTEGER NOT NULL)
- `summary` (TEXT)
- `clauses_json` (TEXT) - Serialized JSON array of parsed clauses
- `prohibited_claims_json` (TEXT) - Serialized JSON array
- `approved_pitch_notes_json` (TEXT) - Serialized JSON array
- `full_content_snippet` (TEXT)
- `storage_path` (TEXT) - Local file storage path if uploaded
- `created_at` (TEXT NOT NULL), `updated_at` (TEXT NOT NULL)

### Table: `audit_jobs`
- `id` (TEXT PRIMARY KEY) - e.g. `job-nw-8921`
- `recording_name` (TEXT NOT NULL)
- `drive_url` (TEXT)
- `audio_file_path` (TEXT) - Server path for uploaded audio files
- `counsellor_name` (TEXT NOT NULL)
- `counsellor_emp_id` (TEXT NOT NULL)
- `counsellor_email` (TEXT)
- `product` (TEXT NOT NULL)
- `stage` (TEXT NOT NULL)
- `language` (TEXT NOT NULL)
- `duration` (TEXT NOT NULL)
- `submitted_at` (TEXT NOT NULL)
- `submitted_by` (TEXT NOT NULL) - User ID
- `status` (TEXT NOT NULL) - `Queued` | `Transcribing` | `Auditing` | `Needs Review` | `Completed` | `Failed`
- `progress` (INTEGER DEFAULT 0)
- `score` (INTEGER)
- `critical_violation_count` (INTEGER DEFAULT 0)
- `is_sample` (INTEGER DEFAULT 0)
- `notes` (TEXT)
- `created_at` (TEXT NOT NULL), `updated_at` (TEXT NOT NULL)

### Table: `audit_reports`
- `id` (TEXT PRIMARY KEY) - e.g. `report-nw-8921`
- `job_id` (TEXT UNIQUE NOT NULL, FOREIGN KEY REFERENCES audit_jobs(id))
- `counsellor_name` (TEXT NOT NULL)
- `counsellor_emp_id` (TEXT NOT NULL)
- `team` (TEXT NOT NULL)
- `product` (TEXT NOT NULL)
- `stage` (TEXT NOT NULL)
- `language` (TEXT NOT NULL)
- `duration` (TEXT NOT NULL)
- `call_date` (TEXT NOT NULL)
- `audit_date` (TEXT NOT NULL)
- `overall_score` (INTEGER NOT NULL)
- `max_score` (INTEGER DEFAULT 100)
- `compliance_tier` (TEXT NOT NULL)
- `criteria_scores_json` (TEXT NOT NULL) - 8 dimension breakdown
- `critical_violations_json` (TEXT)
- `observations_json` (TEXT)
- `transcript_json` (TEXT) - Timestamped speaker turns with compliance tags
- `reviewer_review_json` (TEXT) - Auditor override, final score, and coaching notes
- `created_at` (TEXT NOT NULL), `updated_at` (TEXT NOT NULL)

### Table: `rubric_settings`
- `id` (TEXT PRIMARY KEY) - `default_rubric`
- `weights_json` (TEXT NOT NULL)
- `updated_at` (TEXT NOT NULL)
- `updated_by` (TEXT)

---

## 4. Phased Implementation Roadmap

### Phase 1: Server & Database Foundation (Immediate Next Step)
1. **Server Setup**:
   - Create `server.ts` with Express and Vite middleware integration.
   - Configure `"dev": "tsx server.ts"` and `"start": "node dist/server.js"` in `package.json`.
   - Update `.gitignore` to ignore `*.db`, `*.sqlite`, `data/`, and uploaded audio files.
2. **Database Engine & Initial Seeding**:
   - Implement `server/db.ts` using `better-sqlite3`.
   - Initialize tables with automated schema migration on boot.
   - Seed authoritative initial data (`INITIAL_KNOWLEDGE_DOCS`, `INITIAL_AUDIT_JOBS`, `SAMPLE_AUDIT_REPORT_PRIMARY`, and users for Vivek Bhagar, Sunita Rao, Rajesh Kumar, and Ananya Sen).

### Phase 2: Core REST API Implementation
1. **Authentication Endpoints** (`/api/auth`):
   - `POST /api/auth/login` (email/password login)
   - `GET /api/auth/me` (session verification)
   - `POST /api/auth/switch-role` (instant role switcher for seamless testing)
   - `POST /api/auth/logout`
2. **Knowledge Base Endpoints** (`/api/knowledge`):
   - `GET /api/knowledge` (filterable by product, stage, category, search)
   - `POST /api/knowledge` (create document with parsed clauses)
   - `PATCH /api/knowledge/:id` (update product/stage scoping)
   - `DELETE /api/knowledge/:id`
3. **Audit Jobs & Reports Endpoints** (`/api/jobs`, `/api/reports`):
   - `GET /api/jobs` (multi-status, role-scoped queue listing)
   - `POST /api/jobs` (new audit submission with product/stage validation)
   - `GET /api/reports/:jobId` (full audit report with criteria breakdown)
   - `POST /api/reports/:jobId/review` (auditor score override and coaching notes)
4. **Rubric Endpoints** (`/api/rubrics`):
   - `GET /api/rubrics`
   - `PUT /api/rubrics`

### Phase 3: Frontend Service Adapter Migration
1. **Replace Firebase Client Calls**:
   - Update `src/services/knowledgeService.ts` to call `/api/knowledge`.
   - Update `src/services/auditJobService.ts` to call `/api/jobs`.
   - Update `src/services/reportService.ts` to call `/api/reports`.
   - Update `src/services/rubricService.ts` to call `/api/rubrics`.
2. **Refactor AuthContext**:
   - Replace Firebase Auth listener with `/api/auth/me` and `/api/auth/login`.
   - Connect the login screen to authenticate against SQLite users.
   - Retain full RBAC guarantees (`isAdmin`, `isAuditor`, `isLead`, `isCounsellor`).
3. **Decouple Firebase Imports**:
   - Safely retire unused Firebase client SDK invocations without breaking existing types.

### Phase 4: Audio Ingestion & File Upload Support
1. **Multer Audio Uploader**:
   - Add `/api/audio/upload` endpoint supporting `.mp3`, `.wav`, `.m4a`.
   - Store files securely in `uploads/audio/` (gitignored).
2. **UI Audio File Picker**:
   - Enhance `NewAuditView.tsx` with a dual-input option: Google Drive Link OR Local Audio File drag & drop.

### Phase 5: Server-Side Gemini AI Auditing (Subsequent Phase)
1. **Gemini Ingestion Engine**:
   - Leverage `@google/genai` on the server using `GEMINI_API_KEY` from environment variables.
   - Send audio file / transcript + matching Knowledge Base policies for the exact product & stage.
   - Run prompt against the 8 rubric dimensions to compute factual criteria scores, timestamped violation detections, and structured feedback.
2. **Audit Pipeline Worker**:
   - Transition job state: `Queued` ➔ `Transcribing` ➔ `Auditing` ➔ `Completed` (or `Needs Review` if score < 75 or critical violation found).

---

## 5. Security & Isolation Safeguards
- **Zero Secrets in Frontend**: `GEMINI_API_KEY` remains strictly server-side.
- **Git Hygiene**: `data/*.db`, `uploads/*`, `.env` are strictly excluded in `.gitignore`.
- **Zero Loss Rule**: All existing UI components, style tokens, and TypeScript interfaces remain unchanged.
