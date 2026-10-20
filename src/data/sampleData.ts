import { 
  KnowledgeDoc, 
  AuditJob, 
  AuditReport, 
  CounsellorSummary 
} from '../types';

export const INITIAL_KNOWLEDGE_DOCS: KnowledgeDoc[] = [
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
    fullContentSnippet: `CCBP 4.0 ACADEMY NARRATIVE FRAMEWORK (CONFIDENTIAL - INTERNAL ONLY)

1. OBJECTIVE & ETHICAL FOUNDATION
Our mission at NxtWave is to bridge the acute divide between academic syllabus and 4.0 tech industry skill demand. Counsellors must act as career advisors, not aggressive telemarketers. Every claim must adhere strictly to verified institutional placements and curriculum syllabus.

2. MANDATORY QUALIFICATION CHECKLIST
Before quoting any fee or course pathway:
a. Identify educational background (Branch, Year of Passing, CGPA/Percentage).
b. Ask about current coding exposure (Zero exposure / Basic syntax / College syllabus).
c. Assess weekly study bandwidth (Minimum 15 hours required for Intensive; 10 hours for Academy).

3. IRC (INDUSTRY READINESS CELL) PITCH
When explaining placement assistance:
"Hamara placement model do parts mein kaam karta hai. Pehle 6 mahine rigorous coding and hands-on projects, jismein har weekend mentor evaluation hota hai. Jab aap 85% assignments complete karke IRC benchmark clear karte ho, tab humari 3000+ hiring partner companies ke drives mein shortlisting start hoti hai."
Do NOT state: "Aapko direct Google ya Microsoft mein job mil hi jayegi."
State instead: "Students clear top product and service MNCs based on their technical round performance."`
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
    fullContentSnippet: `FINANCIAL COMPLIANCE & LOAN FACILITATION POLICY

1. OFFICIAL COURSE PRICING STRUCTURE (Q4 2026)
- CCBP 4.0 Academy: Base ₹75,000 + 18% GST (₹88,500 Total)
- CCBP Intensive (Placement Assured Track): Base ₹1,20,000 + 18% GST (₹1,41,600 Total)
- Data Science & AI Fellowship: Base ₹95,000 + 18% GST (₹1,12,100 Total)

2. SCHOLARSHIP ALLOCATION RULES
Scholarships cannot be granted verbally. The prospect MUST appear for the 30-minute NXT-SAT diagnostic test:
- 90th percentile & above: 35% tuition waiver
- 75th to 89th percentile: 25% tuition waiver
- 50th to 74th percentile: 15% tuition waiver
Counsellors offering discounts higher than the validated test report will be flagged for immediate audit penalty.

3. 0% EMI PARTNER LOANS
Financing partners: Bajaj Finserv, Propelld, Liquiloans.
All loans are subject to credit bureau (CIBIL 650+) check. The counsellor must inform the parent/student that the loan contract is directly between the financial institution and the borrower.`
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
      'Never pressure candidates with false artificial countdowns (e.g. "Seat will vanish in 5 minutes if you do not pay now").'
    ],
    approvedPitchNotes: [
      'Accurate placement track record: Over 18,000+ learners placed across 3,000+ companies.',
      'Average CTC band: ₹4.5 LPA to ₹12 LPA depending on performance tier.',
      'Interview clearance assistance with up to 10 company referral drives.',
      'Transparent portfolio requirement: 4 production-grade projects deployed on GitHub and live domains.'
    ],
    fullContentSnippet: `ANTI-MISREPRESENTATION DIRECTIVE (ASCI & LEGAL COMPLIANCE)

CLAUSE 3.1: PROHIBITION OF DIRECT OFFER CLAIMS
"No representative shall represent that enrollment in NxtWave constitutes employment or that placement is independent of candidate performance in partner company interviews."

CLAUSE 3.4: TIER-1 COMPANY CITATION RESTRICTION
"Counsellors shall not name Tier-1 tech giants (Google, Microsoft, Amazon, Meta) as guaranteed hiring partners. While alumni work there, they must be cited as aspirational outcomes post-experience, not direct entry-level campus hires."

CLAUSE 4.2: PRESSURE SELLING & ARTIFICIAL SCARCITY
"Do not utilize coercive sales tactics. While batch intake limits exist (60 students per IRC cohort), counsellors must provide 24 hours for parent consultation before demanding booking token."`
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
    fullContentSnippet: `SCORING BENCHMARK SPECIFICATIONS

TOTAL SCORE: 100 POINTS
- Exemplary (90 - 100): Compliant with approved script, deep empathy, clear value delivery.
- Compliant (75 - 89): Minor narrative gaps, no policy deviations, acceptable pacing.
- Needs Coaching (60 - 74): Missed key pitch points or moderate pricing ambiguity.
- Critical Non-Compliant (< 60 or ANY Zero-Tolerance Trigger): Severe violation, auto-failed.

ZERO-TOLERANCE TRIGGERS:
1. False placement promise (100% Google/Amazon guarantee).
2. Unapproved cash discount or fee undercutting.
3. Coercive pressure selling or rude/disrespectful behavior.
4. Withholding loan liability disclosures from prospect/parent.`
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
    summary: 'Detailed module syllabus, lab assignments, project specifications, and eligibility criteria for non-engineering and mechanical/civil transitions.',
    prohibitedClaims: [
      'Do not say math skills are unnecessary for data structures.',
      'Do not guarantee completion in 3 months; minimum recommended duration is 8 months for non-CS graduates.'
    ],
    approvedPitchNotes: [
      'Foundational module: Computational thinking & Python from ground zero.',
      'Full stack track: React.js, Node.js, Express, SQLite, PostgreSQL.',
      'Practical capstone: Building full-fledged e-commerce or video streaming web app with authentication.',
      'Daily 2-hour doubt clarification rooms staffed by senior teaching assistants.'
    ]
  },
  {
    id: 'kb-doc-06',
    title: 'Objection Handling Playbook: Hinglish Scripts & Parent FAQs',
    category: 'Narratives',
    product: 'All Programs',
    stage: 'All Stages',
    version: 'v1.9',
    lastUpdated: '2026-07-14',
    fileSize: '1.4 MB',
    fileType: 'docx',
    status: 'Active',
    clausesCount: 24,
    summary: 'Approved scripts for handling common hesitations regarding high fees, online format effectiveness, degree validity, and placement doubts.',
    prohibitedClaims: [
      'Do not dismiss parents concerns about offline college balance.',
      'Never advise a student to drop out of university to enroll in NxtWave.'
    ],
    approvedPitchNotes: [
      'Emphasize flexible learning schedule compatible with 3rd & 4th year college hours.',
      'Use the 3F framework: Feel, Felt, Found.',
      'Offer to arrange a student alumni callback if requested by parents.'
    ]
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
    ]
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
    prohibitedClaims: [
      'Do not overpromise timeline accelerations without academic milestones.'
    ],
    approvedPitchNotes: [
      'Outline concurrent project portfolio development.',
      'Highlight weekly technical assessment benchmarks.'
    ]
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
    summary: 'Executive overview of the joint executive certification in partnership with IIT Kharagpur, covering curriculum milestones and faculty masterclasses.',
    prohibitedClaims: [
      'Do not claim that students receive a degree from IIT Kharagpur; it is an executive certification programme.',
      'Never state that on-campus physical hostel residency is provided.'
    ],
    approvedPitchNotes: [
      'Highlight joint curriculum designed with IIT Kharagpur professors.',
      'Explain practical project evaluation and official certificate of completion with verification ID.',
      'Detail weekly doubt resolution sessions with certified industry teaching fellows.'
    ]
  }
];

