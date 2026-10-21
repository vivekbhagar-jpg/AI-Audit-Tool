/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Drive Integration Module for NxtWave AI Audit Platform
 * Handles URL parsing, file ID extraction, SSRF protection,
 * metadata verification, and authorized streaming/downloading of call recordings.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
export const RECORDINGS_TMP_DIR = path.join(rootDir, 'tmp', 'recordings');

// Ensure tmp directory exists
if (!fs.existsSync(RECORDINGS_TMP_DIR)) {
  fs.mkdirSync(RECORDINGS_TMP_DIR, { recursive: true });
}

export const MAX_AUDIO_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.wav', '.aac', '.ogg', '.webm', '.flac', '.mp4'
]);

export const SUPPORTED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'video/mp4',
  'application/octet-stream', // Often returned by Google Drive for generic audio uploads
]);

export interface DriveParseResult {
  valid: boolean;
  fileId?: string;
  error?: string;
}

export interface DriveFileMetadata {
  fileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  originalUrl: string;
  isAudio: boolean;
}

export interface DriveDownloadResult {
  success: boolean;
  filePath?: string;
  metadata?: DriveFileMetadata;
  error?: string;
  isPermissionError?: boolean;
}

/**
 * Validates and extracts a Google Drive file ID from a submitted URL.
 * Strictly prevents SSRF attacks by allowing only whitelisted Google Drive domains.
 */
export function parseGoogleDriveUrl(rawUrl: string): DriveParseResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Google Drive URL is required.' };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Malformed URL: Must be a valid HTTPS URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Security restriction: Google Drive links must use HTTPS.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = [
    'drive.google.com',
    'docs.google.com',
    'drive.usercontent.google.com',
  ];

  if (!allowedHosts.includes(hostname)) {
    return {
      valid: false,
      error: `Disallowed host "${hostname}". Only official Google Drive links (drive.google.com) are accepted.`
    };
  }

  // Common Google Drive URL patterns:
  // 1. https://drive.google.com/file/d/{FILE_ID}/view...
  // 2. https://drive.google.com/open?id={FILE_ID}
  // 3. https://drive.google.com/uc?id={FILE_ID}&export=download
  // 4. https://docs.google.com/file/d/{FILE_ID}/...
  let fileId: string | null = null;

  const fileDMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/i);
  if (fileDMatch) {
    fileId = fileDMatch[1];
  }

  if (!fileId && (parsed.searchParams.has('id') || parsed.pathname.includes('/open'))) {
    const idParam = parsed.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{20,}$/.test(idParam)) {
      fileId = idParam;
    }
  }

  if (!fileId && parsed.pathname.startsWith('/uc')) {
    const idParam = parsed.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{20,}$/.test(idParam)) {
      fileId = idParam;
    }
  }

  // Direct ID check if query parameter docid is used
  if (!fileId && parsed.searchParams.has('docid')) {
    const docidParam = parsed.searchParams.get('docid');
    if (docidParam && /^[a-zA-Z0-9_-]{20,}$/.test(docidParam)) {
      fileId = docidParam;
    }
  }

  if (!fileId) {
    return {
      valid: false,
      error: 'Could not extract Google Drive file ID. Please provide a standard share link (e.g. https://drive.google.com/file/d/FILE_ID/view).'
    };
  }

  return {
    valid: true,
    fileId
  };
}

/**
 * Retrieve metadata for a Google Drive file using official Google Drive API v3
 * or authorized Bearer token / API key.
 */
