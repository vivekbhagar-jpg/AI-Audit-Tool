/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KnowledgeDoc, DocCategory, DocStatus, FileType } from '../../types';
import { 
  Plus, 
  Search, 
  FileText, 
  UploadCloud, 
  X, 
  CheckCircle, 
  Archive, 
  Eye, 
  Layers, 
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Tag,
  Sparkles,
  BookOpen,
  Loader2,
  Trash2,
  Download,
  LogIn,
  AlertTriangle,
  RefreshCw,
  Clock,
  SlidersHorizontal,
  Edit3,
  Save
} from 'lucide-react';
import { 
  extractTextFromFile, 
  analyzeDocumentContent, 
  ExtractedDocumentData 
} from '../../lib/documentProcessor';
import { 
  seedKnowledgeSourcesToFirestore,
  generateStableKnowledgeDocId,
  UploadProgressInfo,
  updateKnowledgeDocDetails
} from '../../services/knowledgeService';
import { 
  PRODUCTS,
  PRODUCT_STAGE_MAP,
  getStagesForProduct, 
  getDefaultStageForProduct, 
  isValidProductStage,
  matchesProduct,
  matchesStage 
} from '../../config/callStages';
import { useAuth } from '../../contexts/AuthContext';

interface KnowledgeBaseViewProps {
  docs: KnowledgeDoc[];
  onAddDoc: (
    newDoc: KnowledgeDoc, 
    rawFile?: File, 
    onProgress?: (info: UploadProgressInfo) => void
  ) => Promise<void> | void;
  onToggleStatus: (docId: string, newStatus: DocStatus) => Promise<void> | void;
  onDeleteDoc?: (docId: string) => Promise<void> | void;
  onRefresh?: () => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  docs,
  onAddDoc,
  onToggleStatus,
  onDeleteDoc,
  onRefresh,
}) => {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDocForViewing, setActiveDocForViewing] = useState<KnowledgeDoc | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');

  // Upload Modal State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractedDocumentData | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocCategory>('Narratives');
  const [newProduct, setNewProduct] = useState<string>('Intensive');
  const [newStage, setNewStage] = useState<string>(() => getDefaultStageForProduct('Intensive'));
  const [newVersion, setNewVersion] = useState('v1.0');
  const [newFileType, setNewFileType] = useState<FileType>('pdf');
  const [newSummary, setNewSummary] = useState('');
  const [newSnippet, setNewSnippet] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Document Edit State (for updating Product and Stage)
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<string>('Intensive');
  const [editStage, setEditStage] = useState<string>(() => getDefaultStageForProduct('Intensive'));
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string>('');
  const [editErrorMsg, setEditErrorMsg] = useState<string>('');

  // Category navigation tabs
  const categories: { label: string; value: string }[] = [
    { label: 'All Documents', value: 'All' },
    { label: 'Narratives & Pitches', value: 'Narratives' },
    { label: 'Product Knowledge', value: 'Product Knowledge' },
    { label: 'Pricing & Policies', value: 'Pricing and Policies' },
    { label: 'Audit Rubrics', value: 'Audit Rubrics' },
  ];

  // Filtered documents strictly enforcing Product and Call Stage
  const filteredDocs = docs.filter((doc) => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesProd = matchesProduct(doc.product, selectedProduct);
    const matchesStg = matchesStage(doc.stage, selectedStage);

    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.stage && doc.stage.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesProd && matchesStg && matchesSearch;
  });

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setNewFileName(file.name);
    setIsExtracting(true);
    setUploadError('');

    try {
      const { text, fileType } = await extractTextFromFile(file);
      setNewFileType(fileType);

      const analysis = analyzeDocumentContent(
        text,
        file.name,
        file.size,
        fileType,
        newCategory,
        newProduct
      );

      setExtractionResult(analysis);
      if (!newTitle.trim()) {
        const cleanedName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        setNewTitle(cleanedName);
      }
      setNewSummary(analysis.summary);
      setNewSnippet(analysis.snippet);
    } catch (err: any) {
      console.error('[KnowledgeBaseView] Error processing file:', err);
      setUploadError(`Failed to parse document text: ${err?.message || 'Unsupported format'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!newTitle.trim()) {
      setUploadError('Document title is required.');
      return;
    }
    if (!newSummary.trim()) {
      setUploadError('Document description / summary is required.');
      return;
    }

    // Verify administrator authentication before starting write
    if (!user) {
      setUploadError(
        'Authentication Required: Please sign in with your Google administrator account (vivekbhagar@gmail.com) before publishing.'
      );
      return;
    }

    if (!newProduct || !newProduct.trim()) {
      setUploadError('Please select an applicable product track.');
      return;
    }

    if (!newStage || !isValidProductStage(newProduct, newStage)) {
      setUploadError(`Please select a valid Call Stage for ${newProduct}.`);
      return;
    }

    if (!isAdmin) {
      setUploadError(
        'Permission Denied: Only verified platform administrators (vivekbhagar@gmail.com) can publish or modify Knowledge Base documents. Counsellor accounts have read-only access to approved policies.'
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({
      stage: 'preparing',
      message: 'Preparing document payload & validating clauses...',
      percent: 15,
    });

    // Generate a deterministic, stable document ID based on title and version.
    // This ensures retrying after a timeout or failure is 100% idempotent and cannot produce duplicate records!
    const docId = generateStableKnowledgeDocId(newTitle.trim(), newVersion.trim() || 'v1.0');

    const createdDoc: KnowledgeDoc = {
      id: docId,
      title: newTitle.trim(),
      category: newCategory,
      product: newProduct,
      stage: newStage,
      version: newVersion.trim() || 'v1.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      fileSize: extractionResult?.fileSizeFormatted || '1.2 MB',
      fileType: newFileType,
      status: 'Active',
      clausesCount: extractionResult?.clausesCount || 15,
      clauses: extractionResult?.clauses || [],
      summary: newSummary.trim(),
      prohibitedClaims: extractionResult?.prohibitedClaims || [
        'Adhere strictly to verified institutional placements.',
        'No unsubstantiated promises or verbal fee waivers.'
      ],
      approvedPitchNotes: extractionResult?.approvedPitchNotes || [
        'Reference verified syllabus and mentoring modules.',
        'Follow standard pricing matrix and transparent loan disclosures.'
      ],
      fullContentSnippet: newSnippet.trim() || `${newTitle}\n\nApproved guideline uploaded for QA compliance auditing in NxtWave AI Audit engine.`
    };

    try {
      console.log(`[KnowledgeBaseView] Initiating save for document: "${createdDoc.title}" (ID: ${docId}, Stage: ${newStage})`);
      
      // Await real Firebase write with stage progress and timeout bounds
      await onAddDoc(createdDoc, selectedFile || undefined, (info) => {
        setUploadProgress(info);
      });

      // Confirmed Firebase write!
      setIsUploadModalOpen(false);
      // Reset form
      setSelectedFile(null);
      setExtractionResult(null);
      setNewTitle('');
      setNewProduct('Intensive');
      setNewStage(getDefaultStageForProduct('Intensive'));
      setNewSummary('');
      setNewSnippet('');
      setNewFileName('');
      setUploadError('');
      setSeedSuccessMsg(`Successfully saved and published "${createdDoc.title}" to the Knowledge Base.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('[KnowledgeBaseView] upload write failed:', err);
      const msg = err?.message || String(err);
      
      if (msg.toLowerCase().includes('timed out')) {
        setUploadError(`Operation Timed Out: ${msg}. Your form is preserved. Click "Publish to Knowledge Base" to retry safely.`);
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        setUploadError(`Permission Denied: Ensure your account is authenticated with authorized administrator credentials.`);
      } else {
        setUploadError(`Save Failed: ${msg}. The document was not saved. Please review and retry.`);
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleSeedOfficialPolicies = async () => {
    if (!isAdmin) {
      setGeneralError('Permission Denied: Seeding policies is strictly restricted to platform administrators.');
      return;
    }
    setIsSeeding(true);
    setSeedSuccessMsg('');
    setGeneralError('');
    try {
      const count = await seedKnowledgeSourcesToFirestore();
      setSeedSuccessMsg(`Successfully seeded ${count} official NxtWave knowledge base policies to Cloud Firestore.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setGeneralError(`Failed to seed policies: ${err?.message || 'Permission denied or Firestore unavailable.'}`);
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedSuccessMsg(''), 6000);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!isAdmin) {
      setGeneralError('Permission Denied: Deleting documents is strictly restricted to platform administrators.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete "${title}" from the knowledge base?`)) {
      return;
    }
    if (onDeleteDoc) {
      try {
        await onDeleteDoc(docId);
        setActiveDocForViewing(null);
        setSeedSuccessMsg(`Document "${title}" removed.`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        setGeneralError(`Failed to delete document: ${err?.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Approved Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            The single source of truth for auditing counselling pitches, pricing, and curriculum narratives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Refresh Knowledge Documents from Cloud Firestore"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Refresh</span>
            </button>
          )}

          {isAdmin && docs.length === 0 && (
            <button
              onClick={handleSeedOfficialPolicies}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSeeding ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <BookOpen className="w-4 h-4 text-slate-500" />}
              <span>Seed NxtWave Policies</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setUploadError('');
                setUploadProgress(null);
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-100" />
              <span>Upload Document (PDF, DOCX, TXT)</span>
            </button>
          )}
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{seedSuccessMsg}</span>
          </div>
          <button onClick={() => setSeedSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {generalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{generalError}</span>
          </div>
          <button onClick={() => setGeneralError('')} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#2455E8] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Product Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search narrative clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={selectedProduct}
            onChange={(e) => {
              const prod = e.target.value;
              setSelectedProduct(prod);
              if (selectedStage !== 'All' && prod !== 'All') {
                const stages = getStagesForProduct(prod);
                if (!stages.includes(selectedStage)) {
                  setSelectedStage('All');
                }
              }
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="All">All Programs</option>
            {PRODUCTS.map((prod) => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
          </select>

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="All">All Call Stages</option>
            {(selectedProduct === 'All'
              ? Array.from(new Set(Object.values(PRODUCT_STAGE_MAP).flat()))
              : getStagesForProduct(selectedProduct)
            ).map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isActive = doc.status === 'Active';
            const isDraft = doc.status === 'Draft';

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div className="space-y-3">
                  {/* Header row: Product, Call Stage & Status */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 flex-wrap">
                      <Tag className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>{doc.product}</span>
                      {doc.stage ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {doc.stage}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          All Stages
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-slate-600">
                        {doc.version}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className={`text-[11px] font-medium ${
                        isActive ? 'text-emerald-700' : isDraft ? 'text-amber-700' : 'text-slate-400'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {doc.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {doc.summary}
                  </p>

                  {/* Metadata row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="uppercase">{doc.fileType}</span>
                      <span>·</span>
                      <span>{doc.fileSize}</span>
                    </div>
                    <span className="font-semibold text-blue-600">{doc.clausesCount} clauses</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setActiveDocForViewing(doc)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Clauses</span>
                  </button>

                  {isAdmin ? (
                    <div className="flex items-center gap-1.5">
                      {doc.status !== 'Active' ? (
                        <button
                          onClick={() => onToggleStatus(doc.id, 'Active')}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Publish as active knowledge base document"
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleStatus(doc.id, 'Archived')}
                          className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Archive document"
                        >
                          Archive
                        </button>
                      )}

                      {onDeleteDoc && (
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      Approved Policy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>

          {docs.length === 0 ? (
            <div className="space-y-3 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">
                Knowledge Base is Empty
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                No policy documents or counselling narrative scripts have been loaded into Cloud Firestore yet.
                Upload your curriculum PDFs/Word documents, or seed the official NxtWave pitch guidelines to begin auditing.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <UploadCloud className="w-4 h-4 text-blue-300" />
                  <span>Upload Document</span>
                </button>
                <button
                  onClick={handleSeedOfficialPolicies}
                  disabled={isSeeding}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer w-full sm:w-auto disabled:opacity-60"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <BookOpen className="w-4 h-4 text-slate-600" />}
                  <span>Seed Standard Policies</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-slate-800">No documents match the selected filters</h3>
              <p className="text-xs text-slate-500">
                Try adjusting your search query, product filter, or category selection.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedProduct('All');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document Inspection Modal */}
      {activeDocForViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
                  <span className="font-semibold text-blue-600">{activeDocForViewing.category}</span>
                  <span>·</span>
                  <span className="font-medium text-slate-700">{activeDocForViewing.product}</span>
                  {activeDocForViewing.stage && (
                    <>
                      <span>·</span>
                      <span className="px-1.5 py-0.5 rounded font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        {activeDocForViewing.stage}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span className="font-mono">{activeDocForViewing.version}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-600 font-semibold">{activeDocForViewing.clausesCount} Clauses</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeDocForViewing.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setActiveDocForViewing(null);
                  setIsEditingDoc(false);
                  setEditSuccessMsg('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs">
              {/* Product and Call Stage Mapping Scoping Box */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">Product &amp; Call Stage Scoping</span>
                      <span className="text-[11px] text-slate-500">Defines which calls this document evaluates during compliance audits</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingDoc) {
                          setEditProduct(activeDocForViewing.product || 'Intensive');
                          setEditStage(activeDocForViewing.stage || getDefaultStageForProduct(activeDocForViewing.product || 'Intensive'));
                        }
                        setIsEditingDoc(!isEditingDoc);
                        setEditSuccessMsg('');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingDoc ? 'Cancel Edit' : 'Edit Mapping'}</span>
                    </button>
                  )}
                </div>

                {isEditingDoc ? (
                  <div className="space-y-3 pt-1 border-t border-blue-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">Target Product</label>
                        <select
                          value={editProduct}
                          onChange={(e) => {
                            const newP = e.target.value;
                            setEditProduct(newP);
                            const stages = getStagesForProduct(newP);
                            if (!stages.includes(editStage)) {
                              setEditStage(stages[0] || 'Lead Qualification Call');
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {PRODUCTS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">Applicable Call Stage</label>
                        <select
                          value={editStage}
                          onChange={(e) => setEditStage(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {getStagesForProduct(editProduct).map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {editErrorMsg && (
                      <p className="text-xs text-rose-600 font-medium">{editErrorMsg}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsSavingEdit(true);
                          setEditSuccessMsg('');
                          setEditErrorMsg('');
                          try {
                            await updateKnowledgeDocDetails(activeDocForViewing.id, {
                              product: editProduct,
                              stage: editStage,
                            });
                            // Update active document state
                            const updated = {
                              ...activeDocForViewing,
                              product: editProduct,
                              stage: editStage,
                            };
                            setActiveDocForViewing(updated);
                            setIsEditingDoc(false);
                            setEditSuccessMsg(`Successfully updated scoping to ${editProduct} (${editStage})`);
                            if (onRefresh) onRefresh();
                          } catch (err: any) {
                            setEditErrorMsg(`Failed to update knowledge source mapping: ${err?.message}`);
                          } finally {
                            setIsSavingEdit(false);
                          }
                        }}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Scoping Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                    <p className="leading-relaxed">
                      This reference document is strictly assigned to{' '}
                      <span className="font-bold text-slate-900">{activeDocForViewing.product}</span>{' '}
                      and evaluates only calls in the{' '}
                      <span className="font-bold text-blue-700">{activeDocForViewing.stage || 'all applicable'}</span> stage.
                    </p>
                    {editSuccessMsg && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {editSuccessMsg}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Storage Binary Download if available */}
              {activeDocForViewing.storageUrl && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900">
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Uploaded file binary is stored in Firebase Cloud Storage.</span>
                  </div>
                  <a
                    href={activeDocForViewing.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                </div>
              )}

              {/* Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Executive Summary</span>
                <p className="text-xs text-slate-700 leading-relaxed">{activeDocForViewing.summary}</p>
              </div>

              {/* Prohibited & Approved Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Strictly Prohibited Claims</span>
                  </div>
                  <ul className="space-y-1.5 text-rose-800">
                    {activeDocForViewing.prohibitedClaims.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Approved Narrative Benchmarks</span>
                  </div>
                  <ul className="space-y-1.5 text-emerald-800">
                    {activeDocForViewing.approvedPitchNotes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Structured Extracted Clauses (Individual Clause List) */}
              {activeDocForViewing.clauses && activeDocForViewing.clauses.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Extracted Policy Clauses ({activeDocForViewing.clauses.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">Enforced in Speech QA</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {activeDocForViewing.clauses.map((clause, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed text-xs">
                        <div className="font-mono text-[10px] text-blue-600 font-bold mb-1">Clause {idx + 1}</div>
                        <div className="whitespace-pre-wrap">{clause}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Policy Text Excerpt */}
              {activeDocForViewing.fullContentSnippet && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>Official Document Text</span>
                    <span className="text-[11px] font-mono text-slate-400 font-normal">
                      Format: {activeDocForViewing.fileType.toUpperCase()}
                    </span>
                  </h4>
                  <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto">
                    {activeDocForViewing.fullContentSnippet}
                  </pre>
                </div>
              )}

              {/* Actions & Audit Enforcement */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Enforced in automated and manual speech QA reviews.</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Updated on {activeDocForViewing.lastUpdated}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              {onDeleteDoc ? (
                <button
                  onClick={() => handleDelete(activeDocForViewing.id, activeDocForViewing.title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Document</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setActiveDocForViewing(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Upload Knowledge Document</h2>
              </div>
              <button
                onClick={() => {
                  if (!isSubmitting) setIsUploadModalOpen(false);
                }}
                disabled={isSubmitting}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* Unauthenticated notice if not signed in */}
              {!user && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <p className="font-semibold text-xs">Google Authentication Required by Security Rules</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Cloud Firestore security rules strictly require an authenticated staff account to create policy documents.
                        Please sign in with Google to enable persistent storage.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in with Google Now</span>
                  </button>
                </div>
              )}

              {/* Stage-by-stage progress indicator */}
              {isSubmitting && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                      <span>{uploadProgress?.message || 'Processing document upload...'}</span>
                    </div>
                    <span className="font-mono text-[11px] text-blue-700 font-bold">
                      {uploadProgress?.percent || 25}%
                    </span>
                  </div>

                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress?.percent || 25}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-blue-600 font-mono">
                    <span className="uppercase tracking-wider">
                      Stage: {uploadProgress?.stage.replace(/_/g, ' ') || 'initializing'}
                    </span>
                    <span>Timeout safeguard: 12s active</span>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Upload Operation Error</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">{uploadError}</p>
                </div>
              )}

              {/* File Dropzone Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                {isExtracting ? (
                  <div className="py-4 space-y-2">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="font-semibold text-slate-800 text-xs">
                      Analyzing document text and extracting clauses...
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Parsing structure, prohibited claims, and pitch benchmarks
                    </p>
                  </div>
                ) : (
                  <>
                    <FileCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-xs">
                      {newFileName ? newFileName : 'Drag & drop PDF, DOCX or TXT file here'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Plain Text / Markdown / Word DOCX / PDF
                    </p>
                    <div className="mt-3">
                      <label className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer inline-block">
                        Browse File
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt,.md"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileSelected(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* Extraction badge summary */}
              {extractionResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Document Parsed Successfully</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-3 font-mono">
                    <span className="font-bold">{extractionResult.clausesCount} Clauses Extracted</span>
                    <span>·</span>
                    <span>{extractionResult.fileSizeFormatted}</span>
                    <span>·</span>
                    <span className="uppercase">{extractionResult.fileType}</span>
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-800 block">
                  Document Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. CCBP 4.0 Sales Pitch Guidelines Q4"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Category, Applicable Product & Call Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DocCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <option value="Narratives">Narratives</option>
                    <option value="Product Knowledge">Product Knowledge</option>
                    <option value="Pricing and Policies">Pricing and Policies</option>
                    <option value="Audit Rubrics">Audit Rubrics</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">
                    Applicable Product <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newProduct}
                    onChange={(e) => {
                      const prod = e.target.value;
                      setNewProduct(prod);
                      const validStages = getStagesForProduct(prod);
                      if (!validStages.includes(newStage)) {
                        setNewStage(validStages[0] || 'Lead Qualification Call');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    disabled={isSubmitting}
                    required
                  >
                    {PRODUCTS.map((prod) => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">
                    Call Stage <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    disabled={isSubmitting}
                    required
                  >
                    {getStagesForProduct(newProduct).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Version & File details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">Version</label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-800 block">File Type</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase text-slate-600">
                    {newFileType}
                  </div>
                </div>
              </div>

              {/* Summary Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-800 block">
                  Document Summary / Purpose <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Key objectives, audience, and scope of this guidance document..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Extracted Excerpt / Snippet */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-800 block">
                  Document Text Excerpt (for AI speech audit reference)
                </label>
                <textarea
                  rows={3}
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  placeholder="Extracted clauses or text excerpt..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExtracting || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2455E8] hover:bg-[#1d46c7] active:bg-[#183aa8] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-100" />
                      <span>{uploadProgress?.message ? 'Processing...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-blue-100" />
                      <span>{uploadError ? 'Retry Publishing' : 'Publish to Knowledge Base'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
