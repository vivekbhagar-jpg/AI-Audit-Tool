import React, { useState } from 'react';
import { AuditJob, NavScreen } from '../../types';
import { 
  getStagesForProduct, 
  getDefaultStageForProduct, 
  isValidProductStage,
  PRODUCTS 
} from '../../config/callStages';
import { 
  Play, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  FileAudio, 
  Clock, 
  Users, 
  BookOpen,
  Link2
} from 'lucide-react';

interface NewAuditViewProps {
  onAddJob: (job: AuditJob) => void;
  onNavigate: (screen: NavScreen) => void;
}

export const NewAuditView: React.FC<NewAuditViewProps> = ({
  onAddJob,
  onNavigate
}) => {
  const [sourceType, setSourceType] = useState<'drive' | 'upload'>('drive');
  const [driveUrl, setDriveUrl] = useState('');
  const [uploadedAudioPath, setUploadedAudioPath] = useState('');
  const [uploadedAudioName, setUploadedAudioName] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [product, setProduct] = useState<string>('Intensive');
  const [counsellorName, setCounsellorName] = useState('');
  const [counsellorEmpId, setCounsellorEmpId] = useState('');
  const [language, setLanguage] = useState('Hinglish (Hindi + English)');
  const [stage, setStage] = useState<string>(() => getDefaultStageForProduct('Intensive'));
  const [durationEst, setDurationEst] = useState('24m');
  const [rubricChoice, setRubricChoice] = useState('Standard 8-Factor Comprehensive (100 pts)');
  
  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submittedJob, setSubmittedJob] = useState<AuditJob | null>(null);

  const handleAudioUpload = async (file: File) => {
    setIsUploadingAudio(true);
    setErrors((prev) => ({ ...prev, driveUrl: '', audio: '' }));
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload audio recording.');
      }

      const result = await res.json();
      setUploadedAudioPath(result.audioUrl);
      setUploadedAudioName(result.originalname);
      setDriveUrl(result.audioUrl);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, audio: err.message || 'Audio upload failed' }));
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Quick picker for counsellors
  const quickCounsellors = [
    { name: 'Rahul Verma', empId: 'NW-4091' },
    { name: 'Pooja Sharma', empId: 'NW-3820' },
    { name: 'Karthik Reddy', empId: 'NW-4215' },
    { name: 'Sneha Roy', empId: 'NW-3950' },
    { name: 'Vikas Gupta', empId: 'NW-4310' },
    { name: 'Aditya Nair', empId: 'NW-4402' }
  ];

  const handleSelectQuickCounsellor = (c: { name: string; empId: string }) => {
    setCounsellorName(c.name);
    setCounsellorEmpId(c.empId);
    if (errors.counsellor) {
      setErrors((prev) => ({ ...prev, counsellor: '', empId: '' }));
    }
  };

  const handleUseSampleDriveUrl = () => {
    setDriveUrl('https://drive.google.com/file/d/1A8b9qKxLmNoPqRsTuVwXyZ12345/view?usp=sharing');
    if (errors.driveUrl) {
      setErrors((prev) => ({ ...prev, driveUrl: '' }));
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (sourceType === 'drive') {
      if (!driveUrl.trim()) {
        newErrors.driveUrl = 'Google Drive recording URL is required.';
      } else {
        const isDrive = driveUrl.includes('drive.google.com') || driveUrl.includes('docs.google.com');
        const isValidUrl = driveUrl.startsWith('http://') || driveUrl.startsWith('https://');
        if (!isValidUrl) {
          newErrors.driveUrl = 'Please enter a valid URL starting with https://';
        } else if (!isDrive) {
          newErrors.driveUrl = 'URL must be a valid Google Drive file share link (drive.google.com).';
        }
      }
    } else {
      if (!uploadedAudioPath) {
        newErrors.driveUrl = 'Please upload an audio file (.mp3, .wav, .m4a).';
      }
    }

    if (!counsellorName.trim()) {
      newErrors.counsellor = 'Counsellor full name is required.';
    }

    if (!counsellorEmpId.trim()) {
      newErrors.empId = 'Employee ID is required (e.g. NW-4091).';
    }

    if (!product || !product.trim()) {
      newErrors.product = 'Target product track is required.';
    }

    if (!stage || !isValidProductStage(product, stage)) {
      newErrors.stage = `Please select a valid Call Stage for ${product}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Extract filename from uploaded audio or create a clean identifier
    const recordingIdentifier = uploadedAudioName
      ? uploadedAudioName
      : `NW_REC_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${counsellorName.replace(/\s+/g, '')}_Call.mp3`;

    const newJob: AuditJob = {
      id: `job-nw-${Date.now().toString().slice(-4)}`,
      recordingName: recordingIdentifier,
      driveUrl: sourceType === 'drive' ? driveUrl.trim() : uploadedAudioPath,
      audioPath: uploadedAudioPath || undefined,
      counsellorName: counsellorName.trim(),
      counsellorEmpId: counsellorEmpId.trim().toUpperCase(),
      product,
      language,
      stage,
      duration: durationEst.trim() || '20m 00s',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Queued',
      progress: 0,
      criticalViolationCount: 0,
      isSample: false,
      notes: `Queued with rubric: ${rubricChoice}. Awaiting Gemini audio transcription worker.`
    };

    onAddJob(newJob);
    setSubmittedJob(newJob);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New Counselling Call Audit
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Submit Google Drive recording links to audit Hinglish, Hindi, and English counselling sessions against approved policies.
        </p>
      </div>

      {/* Success Notification after submission */}
      {submittedJob ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                Recording Successfully Enqueued for Audit
              </h2>
              <p className="text-xs text-slate-600">
                Job ID: <span className="font-mono font-semibold text-slate-800">{submittedJob.id}</span> · File: <span className="font-mono text-slate-800">{submittedJob.recordingName}</span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Current Status: Queued (0% Progress)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The Google Drive recording link has been validated and registered in the Audit Queue ready for QA speech evaluation.
            </p>
            <div className="pt-1 flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <span>Counsellor: {submittedJob.counsellorName} ({submittedJob.counsellorEmpId})</span>
              <span>·</span>
              <span>Language: {submittedJob.language}</span>
              <span>·</span>
              <span>Product: {submittedJob.product}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('audit-queue')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <span>Go to Audit Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSubmittedJob(null);
                setDriveUrl('');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Submit Another Recording
            </button>
          </div>
        </div>
      ) : (
        /* The Audit Submission Form */
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
          {/* Informational Guidance Notice */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
            <FileAudio className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-blue-900">Supported Recording Ingestion</span>
              <p className="text-blue-800 leading-relaxed">
                Provide public or workspace-shared Google Drive URLs for call recordings (.mp3, .m4a, .wav). The system parses speaker diarization for Hinglish, Hindi, Telugu, and English conversations.
              </p>
            </div>
          </div>

          {/* Section 1: Drive URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span>Google Drive Recording Link</span>
                <span className="text-rose-600">*</span>
              </label>

              <button
                type="button"
                onClick={handleUseSampleDriveUrl}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Paste Sample Drive Link
              </button>
            </div>

            <div className="relative">
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  if (errors.driveUrl) setErrors((prev) => ({ ...prev, driveUrl: '' }));
                }}
                placeholder="https://drive.google.com/file/d/1A8b9qKxLmNoPqRsTuVwXyZ12345/view?usp=sharing"
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono focus:outline-none transition-colors ${
                  errors.driveUrl 
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' 
                    : 'border-slate-300 focus:border-slate-600'
                }`}
              />
            </div>
            {errors.driveUrl ? (
              <p className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.driveUrl}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Ensure permissions are set to "Anyone with link can view" or shared with the NxtWave QA service account.
              </p>
            )}
          </div>

          {/* Section 2: Counsellor Details */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Counsellor Information</span>
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Quick select from active roster:</span>
            </div>

            {/* Quick Picker chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {quickCounsellors.map((c) => (
                <button
                  type="button"
                  key={c.empId}
                  onClick={() => handleSelectQuickCounsellor(c)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                    counsellorEmpId === c.empId
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.name} ({c.empId})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Counsellor Full Name</label>
                <input
                  type="text"
                  value={counsellorName}
                  onChange={(e) => {
                    setCounsellorName(e.target.value);
                    if (errors.counsellor) setErrors((prev) => ({ ...prev, counsellor: '' }));
                  }}
                  placeholder="e.g. Rahul Verma"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs focus:outline-none ${
                    errors.counsellor ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 focus:border-slate-600'
                  }`}
                />
                {errors.counsellor && (
                  <p className="text-[11px] text-rose-600">{errors.counsellor}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Employee ID</label>
                <input
                  type="text"
                  value={counsellorEmpId}
                  onChange={(e) => {
                    setCounsellorEmpId(e.target.value);
                    if (errors.empId) setErrors((prev) => ({ ...prev, empId: '' }));
                  }}
                  placeholder="e.g. NW-4091"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono uppercase focus:outline-none ${
                    errors.empId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 focus:border-slate-600'
                  }`}
                />
                {errors.empId && (
                  <p className="text-[11px] text-rose-600">{errors.empId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Product & Language */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Target Product Track <span className="text-rose-600">*</span>
              </label>
              <select
                value={product}
                onChange={(e) => {
                  const newProd = e.target.value;
                  setProduct(newProd);
                  const validStages = getStagesForProduct(newProd);
                  if (!validStages.includes(stage)) {
                    setStage(validStages[0]);
                  }
                  if (errors.product) setErrors((prev) => ({ ...prev, product: '' }));
                }}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-600"
              >
                {PRODUCTS.map((prod) => (
                  <option key={prod} value={prod}>{prod}</option>
                ))}
              </select>
              {errors.product && (
                <p className="text-[11px] text-rose-600">{errors.product}</p>
              )}
              <p className="text-[11px] text-slate-500">
                Determines the specific curriculum milestones and pricing matrix used for verification.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Call Language / Dialect <span className="text-rose-600">*</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-600"
              >
                <option value="Auto-detect (Hinglish Priority)">Auto-detect (Hinglish Priority)</option>
                <option value="Hinglish (Hindi + English)">Hinglish (Hindi + English)</option>
                <option value="Hindi (Pure)">Hindi (Pure)</option>
                <option value="English">English</option>
                <option value="Telugu + English">Telugu + English</option>
                <option value="Tamil + English">Tamil + English</option>
                <option value="Kannada + English">Kannada + English</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Optimizes acoustics model for conversational Indian code-mixing.
              </p>
            </div>
          </div>

          {/* Section 4: Call Stage, Duration & Rubric */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">
                Call Stage <span className="text-rose-600">*</span>
              </label>
              <select
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  if (errors.stage) setErrors((prev) => ({ ...prev, stage: '' }));
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-slate-600 cursor-pointer font-medium text-slate-800"
              >
                {getStagesForProduct(product).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              {errors.stage && (
                <p className="text-[11px] text-rose-600">{errors.stage}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">Est. Call Duration</label>
              <input
                type="text"
                value={durationEst}
                onChange={(e) => setDurationEst(e.target.value)}
                placeholder="24m"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-600"
              >
              </input>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 block">Scoring Rubric</label>
              <select
                value={rubricChoice}
                onChange={(e) => setRubricChoice(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-slate-600"
              >
                <option value="Standard 8-Factor Comprehensive (100 pts)">Standard 8-Factor (100 pts)</option>
                <option value="Sales Compliance & Misrepresentation Focus">Compliance &amp; Policy Only</option>
                <option value="Fast Triage Quality Check">Fast Triage (50 pts)</option>
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Auditing against 6 active knowledge base documents.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('audit-queue')}
                className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4 text-blue-100" />
                <span>Start Call Audit</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