export const INITIAL_AUDIT_JOBS: AuditJob[] = [
  {
    id: 'job-nw-8921',
    recordingName: 'NW_REC_20261014_RahulVerma_AmitKumar.mp3',
    driveUrl: 'https://drive.google.com/file/d/1A8b9qKxLmNoPqRsTuVwXyZ12345/view',
    counsellorName: 'Rahul Verma',
    counsellorEmpId: 'NW-4091',
    product: 'Academy',
    language: 'Hinglish (Hindi + English)',
    stage: 'DM Call/VC',
    duration: '28m 42s',
    submittedAt: '2026-10-14 16:30',
    status: 'Needs Review',
    progress: 100,
    score: 68,
    criticalViolationCount: 1,
    isSample: true,
    notes: 'Severe placement claim deviation noted at 18:24. Requires auditor review.'
  },
  {
    id: 'job-nw-8920',
    recordingName: 'NW_REC_20261014_PoojaSharma_PriyaPatel.mp3',
    driveUrl: 'https://drive.google.com/file/d/1B7c8rLyMnOpQrStUvWxYz09876/view',
    counsellorName: 'Pooja Sharma',
    counsellorEmpId: 'NW-3820',
    product: 'Intensive',
    language: 'Hinglish (Hindi + English)',
    stage: 'Student Realisation Call/BOB Call',
    duration: '34m 10s',
    submittedAt: '2026-10-14 15:15',
    status: 'Completed',
    progress: 100,
    score: 94,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Exemplary pitch. Deep empathy, crystal clear fee breakdown and 0% EMI disclosure.'
  },
  {
    id: 'job-nw-8919',
    recordingName: 'NW_REC_20261014_KarthikReddy_SureshNaidu.mp3',
    driveUrl: 'https://drive.google.com/file/d/1C6d9sMzAoPqRsTuVwXyZa11223/view',
    counsellorName: 'Karthik Reddy',
    counsellorEmpId: 'NW-4215',
    product: 'Academy',
    language: 'Telugu + English',
    stage: 'Student Realisation Call/BOB Call',
    duration: '22m 18s',
    submittedAt: '2026-10-14 14:00',
    status: 'Completed',
    progress: 100,
    score: 81,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Solid counselling. Missed mentioning the 4-phase mock interview schedule.'
  },
  {
    id: 'job-nw-8918',
    recordingName: 'NW_REC_20261014_SnehaRoy_RohanMehta.mp3',
    driveUrl: 'https://drive.google.com/file/d/1D5e8tNbBqRsTuVwXyZb33445/view',
    counsellorName: 'Sneha Roy',
    counsellorEmpId: 'NW-3950',
    product: 'NIAT',
    language: 'Hindi (Pure)',
    stage: 'Closure VC',
    duration: '19m 45s',
    submittedAt: '2026-10-14 11:40',
    status: 'Completed',
    progress: 100,
    score: 52,
    criticalViolationCount: 2,
    isSample: true,
    notes: 'Critical zero-tolerance failure: promised unapproved ₹15,000 spot cash waiver.'
  },
  {
    id: 'job-nw-8917',
    recordingName: 'NW_REC_20261015_VikasGupta_DeepakSingh.mp3',
    driveUrl: 'https://drive.google.com/file/d/1E4f7uOcCrStUvWxYzAc55667/view',
    counsellorName: 'Vikas Gupta',
    counsellorEmpId: 'NW-4310',
    product: 'NIAT',
    language: 'Hinglish (Hindi + English)',
    stage: 'Interview VC',
    duration: '26m 05s',
    submittedAt: '2026-10-15 10:20',
    status: 'Auditing',
    progress: 72,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Audio transcription finished; running multi-dimensional knowledge base audit.'
  },
  {
    id: 'job-nw-8916',
    recordingName: 'NW_REC_20261015_PoojaSharma_AnanyaDas.mp3',
    driveUrl: 'https://drive.google.com/file/d/1F3g6vPdDsTuVwXyZaBd77889/view',
    counsellorName: 'Pooja Sharma',
    counsellorEmpId: 'NW-3820',
    product: 'NIAT - Academy',
    language: 'English',
    stage: 'Lead Qualification Call',
    duration: '18m 50s',
    submittedAt: '2026-10-15 11:05',
    status: 'Transcribing',
    progress: 38,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Speech diaritization in progress via Hinglish acoustics model.'
  },
  {
    id: 'job-nw-8915',
    recordingName: 'NW_REC_20261015_AdityaNair_VishnuPrasad.mp3',
    driveUrl: 'https://drive.google.com/file/d/1G2h5wQeEtUvWxYzBcCe99001/view',
    counsellorName: 'Aditya Nair',
    counsellorEmpId: 'NW-4402',
    product: 'Intensive',
    language: 'Hinglish (Hindi + English)',
    stage: 'Lead Qualification Call',
    duration: '15m 30s',
    submittedAt: '2026-10-15 12:10',
    status: 'Queued',
    progress: 0,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Queued in ingestion pipeline. Awaiting audio pre-processor slot.'
  },
  {
    id: 'job-nw-8914',
    recordingName: 'NW_REC_20261015_MeeraNambiar_SiddharthVerma.mp3',
    driveUrl: 'https://drive.google.com/file/d/1H1i4vRfFtVwXyZaCdDf00112/view',
    counsellorName: 'Meera Nambiar',
    counsellorEmpId: 'NW-4512',
    product: 'IIT KGP OCN',
    language: 'English',
    stage: 'Student Realisation Call/BOB Call',
    duration: '24m 15s',
    submittedAt: '2026-10-15 13:45',
    status: 'Completed',
    progress: 100,
    score: 88,
    criticalViolationCount: 0,
    isSample: true,
    notes: 'Excellent clarity on IIT KGP faculty credentials and live project capstones.'
  }
];