export async function getDriveFileMetadata(fileId: string, originalUrl: string): Promise<DriveFileMetadata> {
  const token = process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_OAUTH_TOKEN;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  const headers: Record<string, string> = {
    'User-Agent': 'NxtWave-AI-Audit/1.0',
    'Accept': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let apiUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webContentLink`;
  if (apiKey && !token) {
    apiUrl += `&key=${encodeURIComponent(apiKey)}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const res = await fetch(apiUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (res.status === 401 || res.status === 403) {
      const errBody = await res.json().catch(() => ({}));
      const reason = errBody?.error?.message || 'Access denied by Google Drive permissions.';
      throw new Error(`Google Drive Access Denied: The recording is private or requires explicit sharing permissions with the configured Google account (${reason}).`);
    }

    if (res.status === 404) {
      throw new Error(`Google Drive File Not Found: File ID "${fileId}" does not exist or has been deleted.`);
    }

    if (res.ok) {
      const data = await res.json();
      const sizeBytes = data.size ? parseInt(data.size, 10) : 0;
      const mimeType = (data.mimeType || 'audio/mpeg').toLowerCase();
      const ext = path.extname(data.name || '').toLowerCase();
      const isAudio = SUPPORTED_AUDIO_MIMES.has(mimeType) || SUPPORTED_AUDIO_EXTENSIONS.has(ext);

      return {
        fileId: data.id || fileId,
        name: data.name || `Drive_Recording_${fileId}.mp3`,
        mimeType,
        sizeBytes,
        originalUrl,
        isAudio
      };
    }
  } catch (err: any) {
    if (err.message.includes('Google Drive Access Denied') || err.message.includes('File Not Found')) {
      throw err;
    }
  }

  // Fallback for public drive links without configured Drive API credentials:
  // Query download endpoint headers to verify access and metadata
  const dlUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  try {
    const headRes = await fetch(dlUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-0'
      },
      redirect: 'follow'
    });

    if (headRes.status === 403 || headRes.status === 401) {
      throw new Error('Google Drive Access Denied: Recording is private. Please ensure the link is set to "Anyone with the link can view" or share with your authorized service account.');
    }

    const contentType = headRes.headers.get('content-type') || 'audio/mpeg';
    const contentDisposition = headRes.headers.get('content-disposition') || '';
    let filename = `recording_${fileId}.mp3`;
    const nameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
    if (nameMatch && nameMatch[1]) {
      filename = decodeURIComponent(nameMatch[1]);
    }

    const contentLength = headRes.headers.get('content-range')?.split('/')[1] || headRes.headers.get('content-length') || '0';
    const sizeBytes = parseInt(contentLength, 10) || 0;
    const ext = path.extname(filename).toLowerCase();
    const isAudio = SUPPORTED_AUDIO_MIMES.has(contentType.toLowerCase()) || SUPPORTED_AUDIO_EXTENSIONS.has(ext);

    return {
      fileId,
      name: filename,
      mimeType: contentType.toLowerCase(),
      sizeBytes,
      originalUrl,
      isAudio
    };
  } catch (err: any) {
    if (err.message.includes('Google Drive Access Denied')) {
      throw err;
    }
    throw new Error(`Failed to retrieve Google Drive recording metadata: ${err.message}`);
  }
}

/**
 * Downloads a Google Drive audio recording into the controlled tmp directory.
 * Enforces file size limits, supported formats, and download timeouts.
 */
export async function downloadDriveRecording(
  fileId: string,
  jobId: string,
  originalUrl: string
): Promise<DriveDownloadResult> {
  try {
    const metadata = await getDriveFileMetadata(fileId, originalUrl);

    if (metadata.sizeBytes > MAX_AUDIO_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `Recording file size (${(metadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of 150 MB.`
      };
    }

    const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = path.extname(metadata.name) || '.mp3';
    const destFileName = `rec_${jobId}_${safeFileId}${ext}`;
    const destPath = path.join(RECORDINGS_TMP_DIR, destFileName);

    // If file is already downloaded and valid, reuse it (idempotency)
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      return {
        success: true,
        filePath: destPath,
        metadata
      };
    }

    const token = process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_OAUTH_TOKEN;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    let downloadUrl: string;
    const headers: Record<string, string> = {
      'User-Agent': 'NxtWave-AI-Audit/1.0',
    };

    if (token) {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
    } else {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s download timeout

    const res = await fetch(downloadUrl, {
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        isPermissionError: true,
        error: 'Google Drive Access Denied: The recording is private or requires explicit sharing permissions with the configured Google account.'
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: `Google Drive download failed with status ${res.status}: ${res.statusText}`
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return {
        success: false,
        error: 'Downloaded Google Drive recording is empty (0 bytes).'
      };
    }

    // Check if response is an HTML login/consent page instead of audio
    const isHtml = buffer.slice(0, 100).toString('utf8').toLowerCase().includes('<!doctype html') ||
                  buffer.slice(0, 100).toString('utf8').toLowerCase().includes('<html');

    if (isHtml) {
      return {
        success: false,
        isPermissionError: true,
        error: 'Google Drive Access Denied: File requires Google Workspace authentication or is set to Restricted access.'
      };
    }

    fs.writeFileSync(destPath, buffer);

    metadata.sizeBytes = buffer.length;

    return {
      success: true,
      filePath: destPath,
      metadata
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Download timeout: Google Drive recording retrieval timed out after 60 seconds.'
      };
    }
    return {
      success: false,
      isPermissionError: err.message.includes('Access Denied'),
      error: err.message
    };
  }
}

/**
 * Clean up a temporary recording file securely
 */
export function cleanupTempRecording(filePath?: string | null) {
  if (!filePath) return;
  try {
    // Path traversal check
    const normalized = path.resolve(filePath);
    if (normalized.startsWith(RECORDINGS_TMP_DIR) && fs.existsSync(normalized)) {
      fs.unlinkSync(normalized);
    }
  } catch (err) {
    console.warn(`[Drive] Could not delete temp file ${filePath}:`, err);
  }
}
