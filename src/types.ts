export type NavScreen = 
  | 'dashboard'
  | 'knowledge-base'
  | 'new-audit'
  | 'audit-queue'
  | 'audit-reports'
  | 'analytics'
  | 'settings';

export type AppUserRole = 'admin' | 'lead' | 'auditor' | 'counsellor';

export type DocCategory = 
  | 'Narratives'
  | 'Product Knowledge'
  | 'Pricing and Policies'
  | 'Audit Rubrics';

export type DocStatus = 'Active' | 'Draft' | 'Archived';
export type FileType = 'pdf' | 'docx' | 'txt';

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: DocCategory;
  product: string;
  stage?: string;
  version: string;
  lastUpdated: string;
  fileSize: string;
  fileType: FileType;
  status: DocStatus;
  summary: string;
  clausesCount: number;
  clauses?: string[];
  prohibitedClaims: string[];
  approvedPitchNotes: string[];
  fullContentSnippet?: string;
  storageUrl?: string;
}

export type AuditJobStatus = 
  | 'Queued'
  | 'Transcribing'
  | 'Auditing'
  | 'Needs Review'
  | 'Completed'
  | 'Failed';

export interface AuditJob {
  id: string;
  recordingName: string;
  driveUrl: string;
  counsellorName: string;
  counsellorEmpId: string;
  product: string;
  language: string;
  stage: string;
  duration: string;
  submittedAt: string;
  status: AuditJobStatus;
  progress: number;
  score?: number;
  criticalViolationCount: number;
  isSample: boolean;
  notes?: string;
}

export interface CriterionScore {
  id: string;
  title: string;
  category: string;
  weightPercent: number;
  maxScore: number;
  earnedScore: number;
  status: 'pass' | 'warning' | 'fail';
  feedback: string;
  kbClauseRef?: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'Counsellor' | 'Prospect' | 'Parent';
  speakerName: string;
  timestamp: string;
  textHinglish: string;
  textEnglish: string;
  highlightType?: 'critical' | 'unsupported' | 'missing' | 'praise';
  highlightNote?: string;
  linkedFindingId?: string;
}

export interface AuditFinding {
  id: string;
  type: 'critical' | 'violation' | 'missing' | 'positive';
  timestamp: string;
  quote: string;
  clauseReference: string;
  explanation: string;
  severity: 'High' | 'Medium' | 'Low';
  policyDoc: string;
}

export interface MissingNarrative {
  id: string;
  title: string;
  expectedTopic: string;
  importance: 'Mandatory' | 'Recommended';
  guidelineDoc: string;
  impactNote: string;
}

export interface UnsupportedClaim {
  id: string;
  timestamp: string;
  claimMade: string;
  actualPolicy: string;
  referenceDoc: string;
  riskSeverity: 'Critical' | 'Moderate';
}

export interface CriticalViolation {
  id: string;
  timestamp: string;
  title: string;
  quote: string;
  violationRule: string;
  policyDoc: string;
  zeroToleranceAction: string;
}

export interface CoachingRecommendation {
  id: string;
  area: string;
  observedDeficiency: string;
  recommendedPhrasing: string;
  trainingModule: string;
}

export interface ReviewerReview {
  auditorName: string;
  auditorEmail: string;
  status: 'Draft' | 'Approved' | 'Score Overridden' | 'Sent for Retraining';
  originalScore: number;
  finalScore: number;
  overrideReason?: string;
  notes: string;
  signedAt?: string;
}

export interface AuditReport {
  id: string;
  jobId: string;
  counsellorName: string;
  counsellorEmpId: string;
  team: string;
  product: string;
  stage?: string;
  language: string;
  duration: string;
  callDate: string;
  auditDate: string;
  overallScore: number;
  maxScore: number;
  complianceTier: 'Exemplary' | 'Compliant' | 'Needs Coaching' | 'Critical Non-Compliant';
  criteriaBreakdown: CriterionScore[];
  transcript: TranscriptTurn[];
  findings: AuditFinding[];
  missingNarratives: MissingNarrative[];
  unsupportedClaims: UnsupportedClaim[];
  criticalViolations: CriticalViolation[];
  coachingRecommendations: CoachingRecommendation[];
  reviewerReview: ReviewerReview;
  isSample: boolean;
}

export interface CounsellorSummary {
  id: string;
  name: string;
  empId: string;
  team: string;
  auditsCount: number;
  averageScore: number;
  violationRate: number;
  status: 'Compliant' | 'Under Review' | 'Top Performer';
  streakWeeks: number;
}