export const SAMPLE_AUDIT_REPORT_PRIMARY: AuditReport = {
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
  isSample: true,
  reviewerReview: {
    auditorName: 'Sunita Rao',
    auditorEmail: 'sunita.rao@nxtwave.tech',
    status: 'Approved',
    originalScore: 68,
    finalScore: 68,
    notes: 'The counsellor demonstrated strong rapport and technical empathy, but committed a serious compliance infraction at 18:24 by assuring a 100% Google interview placement drive without mentioning the mandatory 85% IRC milestone. Assigned 1-on-1 coaching drill with Team Lead.'
  },
  criteriaBreakdown: [
    {
      id: 'crit-1',
      title: 'Greeting & Rapport Building',
      category: 'Professionalism',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 9,
      status: 'pass',
      feedback: 'Warm introductory hook, verified student identity and college background respectfully in Hinglish.'
    },
    {
      id: 'crit-2',
      title: 'Need Analysis & Profile Discovery',
      category: 'Consultative Sales',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 13,
      status: 'pass',
      feedback: 'Properly discovered that Amit is in 3rd year ECE with basic C++ knowledge and 12 hours weekly bandwidth.'
    },
    {
      id: 'crit-3',
      title: 'Curriculum & Pedagogy Accuracy',
      category: 'Product Knowledge',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 14,
      status: 'pass',
      feedback: 'Accurately described 4.0 Tech stack (React, Node.js, SQL), code playground and doubt clarification rooms.'
    },
    {
      id: 'crit-4',
      title: 'Placement & Career Claims Adherence',
      category: 'Legal & Policy Compliance',
      weightPercent: 20,
      maxScore: 20,
      earnedScore: 7,
      status: 'fail',
      feedback: 'CRITICAL FAILURE: At 18:24, promised "Google aur Microsoft mein aapko direct interview line-up karwa denge guarantee ke saath". Violates KB Clause 3.4 & Anti-Misrepresentation Directive.',
      kbClauseRef: 'Anti-Misrepresentation Manual v2.8 (Clause 3.4)'
    },
    {
      id: 'crit-5',
      title: 'Pricing, Scholarship & EMI Transparency',
      category: 'Financial Compliance',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 9,
      status: 'warning',
      feedback: 'Disclosed total fee ₹88,500 incl. GST, but gave an arbitrary 20% discount on spot without asking student to take NXT-SAT test.',
      kbClauseRef: 'Fee Matrix & Scholarship Policy Q4 2026 (Clause 2)'
    },
    {
      id: 'crit-6',
      title: 'Objection Handling & Empathy',
      category: 'Consultative Sales',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 8,
      status: 'pass',
      feedback: 'Handled prospect fear of managing college semester exams alongside CCBP learning with good pacing.'
    },
    {
      id: 'crit-7',
      title: 'Urgency & Ethical Next Steps',
      category: 'Sales Execution',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 5,
      status: 'warning',
      feedback: 'Used artificial scarcity claim: "Only 2 seats left in Hyderabad batch, book within 30 minutes". Violates Clause 4.2.'
    },
    {
      id: 'crit-8',
      title: 'Professional Tone & Hinglish Clarity',
      category: 'Communication',
      weightPercent: 5,
      maxScore: 5,
      earnedScore: 3,
      status: 'pass',
      feedback: 'Good spoken flow, polite demeanor throughout, natural Hinglish conversation.'
    }
  ],
  transcript: [
    {
      id: 't-1',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '00:08',
      textHinglish: 'Hello Amit! Main Rahul baat kar raha hoon NxtWave Academy se. How are you today?',
      textEnglish: 'Hello Amit! I am Rahul speaking from NxtWave Academy. How are you today?'
    },
    {
      id: 't-2',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '00:15',
      textHinglish: 'Haan Rahul sir, all good. Actually maine website pe CCBP 4.0 program ke liye register kiya tha kal.',
      textEnglish: 'Yes Rahul sir, all good. Actually I had registered on the website yesterday for CCBP 4.0 program.'
    },
    {
      id: 't-3',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '00:24',
      textHinglish: 'Bilkul Amit, maine aapka application dekha. Pehle aap mujhe thoda batayein, current graduation aur coding background ke baare mein? Taki main aapke liye best roadmap suggest kar sakun.',
      textEnglish: 'Absolutely Amit, I saw your application. First please tell me a bit about your current graduation and coding background? So I can suggest the best roadmap for you.',
      highlightType: 'praise',
      highlightNote: 'Proper student need discovery and qualification.'
    },
    {
      id: 't-4',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '00:48',
      textHinglish: 'Sir main 3rd year ECE branch se hoon JNTU college mein. College mein thoda C language padhaya tha but web development ya practical projects bilkul nahi aate. Tech company mein software engineer banna chahta hoon.',
      textEnglish: 'Sir I am from 3rd year ECE branch in JNTU college. College taught basic C language, but I have no web development or practical project skills. I want to become a software engineer in a tech company.'
    },
    {
      id: 't-5',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '02:15',
      textHinglish: 'Amit, ECE branch se software company transition karna completely possible hai. Humare 60% learners non-CS aur core branches se aate hain. CCBP 4.0 mein hum basic programming se start karte hain, fir React, Node.js, SQL aur backend APIs tak complete practical hands-on labs karwate hain.',
      textEnglish: 'Amit, transitioning to a software company from ECE branch is completely possible. 60% of our learners come from non-CS and core branches. In CCBP 4.0 we start from basic programming, then cover React, Node.js, SQL, and backend APIs through complete practical hands-on labs.',
      highlightType: 'praise',
      highlightNote: 'Accurate curriculum and non-CS transition context.'
    },
    {
      id: 't-6',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '07:30',
      textHinglish: 'Sir daily kitna time dena padega? Mera college 9 to 4 chalta hai.',
      textEnglish: 'Sir how much time will I need to commit daily? My college runs 9 to 4.'
    },
    {
      id: 't-7',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '07:45',
      textHinglish: 'Aapko evening mein daily 2 ghante ya weekend pe 4 ghante nikaalne honge. Humare bite-sized lessons hain jo aap mobile ya laptop kisi par bhi dekh sakte ho.',
      textEnglish: 'You need to spare 2 hours daily in the evening or 4 hours on weekends. We have bite-sized lessons that you can watch on either mobile or laptop.'
    },
    {
      id: 't-8',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '17:50',
      textHinglish: 'Rahul sir, sab theek hai but placements ka kya assurance hai? Market mein bol rahe hain hiring freeze chal raha hai.',
      textEnglish: 'Rahul sir, all is good but what is the placement assurance? People in the market say there is a hiring freeze going on.'
    },
    {
      id: 't-9',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '18:24',
      textHinglish: 'Amit aap bilkul tension mat lo. CCBP mein Google aur Microsoft mein aapko direct interview line-up karwa denge humari taraf se guarantee ke saath, no matter recession ho ya nahi.',
      textEnglish: 'Amit do not worry at all. In CCBP we will line up direct interviews for you at Google and Microsoft with guarantee from our side, whether there is a recession or not.',
      highlightType: 'critical',
      highlightNote: 'CRITICAL VIOLATION: Guaranteed direct interview line-up at Google/Microsoft. Violates Clause 3.4 of Anti-Misrepresentation Compliance Manual.',
      linkedFindingId: 'f-crit-01'
    },
    {
      id: 't-10',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '19:10',
      textHinglish: 'Achha Google mein direct call letter aayega? Aur fees kitni hogi iski?',
      textEnglish: 'Oh direct call letter will come from Google? And what will be the fee for this?'
    },
    {
      id: 't-11',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '19:35',
      textHinglish: 'Official fee toh ₹88,500 hai with GST. Lekin abhi agar aap finalize karte ho toh main special 20% discount approval dila deta hoon, aapko ₹70,000 padega.',
      textEnglish: 'The official fee is ₹88,500 with GST. But if you finalize right now I will get you a special 20% discount approved, it will cost you ₹70,000.',
      highlightType: 'unsupported',
      highlightNote: 'UNSUPPORTED CLAIM: Spot discount offered without NXT-SAT scholarship test verification.',
      linkedFindingId: 'f-claim-01'
    },
    {
      id: 't-12',
      speaker: 'Prospect',
      speakerName: 'Amit Kumar',
      timestamp: '21:05',
      textHinglish: 'Sir ek baar papa se baat karke bataun shaam ko?',
      textEnglish: 'Sir can I speak with my father once and tell you by evening?'
    },
    {
      id: 't-13',
      speaker: 'Counsellor',
      speakerName: 'Rahul Verma',
      timestamp: '21:18',
      textHinglish: 'Shaam ko Amit Hyderabad batch ki seats close ho jayengi, sirf 2 seats bachi hain. Aap abhi ₹2,000 se seat lock kar lijiye warna seat cancel ho jayegi.',
      textEnglish: 'By evening Amit Hyderabad batch seats will close, only 2 seats are left. Please lock your seat right now with ₹2,000 or the seat will be cancelled.',
      highlightType: 'unsupported',
      highlightNote: 'Artificial scarcity high-pressure closing tactic (Clause 4.2 violation).'
    }
  ],
  findings: [
    {
      id: 'f-crit-01',
      type: 'critical',
      timestamp: '18:24',
      quote: '"CCBP mein Google aur Microsoft mein aapko direct interview line-up karwa denge humari taraf se guarantee ke saath"',
      clauseReference: 'Anti-Misrepresentation Compliance Manual v2.8 - Clause 3.4 & Clause 3.1',
      explanation: 'The counsellor explicitly guaranteed direct interviews at Tier-1 companies (Google, Microsoft) without mentioning performance evaluation or IRC eligibility milestones. This violates legal edtech compliance mandates.',
      severity: 'High',
      policyDoc: 'Career Assurance & Anti-Misrepresentation Compliance Manual'
    },
    {
      id: 'f-claim-01',
      type: 'violation',
      timestamp: '19:35',
      quote: '"Lekin abhi agar aap finalize karte ho toh main special 20% discount approval dila deta hoon, aapko ₹70,000 padega"',
      clauseReference: 'Standard Fee Matrix & Scholarship Policy Q4 2026 - Clause 2 (Scholarship Allocation Rules)',
      explanation: 'Counsellor promised a discretionary 20% tuition discount on spot. Company policy requires all fee concessions to be substantiated by a verified NXT-SAT scholarship diagnostic score.',
      severity: 'Medium',
      policyDoc: 'Standard Fee Matrix, Scholarship Slabs & EMI Policy'
    },
    {
      id: 'f-missing-01',
      type: 'missing',
      timestamp: '14:10',
      quote: 'Omission during pedagogy overview',
      clauseReference: 'CCBP 4.0 Approved Sales Pitch v3.2 - Section 3 (IRC Pitch)',
      explanation: 'Counsellor failed to explain the Industry Readiness Cell (IRC) 4-phase mock interview process and the 85% project completion requirement for placement drives.',
      severity: 'Medium',
      policyDoc: 'CCBP 4.0 - Approved Sales Pitch & Narrative Guidelines'
    },
    {
      id: 'f-positive-01',
      type: 'positive',
      timestamp: '00:24',
      quote: '"Pehle aap mujhe thoda batayein, current graduation aur coding background ke baare mein? Taki main aapke liye best roadmap suggest kar sakun."',
      clauseReference: 'Sales Pitch Guidelines v3.2 - Section 2 (Mandatory Qualification Checklist)',
      explanation: 'Exemplary consultative opening. Took time to probe the candidates branch, existing programming grasp, and weekly study bandwidth.',
      severity: 'Low',
      policyDoc: 'CCBP 4.0 - Approved Sales Pitch & Narrative Guidelines'
    }
  ],
  missingNarratives: [
    {
      id: 'mn-1',
      title: 'IRC 85% Milestone Disclosure',
      expectedTopic: 'Must state that learner must complete 85% of assignments to unlock partner company placement drives.',
      importance: 'Mandatory',
      guidelineDoc: 'CCBP 4.0 Sales Pitch Guidelines v3.2',
      impactNote: 'Critical omission: creates false expectation that passive enrollment guarantees placement drives.'
    },
    {
      id: 'mn-2',
      title: '7-Day Unconditional Refund Policy Disclosure',
      expectedTopic: 'Must inform candidate that a 7-day trial window exists from batch start date.',
      importance: 'Mandatory',
      guidelineDoc: 'Pricing and Policies Q4 2026',
      impactNote: 'Candidate was hesitant regarding risk; sharing the refund window would have built trust legally.'
    },
    {
      id: 'mn-3',
      title: 'Practical GitHub Portfolio Requirement',
      expectedTopic: 'Explain that the candidate will graduate with 4 real-world projects deployed on live URLs.',
      importance: 'Recommended',
      guidelineDoc: 'CCBP 4.0 Academy Narrative v3.2',
      impactNote: 'Valuable value-builder for non-CS engineers transitioning to tech roles.'
    }
  ],
  unsupportedClaims: [
    {
      id: 'uc-1',
      timestamp: '18:24',
      claimMade: 'Guaranteed direct interviews at Google & Microsoft regardless of hiring conditions.',
      actualPolicy: 'NxtWave connects learners with 3,000+ hiring partner companies. Tier-1 product giants cannot be guaranteed directly.',
      referenceDoc: 'Anti-Misrepresentation Manual v2.8 (Clause 3.4)',
      riskSeverity: 'Critical'
    },
    {
      id: 'uc-2',
      timestamp: '19:35',
      claimMade: 'Flat 20% on-the-spot fee reduction without test.',
      actualPolicy: 'Discounts can only be granted according to verified NXT-SAT score percentiles (10% to 35%).',
      referenceDoc: 'Fee Matrix & Scholarship Policy Q4 2026 (Clause 2)',
      riskSeverity: 'Moderate'
    },
    {
      id: 'uc-3',
      timestamp: '21:18',
      claimMade: 'Only 2 seats left in the entire Hyderabad batch, expires in 30 minutes.',
      actualPolicy: 'Coercive false scarcity deadlines are strictly forbidden under Clause 4.2.',
      referenceDoc: 'Anti-Misrepresentation Manual v2.8 (Clause 4.2)',
      riskSeverity: 'Moderate'
    }
  ],
  criticalViolations: [
    {
      id: 'cv-1',
      timestamp: '18:24',
      title: 'False Tier-1 Placement Guarantee',
      quote: '"CCBP mein Google aur Microsoft mein aapko direct interview line-up karwa denge humari taraf se guarantee ke saath"',
      violationRule: 'Clause 3.4 of Anti-Misrepresentation Directive: Promising guaranteed direct employment or interviews at specific Tier-1 MNCs without disclosure of prerequisites is a Level-1 Zero-Tolerance Breach.',
      policyDoc: 'Career Assurance & Anti-Misrepresentation Compliance Manual',
      zeroToleranceAction: 'Score capped at 68/100 maximum, mandatory manager 1-on-1 retraining required within 48 hours.'
    }
  ],
  coachingRecommendations: [
    {
      id: 'cr-1',
      area: 'Placement Script Re-alignment',
      observedDeficiency: 'Overpromised direct hiring at Google/Microsoft when prospect expressed recession worries.',
      recommendedPhrasing: '"Amit, hum aapko industry-ready projects aur 3,000+ hiring partners tak pahunchate hain. Aap jab 85% benchmark clear kar lete ho, tab top tech companies ke interviews shortlist hote hain."',
      trainingModule: 'Module 4: Ethical Placement Expectation Setting (LMS-302)'
    },
    {
      id: 'cr-2',
      area: 'Scholarship Diagnostic Flow',
      observedDeficiency: 'Offered random 20% cash discount instead of leveraging the NXT-SAT merit exam.',
      recommendedPhrasing: '"Amit, hamare paas NXT-SAT merit scholarship hai. 30 minute ka test hai, jismein aapki analytical ability test hoti hai. Aap test dekar 10% se 35% tak scholarship earn kar sakte hain."',
      trainingModule: 'Module 7: Scholarship & Fee Presentation Ethics (LMS-308)'
    },
    {
      id: 'cr-3',
      area: 'Removing High-Pressure Urgency Tactics',
      observedDeficiency: 'Pressured candidate by stating "only 2 seats remain and fee will lapse in 30 mins".',
      recommendedPhrasing: '"Amit, aap zaroor apne parents se discuss kijiye. Main aapko program syllabus aur 0% EMI details WhatsApp par bhej raha hoon, hum kal 11 baje connect karein?"',
      trainingModule: 'Module 2: Consultative Parent Interaction & Respectful Follow-ups'
    }
  ]
};

