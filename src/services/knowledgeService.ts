/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Knowledge Base Service for NxtWave AI Audit Platform
 * Connects to local Express + SQLite API (/api/knowledge) with resilient local caching.
 */

import { KnowledgeDoc, DocStatus, DocCategory } from '../types';
import { 
  isValidProductStage, 
  getStagesForProduct, 
  filterKnowledgeSourcesForAudit 
} from '../config/callStages';
import { apiFetch } from '../lib/api';

const LOCAL_CACHE_KEY = 'nxtwave_persisted_knowledge_sources_v1';

export type UploadStage = 
  | 'idle'
  | 'preparing'
  | 'authenticating'
  | 'uploading_file'
  | 'saving_firestore'
  | 'verifying'
  | 'complete'
  | 'error';

export interface UploadProgressInfo {
  stage: UploadStage;
  message: string;
  percent: number;
}

export interface CreateKnowledgeSourceOptions {
  rawFile?: File;
  onProgress?: (info: UploadProgressInfo) => void;
  timeoutMs?: number;
}

export interface GetKnowledgeSourcesOptions {
  fallbackToDemo?: boolean;
}

export function generateStableKnowledgeDocId(title: string, version: string = 'v1.0'): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const cleanVersion = version
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  const baseId = `kb-${cleanTitle || 'doc'}-${cleanVersion || 'v1'}`;
  return baseId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
}

// Local cache utilities
function getLocalCache(): KnowledgeDoc[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[KnowledgeService] Cache read note:', err);
  }
  return [];
}

function setLocalCache(docs: KnowledgeDoc[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(docs));
    }
  } catch (err) {
    console.warn('[KnowledgeService] Cache write note:', err);
  }
}

/**
 * Fetch all approved knowledge base documents from local backend API (/api/knowledge)
 */
export async function getKnowledgeSources(
  _options: GetKnowledgeSourcesOptions = {}
): Promise<{ docs: KnowledgeDoc[]; fromFirestore: boolean }> {
  const localCached = getLocalCache();

  try {
    const res = await apiFetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.docs)) {
        setLocalCache(data.docs);
        return { docs: data.docs, fromFirestore: true };
      }
    }
  } catch (err: any) {
    console.warn('[KnowledgeService] API fetch note, using local cache:', err.message);
  }

  return { docs: localCached, fromFirestore: false };
}

/**
 * Create or save a new knowledge source via backend API
 */
export async function createKnowledgeSource(
  newDoc: KnowledgeDoc,
  optionsOrRawFile?: CreateKnowledgeSourceOptions | File
): Promise<void> {
  const options: CreateKnowledgeSourceOptions = 
    optionsOrRawFile instanceof File 
      ? { rawFile: optionsOrRawFile } 
      : (optionsOrRawFile || {});

  const { onProgress } = options;

  onProgress?.({
    stage: 'preparing',
    message: 'Validating product track & stage configuration...',
    percent: 25,
  });

  // Validate product and stage combination
  if (newDoc.product && newDoc.product !== 'All Programs' && newDoc.product !== 'All') {
    if (newDoc.stage && !isValidProductStage(newDoc.product, newDoc.stage)) {
      const allowed = getStagesForProduct(newDoc.product);
      throw new Error(`Invalid Call Stage "${newDoc.stage}" for product "${newDoc.product}". Valid stages are: ${allowed.join(', ')}`);
    }
  }

  onProgress?.({
    stage: 'saving_firestore',
    message: 'Persisting knowledge document in database...',
    percent: 65,
  });

  const res = await apiFetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newDoc)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save knowledge document to database.');
  }

  // Update local cache
  const cached = getLocalCache();
  setLocalCache([newDoc, ...cached.filter(d => d.id !== newDoc.id)]);

  onProgress?.({
    stage: 'complete',
    message: 'Document saved and indexed successfully.',
    percent: 100,
  });
}

/**
 * Update metadata, product, and call stage of an existing knowledge document
 */
export async function updateKnowledgeDocDetails(
  docId: string, 
  updates: {
    title?: string;
    category?: DocCategory;
    product?: string;
    stage?: string;
    version?: string;
    summary?: string;
    status?: DocStatus;
  }
): Promise<void> {
  // Validate product and stage combination if provided
  if (updates.stage && updates.product && updates.product !== 'All Programs' && updates.product !== 'All') {
    if (!isValidProductStage(updates.product, updates.stage)) {
      const allowed = getStagesForProduct(updates.product);
      throw new Error(`Invalid Call Stage "${updates.stage}" for product "${updates.product}". Allowed stages are: ${allowed.join(', ')}`);
    }
  }

  const res = await apiFetch(`/api/knowledge/${docId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update document scoping.');
  }

  // Update local cache
  const current = getLocalCache();
  const updated = current.map(d => d.id === docId ? { ...d, ...updates } : d);
  setLocalCache(updated);
}

/**
 * Update the status of a knowledge document (e.g. Active <-> Archived)
 */
export async function updateKnowledgeSourceStatus(
  docId: string, 
  status: DocStatus
): Promise<void> {
  return updateKnowledgeDocDetails(docId, { status });
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledgeSource(docId: string): Promise<void> {
  const res = await apiFetch(`/api/knowledge/${docId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete knowledge document.');
  }

  const current = getLocalCache();
  setLocalCache(current.filter(d => d.id !== docId));
}

/**
 * Sync official NxtWave knowledge base documents from backend SQLite
 */
export async function seedKnowledgeSourcesToFirestore(): Promise<number> {
  try {
    const res = await apiFetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.docs)) {
        setLocalCache(data.docs);
        return data.docs.length;
      }
    }
  } catch (err) {
    console.warn('[KnowledgeService] Sync note:', err);
  }
  return 0;
}

/**
 * Retrieve active knowledge sources scoped to a specific product and call stage
 */
export async function getActiveKnowledgeSourcesForAudit(
  product: string,
  stage?: string | null
): Promise<KnowledgeDoc[]> {
  const result = await getKnowledgeSources({ fallbackToDemo: false });
  return filterKnowledgeSourcesForAudit(result.docs, product, stage);
}
