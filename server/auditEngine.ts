/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Gemini AI Audit Engine for NxtWave AI Audit Platform
 * Evaluates counselling call transcripts against approved sales narratives,
 * product curricula, fee matrices, and the 8-Factor QA Rubric.
 */

import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';
import { TranscriptTurn } from './transcription.js';
import { isValidProductStage, getStagesForProduct } from '../src/config/callStages.js';

export interface CriterionResult {
  id: string;
  title: string;
  category: string;
  weightPercent: number;
  maxScore: number;
  rawRating: number; // 0 to 10 scale proposed by AI
  earnedScore: number; // Deterministically computed
  status: 'pass' | 'warning' | 'fail';
  feedback: string;
  kbClauseRef?: string;
  evidenceQuote?: string;
  timestamp?: string;
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

export interface CoachingRecommendation {
  id: string;
  area: string;
  observedDeficiency: string;
  recommendedPhrasing: string;
  trainingModule: string;
}

export interface AuditEvaluationResult {
  overallScore: number;
  maxScore: number;
  complianceTier: 'Exemplary' | 'Compliant' | 'Needs Coaching' | 'Critical Non-Compliant';
  criteriaBreakdown: CriterionResult[];
  criticalViolations: CriticalViolation[];
  missingNarratives: MissingNarrative[];
  unsupportedClaims: UnsupportedClaim[];
  coachingRecommendations: CoachingRecommendation[];
  evaluatedTranscript: TranscriptTurn[];
  modelIdentifier: string;
  promptVersion: string;
  evaluationTimestamp: string;
  knowledgeDocsUsed: string[];
}

const DEFAULT_RUBRIC_DEF = [
  { id: 'greeting', title: 'Greeting & Rapport Building', category: 'Professionalism', defaultWeight: 10, maxScore: 10 },
  { id: 'needAnalysis', title: 'Need Analysis & Profile Discovery', category: 'Consultative Sales', defaultWeight: 15, maxScore: 15 },
  { id: 'curriculum', title: 'Curriculum & Pedagogy Accuracy', category: 'Product Knowledge', defaultWeight: 15, maxScore: 15 },
  { id: 'placement', title: 'Career Assurance & Placement Disclosures', category: 'Compliance & Ethics', defaultWeight: 20, maxScore: 20 },
  { id: 'pricing', title: 'Pricing, Scholarship & EMI Transparency', category: 'Financial Disclosures', defaultWeight: 15, maxScore: 15 },
  { id: 'objection', title: 'Objection Handling & Empathy', category: 'Sales Execution', defaultWeight: 10, maxScore: 10 },
  { id: 'urgency', title: 'Ethical Urgency & Next Steps', category: 'Sales Ethics', defaultWeight: 10, maxScore: 10 },
  { id: 'softSkills', title: 'Soft Skills & Tone of Voice', category: 'Communication', defaultWeight: 5, maxScore: 5 },
];

/**
 * Validates product and stage pairing against NxtWave matrix.
 */
export function validateProductStage(product: string, stage: string): void {
  if (!product || !stage) {
    throw new Error('Both Product and Call Stage are required for audit evaluation.');
  }
  if (!isValidProductStage(product, stage)) {
    const valid = getStagesForProduct(product);
    throw new Error(`Invalid stage "${stage}" for product "${product}". Allowed stages are: ${valid.join(', ')}`);
  }
}

/**
 * Loads relevant active knowledge docs from SQLite for the specific product & stage
 */
export function loadActiveKnowledgeDocs(product: string, stage: string): any[] {
  const rows = db.prepare(`
    SELECT * FROM knowledge_docs 
    WHERE status = 'Active' 
      AND (product = ? OR product = 'All' OR product = 'All Programs')
      AND (stage = ? OR stage IS NULL OR stage = 'All Stages' OR stage = '')
  `).all(product, stage) as any[];

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    category: r.category,
    summary: r.summary,
    prohibitedClaims: r.prohibited_claims_json ? JSON.parse(r.prohibited_claims_json) : [],
    approvedPitchNotes: r.approved_pitch_notes_json ? JSON.parse(r.approved_pitch_notes_json) : [],
    clauses: r.clauses_json ? JSON.parse(r.clauses_json) : []
  }));
}