export const COUNSELLOR_SUMMARIES: CounsellorSummary[] = [
  {
    id: 'c-1',
    name: 'Pooja Sharma',
    empId: 'NW-3820',
    team: 'Team Alpha (Hyderabad)',
    auditsCount: 38,
    averageScore: 92.4,
    violationRate: 0.0,
    status: 'Top Performer',
    streakWeeks: 6
  },
  {
    id: 'c-2',
    name: 'Karthik Reddy',
    empId: 'NW-4215',
    team: 'Team Beta (Bengaluru)',
    auditsCount: 42,
    averageScore: 84.8,
    violationRate: 2.3,
    status: 'Compliant',
    streakWeeks: 3
  },
  {
    id: 'c-3',
    name: 'Rahul Verma',
    empId: 'NW-4091',
    team: 'Team Alpha (Hyderabad)',
    auditsCount: 35,
    averageScore: 71.2,
    violationRate: 8.5,
    status: 'Under Review',
    streakWeeks: 0
  },
  {
    id: 'c-4',
    name: 'Sneha Roy',
    empId: 'NW-3950',
    team: 'Team Delta (Delhi NCR)',
    auditsCount: 29,
    averageScore: 66.5,
    violationRate: 13.8,
    status: 'Under Review',
    streakWeeks: 0
  },
  {
    id: 'c-5',
    name: 'Vikas Gupta',
    empId: 'NW-4310',
    team: 'Team Beta (Bengaluru)',
    auditsCount: 31,
    averageScore: 86.1,
    violationRate: 1.5,
    status: 'Compliant',
    streakWeeks: 4
  },
  {
    id: 'c-6',
    name: 'Aditya Nair',
    empId: 'NW-4402',
    team: 'Team Delta (Delhi NCR)',
    auditsCount: 24,
    averageScore: 79.7,
    violationRate: 4.1,
    status: 'Compliant',
    streakWeeks: 2
  }
];

export const TEAM_ANALYTICS = [
  { team: 'Team Alpha (Hyderabad)', auditorsCount: 14, auditsThisMonth: 512, avgScore: 81.6, criticalViolations: 8 },
  { team: 'Team Beta (Bengaluru)', auditorsCount: 12, auditsThisMonth: 440, avgScore: 84.2, criticalViolations: 4 },
  { team: 'Team Delta (Delhi NCR)', auditorsCount: 10, auditsThisMonth: 388, avgScore: 74.8, criticalViolations: 12 },
  { team: 'Team Gamma (Pune / Remote)', auditorsCount: 8, auditsThisMonth: 294, avgScore: 79.1, criticalViolations: 5 }
];

export const COMMON_AUDIT_FAILURES = [
  { issue: 'Exaggerated Placement Guarantee Claims (Google/MNCs)', count: 48, percentage: 34, severity: 'Critical' },
  { issue: 'Discretionary Spot Discounting without NXT-SAT Test', count: 36, percentage: 26, severity: 'High' },
  { issue: 'Failure to Disclose 85% IRC Attendance Milestone', count: 25, percentage: 18, severity: 'Medium' },
  { issue: 'Coercive Scarcity Deadlines ("Seats expiring in 30 mins")', count: 20, percentage: 14, severity: 'Medium' },
  { issue: 'Inadequate Academic Need Discovery / Pushing wrong program', count: 11, percentage: 8, severity: 'Low' }
];