/**
 * Loads configured rubric weights from SQLite
 */
export function loadRubricWeights(): Record<string, number> {
  const row: any = db.prepare("SELECT weights_json FROM rubric_settings WHERE id = 'rubric-8factor-v5'").get();
  if (row && row.weights_json) {
    try {
      return JSON.parse(row.weights_json);
    } catch {
      // Fallback below
    }
  }
  return {
    greeting: 10,
    needAnalysis: 15,
    curriculum: 15,
    placement: 20,
    pricing: 15,
    objection: 10,
    urgency: 10,
    softSkills: 5,
  };
}

/**
 * Deterministically calculates criterion scores and overall weighted score.
 */
export function computeDeterministicScores(
  criteriaRatings: Array<{ id: string; ratingOutOf10: number; feedback: string; kbClauseRef?: string; evidenceQuote?: string; timestamp?: string }>,
  weights: Record<string, number>,
  hasCriticalViolation: boolean
): { overallScore: number; criteriaBreakdown: CriterionResult[]; complianceTier: AuditEvaluationResult['complianceTier'] } {
  let weightedScoreSum = 0;
  let totalWeight = 0;

  const criteriaBreakdown: CriterionResult[] = DEFAULT_RUBRIC_DEF.map(def => {
    const weight = weights[def.id] !== undefined ? weights[def.id] : def.defaultWeight;
    totalWeight += weight;

    const ratingObj = criteriaRatings.find(r => r.id === def.id || r.id.toLowerCase().includes(def.id.toLowerCase()));
    const rawRating = ratingObj ? Math.max(0, Math.min(10, Number(ratingObj.ratingOutOf10) || 0)) : 7.0;

    // Earned score scaled to maxScore (e.g. 15 * (rawRating / 10))
    const earnedScore = Math.round((def.maxScore * (rawRating / 10)) * 10) / 10;
    weightedScoreSum += (earnedScore / def.maxScore) * weight;

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (rawRating < 5) status = 'fail';
    else if (rawRating < 7.5) status = 'warning';

    return {
      id: def.id,
      title: def.title,
      category: def.category,
      weightPercent: weight,
      maxScore: def.maxScore,
      rawRating,
      earnedScore,
      status,
      feedback: ratingObj?.feedback || 'Evaluated against NxtWave standard rubric.',
      kbClauseRef: ratingObj?.kbClauseRef,
      evidenceQuote: ratingObj?.evidenceQuote,
      timestamp: ratingObj?.timestamp
    };
  });

  const normalizedWeight = totalWeight > 0 ? totalWeight : 100;
  let calculatedOverallScore = Math.round((weightedScoreSum / normalizedWeight) * 100);

  // If a zero-tolerance critical policy violation occurred, cap score at 68 (Needs Coaching / Critical tier)
  if (hasCriticalViolation && calculatedOverallScore > 68) {
    calculatedOverallScore = 68;
  }

  let complianceTier: AuditEvaluationResult['complianceTier'] = 'Compliant';
  if (hasCriticalViolation) {
    complianceTier = calculatedOverallScore < 60 ? 'Critical Non-Compliant' : 'Needs Coaching';
  } else if (calculatedOverallScore >= 90) {
    complianceTier = 'Exemplary';
  } else if (calculatedOverallScore >= 75) {
    complianceTier = 'Compliant';
  } else if (calculatedOverallScore >= 60) {
    complianceTier = 'Needs Coaching';
  } else {
    complianceTier = 'Critical Non-Compliant';
  }

  return {
    overallScore: calculatedOverallScore,
    criteriaBreakdown,
    complianceTier
  };
}

/**
 * Execute real Gemini Quality Audit
 */