export const SCORE_TREND_WEEKS = [
  { week: 'Week 36', avgScore: 72.1, audits: 320, violations: 18 },
  { week: 'Week 37', avgScore: 74.5, audits: 345, violations: 15 },
  { week: 'Week 38', avgScore: 76.0, audits: 360, violations: 14 },
  { week: 'Week 39', avgScore: 77.8, audits: 382, violations: 10 },
  { week: 'Week 40', avgScore: 78.4, audits: 410, violations: 9 },
  { week: 'Week 41', avgScore: 80.2, audits: 425, violations: 7 }
];

export const SAMPLE_AUDIT_REPORT_POOJA: AuditReport = {
  id: 'report-nw-8920',
  jobId: 'job-nw-8920',
  counsellorName: 'Pooja Sharma',
  counsellorEmpId: 'NW-3820',
  team: 'Team Alpha (Hyderabad Tech Sales)',
  product: 'CCBP Intensive',
  language: 'Hinglish (Hindi + English)',
  duration: '34m 10s',
  callDate: '2026-10-14 15:15',
  auditDate: '2026-10-14 16:00',
  overallScore: 94,
  maxScore: 100,
  complianceTier: 'Exemplary',
  isSample: true,
  reviewerReview: {
    auditorName: 'Sunita Rao',
    auditorEmail: 'sunita.rao@nxtwave.tech',
    status: 'Approved',
    originalScore: 94,
    finalScore: 94,
    notes: 'Exemplary consultative counselling pitch. Handled non-CS candidate fear of coding with patience, explained 4-tier mentor support, and cleanly walked through the 0% EMI financing terms.'
  },
  criteriaBreakdown: [
    {
      id: 'crit-p1',
      title: 'Greeting & Rapport Building',
      category: 'Professionalism',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 10,
      status: 'pass',
      feedback: 'Professional, warm opening in Hinglish. Made candidate feel at ease immediately.'
    },
    {
      id: 'crit-p2',
      title: 'Need Analysis & Profile Discovery',
      category: 'Consultative Sales',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 15,
      status: 'pass',
      feedback: 'Thoroughly uncovered that Priya is a 2024 Mechanical engineering graduate looking to shift to IT frontend development.'
    },
    {
      id: 'crit-p3',
      title: 'Curriculum & Pedagogy Accuracy',
      category: 'Product Knowledge',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 14,
      status: 'pass',
      feedback: 'Explained foundational computational thinking modules and practical React/Node assignments accurately.'
    },
    {
      id: 'crit-p4',
      title: 'Placement & Career Claims Adherence',
      category: 'Legal & Policy Compliance',
      weightPercent: 20,
      maxScore: 20,
      earnedScore: 19,
      status: 'pass',
      feedback: 'Accurately stated placement criteria, 85% attendance requirement, and highlighted realistic 4.5-9 LPA hiring partner drives.'
    },
    {
      id: 'crit-p5',
      title: 'Pricing, Scholarship & EMI Transparency',
      category: 'Financial Compliance',
      weightPercent: 15,
      maxScore: 15,
      earnedScore: 14,
      status: 'pass',
      feedback: 'Transparently cited base fee ₹1,20,000 + GST. Administered NXT-SAT link on the call for genuine scholarship qualification.'
    },
    {
      id: 'crit-p6',
      title: 'Objection Handling & Empathy',
      category: 'Consultative Sales',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 10,
      status: 'pass',
      feedback: 'Brilliant response to parents fear of non-CS background disadvantages in tech hiring.'
    },
    {
      id: 'crit-p7',
      title: 'Urgency & Ethical Next Steps',
      category: 'Sales Execution',
      weightPercent: 10,
      maxScore: 10,
      earnedScore: 8,
      status: 'pass',
      feedback: 'Gave adequate 24-hour consideration window and scheduled follow-up after NXT-SAT test results.'
    },
    {
      id: 'crit-p8',
      title: 'Professional Tone & Hinglish Clarity',
      category: 'Communication',
      weightPercent: 5,
      maxScore: 5,
      earnedScore: 4,
      status: 'pass',
      feedback: 'Clear articulate delivery, impeccable bilingual phrasing.'
    }
  ],
  transcript: [
    {
      id: 'tp-1',
      speaker: 'Counsellor',
      speakerName: 'Pooja Sharma',
      timestamp: '00:10',
      textHinglish: 'Namaste Priya! Main Pooja baat kar rahi hoon NxtWave career team se. How are you doing today?',
      textEnglish: 'Namaste Priya! I am Pooja speaking from the NxtWave career team. How are you doing today?'
    },
    {
      id: 'tp-2',
      speaker: 'Prospect',
      speakerName: 'Priya Patel',
      timestamp: '00:20',
      textHinglish: 'Hello Pooja maam, main theek hoon. Actually mujhe coding seekhni hai but mera background Mechanical Engineering hai, toh kaafi dar lag raha hai.',
      textEnglish: 'Hello Pooja maam, I am fine. Actually I want to learn coding but my background is Mechanical Engineering, so I am very scared.'
    },
    {
      id: 'tp-3',
      speaker: 'Counsellor',
      speakerName: 'Pooja Sharma',
      timestamp: '01:05',
      textHinglish: 'Priya, aapka dar bilkul natural hai. But trust me, programming logic seekhne ke liye computer science degree zaroori nahi hoti. Hamare Intensive program mein hum Day 1 se ground zero se start karte hain.',
      textEnglish: 'Priya, your fear is completely natural. But trust me, learning programming logic does not require a computer science degree. In our Intensive program we start from ground zero from Day 1.',
      highlightType: 'praise',
      highlightNote: 'High empathy and consultative framing.'
    },
    {
      id: 'tp-4',
      speaker: 'Prospect',
      speakerName: 'Priya Patel',
      timestamp: '12:40',
      textHinglish: 'Maam placements kaise hote hain non-IT students ke liye?',
      textEnglish: 'Maam how do placements work for non-IT students?'
    },
    {
      id: 'tp-5',
      speaker: 'Counsellor',
      speakerName: 'Pooja Sharma',
      timestamp: '13:10',
      textHinglish: 'Priya, placement drives mein baithne ke liye aapko 85% practical assignments aur Industry Readiness Cell (IRC) benchmark score clear karna padta hai. Companies candidate ke GitHub projects aur problem-solving skills test karti hain.',
      textEnglish: 'Priya, to sit for placement drives you have to clear 85% practical assignments and Industry Readiness Cell (IRC) benchmark score. Companies evaluate candidates based on their GitHub projects and problem-solving skills.',
      highlightType: 'praise',
      highlightNote: 'Compliant disclosure of 85% benchmark prerequisite.'
    }
  ],
  findings: [
    {
      id: 'fp-1',
      type: 'positive',
      timestamp: '01:05',
      quote: '"Priya, aapka dar bilkul natural hai... Day 1 se ground zero se start karte hain"',
      clauseReference: 'CCBP Intensive Syllabus v2.1 - Section 1',
      explanation: 'Exceptional handling of non-CS student self-doubt with structured reassurance.',
      severity: 'Low',
      policyDoc: 'CCBP Intensive 2.0 Syllabus'
    },
    {
      id: 'fp-2',
      type: 'positive',
      timestamp: '13:10',
      quote: '"Priya, placement drives mein baithne ke liye aapko 85% practical assignments aur Industry Readiness Cell (IRC) benchmark score clear karna padta hai."',
      clauseReference: 'Career Assurance Directive v2.8 - Clause 3.1',
      explanation: 'Full compliance with placement eligibility prerequisite disclosure.',
      severity: 'Low',
      policyDoc: 'Career Assurance Compliance Manual'
    }
  ],
  missingNarratives: [],
  unsupportedClaims: [],
  criticalViolations: [],
  coachingRecommendations: [
    {
      id: 'cr-p1',
      area: 'Call Pacing in Final 5 Minutes',
      observedDeficiency: 'Call ran slightly long (34 mins).',
      recommendedPhrasing: 'Send curriculum brochure via WhatsApp 20 minutes into the call to accelerate document walk-through.',
      trainingModule: 'Time Management in Admission Consultations (LMS-104)'
    }
  ]
};

export const getAuditReportForJob = (jobId: string): AuditReport => {
  if (jobId === 'job-nw-8920') {
    return SAMPLE_AUDIT_REPORT_POOJA;
  }
  // Default to primary detailed report
  return SAMPLE_AUDIT_REPORT_PRIMARY;
};