export async function evaluateAuditWithGemini(
  turns: TranscriptTurn[],
  product: string,
  stage: string,
  counsellorName: string
): Promise<AuditEvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
    throw new Error(
      'Audit Engine error: GEMINI_API_KEY is not configured on the server. ' +
      'Please configure GEMINI_API_KEY in your server environment.'
    );
  }

  validateProductStage(product, stage);
  const activeDocs = loadActiveKnowledgeDocs(product, stage);
  const weights = loadRubricWeights();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const modelIdentifier = 'gemini-3.8-flash';
  const promptVersion = 'nxtwave-speech-qa-v5.2';
  const evaluationTimestamp = new Date().toISOString();

  const transcriptContext = turns.map(t => `[${t.timestamp}] ${t.speaker}: ${t.textHinglish} (English: ${t.textEnglish})`).join('\n');

  const knowledgeContext = activeDocs.map(d => `
DOCUMENT: "${d.title}" (${d.category})
Summary: ${d.summary}
Prohibited Claims:
${d.prohibitedClaims.map((c: string) => ` - ${c}`).join('\n')}
Approved Pitch Points:
${d.approvedPitchNotes.map((p: string) => ` - ${p}`).join('\n')}
`).join('\n');

  const systemPrompt = `You are the Lead Quality Assurance Auditor for NxtWave tech education admissions counselling.
Evaluate the counselling call transcript against approved sales narratives, product curricula, fee matrices, and the 8-Factor QA Rubric.

CALL CONTEXT:
- Counsellor: ${counsellorName}
- Target Program Track: ${product}
- Funnel Stage: ${stage}

KNOWLEDGE BASE & COMPLIANCE POLICIES:
${knowledgeContext}

8 RUBRIC CRITERIA TO RATE (Rate each on scale 0.0 to 10.0):
1. greeting: Greeting & Rapport Building (Professional greeting, identity verification)
2. needAnalysis: Need Analysis & Profile Discovery (Student college, branch, coding bandwidth)
3. curriculum: Curriculum & Pedagogy Accuracy (CCBP 4.0 learning trajectory, practical playground)
4. placement: Career Assurance & Placement Disclosures (IRC milestone requirements, 85% attendance, no fake guarantees)
5. pricing: Pricing, Scholarship & EMI Transparency (Approved matrix, No-Cost EMI, no fake personal discounts)
6. objection: Objection Handling & Empathy (Addressing parental doubts, schedule clashes)
7. urgency: Ethical Urgency & Next Steps (No artificial scarcity like "last 2 seats today")
8. softSkills: Soft Skills & Tone of Voice (Patience, professional language)

RULES:
- Evidence quotes MUST be direct exact phrases from the transcript.
- Identify any zero-tolerance critical policy violations (e.g. unconditional 100% placement guarantees, manufactured scarcity).
- List missing mandatory narrative points (e.g. weekly 15-hour bandwidth disclosure, IRC clearing requirement).
- List unsupported claims made by the counsellor against official policies.
- Formulate actionable coaching recommendations ("Say this instead" replacement phrases).

Return STRICT JSON matching this schema:
{
  "criteriaRatings": [
    {
      "id": "greeting" | "needAnalysis" | "curriculum" | "placement" | "pricing" | "objection" | "urgency" | "softSkills",
      "ratingOutOf10": number,
      "feedback": string,
      "kbClauseRef": string,
      "evidenceQuote": string,
      "timestamp": string
    }
  ],
  "criticalViolations": [
    {
      "id": string,
      "timestamp": string,
      "title": string,
      "quote": string,
      "violationRule": string,
      "policyDoc": string,
      "zeroToleranceAction": string
    }
  ],
  "missingNarratives": [
    {
      "id": string,
      "title": string,
      "expectedTopic": string,
      "importance": "Mandatory" | "Recommended",
      "guidelineDoc": string,
      "impactNote": string
    }
  ],
  "unsupportedClaims": [
    {
      "id": string,
      "timestamp": string,
      "claimMade": string,
      "actualPolicy": string,
      "referenceDoc": string,
      "riskSeverity": "Critical" | "Moderate"
    }
  ],
  "coachingRecommendations": [
    {
      "id": string,
      "area": string,
      "observedDeficiency": string,
      "recommendedPhrasing": string,
      "trainingModule": string
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: modelIdentifier,
    contents: [
      {
        text: `TRANSCRIPT TO AUDIT:\n\n${transcriptContext}\n\n${systemPrompt}`
      }
    ],
    config: {
      responseMimeType: 'application/json',
    }
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
    throw new Error('Gemini Quality Audit model returned an empty response.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Failed to parse Gemini audit JSON: ${responseText.slice(0, 200)}...`);
  }

  if (!Array.isArray(parsed.criteriaRatings)) {
    throw new Error('Audit model output is missing mandatory criteriaRatings array.');
  }

  const criticalViolations: CriticalViolation[] = (parsed.criticalViolations || []).map((v: any, idx: number) => ({
    id: v.id || `cv-${idx + 1}`,
    timestamp: v.timestamp || '00:00',
    title: v.title || 'Policy Infraction',
    quote: v.quote || '',
    violationRule: v.violationRule || 'Standard Policy Adherence',
    policyDoc: v.policyDoc || 'Knowledge Base',
    zeroToleranceAction: v.zeroToleranceAction || 'Auditor sign-off & coaching drill'
  }));

  const missingNarratives: MissingNarrative[] = (parsed.missingNarratives || []).map((m: any, idx: number) => ({
    id: m.id || `mn-${idx + 1}`,
    title: m.title || 'Required Topic',
    expectedTopic: m.expectedTopic || '',
    importance: m.importance === 'Recommended' ? 'Recommended' : 'Mandatory',
    guidelineDoc: m.guidelineDoc || 'Sales Pitch Guidelines',
    impactNote: m.impactNote || ''
  }));

  const unsupportedClaims: UnsupportedClaim[] = (parsed.unsupportedClaims || []).map((u: any, idx: number) => ({
    id: u.id || `uc-${idx + 1}`,
    timestamp: u.timestamp || '00:00',
    claimMade: u.claimMade || '',
    actualPolicy: u.actualPolicy || '',
    referenceDoc: u.referenceDoc || 'Official Manual',
    riskSeverity: u.riskSeverity === 'Critical' ? 'Critical' : 'Moderate'
  }));

  const coachingRecommendations: CoachingRecommendation[] = (parsed.coachingRecommendations || []).map((c: any, idx: number) => ({
    id: c.id || `cr-${idx + 1}`,
    area: c.area || 'Speech Practice',
    observedDeficiency: c.observedDeficiency || '',
    recommendedPhrasing: c.recommendedPhrasing || '',
    trainingModule: c.trainingModule || 'Admissions QA LMS-101'
  }));

  // Deterministically compute scores on server
  const hasCriticalViolation = criticalViolations.length > 0;
  const scoreResult = computeDeterministicScores(parsed.criteriaRatings, weights, hasCriticalViolation);

  // Annotate transcript turns with findings highlights
  const annotatedTranscript: TranscriptTurn[] = turns.map(turn => {
    // Check if this turn matches any critical violation
    const matchedCrit = criticalViolations.find(v => v.timestamp === turn.timestamp || turn.textHinglish.includes(v.quote.slice(0, 20)));
    if (matchedCrit) {
      return {
        ...turn,
        highlightType: 'critical',
        highlightNote: `CRITICAL INFRACTION: ${matchedCrit.title}`
      };
    }
    const matchedUnsupp = unsupportedClaims.find(u => u.timestamp === turn.timestamp);
    if (matchedUnsupp) {
      return {
        ...turn,
        highlightType: 'unsupported',
        highlightNote: `UNSUPPORTED CLAIM: ${matchedUnsupp.claimMade}`
      };
    }
    return turn;
  });

  return {
    overallScore: scoreResult.overallScore,
    maxScore: 100,
    complianceTier: scoreResult.complianceTier,
    criteriaBreakdown: scoreResult.criteriaBreakdown,
    criticalViolations,
    missingNarratives,
    unsupportedClaims,
    coachingRecommendations,
    evaluatedTranscript: annotatedTranscript,
    modelIdentifier,
    promptVersion,
    evaluationTimestamp,
    knowledgeDocsUsed: activeDocs.map(d => d.title)
  };
}
