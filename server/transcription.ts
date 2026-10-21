/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audio Transcription Service for NxtWave AI Audit Platform
 * Implements ITranscriptionProvider interface using @google/genai
 * with strict error propagation and genuine transcript generation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

export interface TranscriptTurn {
  id: string;
  speaker: 'Counsellor' | 'Student' | 'Parent' | 'Unknown';
  speakerName?: string;
  timestamp: string; // MM:SS format
  textHinglish: string;
  textEnglish: string;
  highlightType?: 'critical' | 'violation' | 'unsupported' | 'missing' | 'praise';
  highlightNote?: string;
}

export interface TranscriptionResult {
  provider: string;
  model: string;
  rawText: string;
  durationSeconds: number;
  language: string;
  turns: TranscriptTurn[];
  processingDurationMs: number;
}

export interface ITranscriptionProvider {
  name: string;
  transcribe(audioFilePath: string, mimeType: string, languageHint?: string): Promise<TranscriptionResult>;
}

/**
 * Real Gemini Audio Transcription Provider
 * Uses @google/genai with 'gemini-3.5-transcribe' or 'gemini-3.8-flash'
 */
export class GeminiTranscriptionProvider implements ITranscriptionProvider {
  public name = 'gemini-transcription';

  public async transcribe(
    audioFilePath: string,
    mimeType: string,
    languageHint: string = 'Hinglish (Hindi + English)'
  ): Promise<TranscriptionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY') {
      throw new Error(
        'Transcription provider configuration error: GEMINI_API_KEY is not configured on the server. ' +
        'Please configure GEMINI_API_KEY in your server environment.'
      );
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }

    const fileStats = fs.statSync(audioFilePath);
    if (fileStats.size === 0) {
      throw new Error('Audio recording file is empty (0 bytes).');
    }

    const startTime = Date.now();
    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString('base64');

    // Normalize audio mime type
    let validMime = mimeType;
    if (!validMime || validMime === 'application/octet-stream') {
      const ext = path.extname(audioFilePath).toLowerCase();
      if (ext === '.wav') validMime = 'audio/wav';
      else if (ext === '.m4a') validMime = 'audio/m4a';
      else if (ext === '.aac') validMime = 'audio/aac';
      else if (ext === '.ogg') validMime = 'audio/ogg';
      else if (ext === '.webm') validMime = 'audio/webm';
      else validMime = 'audio/mp3';
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const modelName = 'gemini-3.8-flash';

    const prompt = `You are an expert speech recognition and diariation system specializing in Indian educational admissions counselling calls.
Language profile: ${languageHint}. The audio often code-switches between Hindi, Telugu, Tamil, and English (Hinglish/Tanglish).

TASK:
1. Transcribe the conversation with accurate speaker turns (distinguishing 'Counsellor' from 'Student' or 'Parent').
2. Provide timestamps (format MM:SS) for each speaker turn.
3. For each turn, provide:
   - "textHinglish": Exact spoken words in original romanized script (Hinglish/spoken dialect).
   - "textEnglish": Accurate English translation.
4. Estimate total duration in seconds.

Return STRICT JSON matching this schema:
{
  "durationSeconds": number,
  "languageDetected": string,
  "turns": [
    {
      "id": string,
      "speaker": "Counsellor" | "Student" | "Parent" | "Unknown",
      "timestamp": "MM:SS",
      "textHinglish": string,
      "textEnglish": string
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType: validMime,
            data: base64Audio
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const textOutput = response.text || '';
    if (!textOutput.trim()) {
      throw new Error('Gemini audio transcription model returned an empty response.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      throw new Error(`Failed to parse Gemini transcription JSON output: ${textOutput.slice(0, 200)}...`);
    }

    if (!Array.isArray(parsed.turns) || parsed.turns.length === 0) {
      throw new Error('Transcription output contained no recognizable dialogue turns.');
    }

    const turns: TranscriptTurn[] = parsed.turns.map((t: any, idx: number) => ({
      id: t.id || `t-${idx + 1}`,
      speaker: (['Counsellor', 'Student', 'Parent'].includes(t.speaker) ? t.speaker : 'Unknown') as any,
      speakerName: t.speakerName || undefined,
      timestamp: t.timestamp || `${Math.floor((idx * 15) / 60).toString().padStart(2, '0')}:${((idx * 15) % 60).toString().padStart(2, '0')}`,
      textHinglish: t.textHinglish || t.text || '',
      textEnglish: t.textEnglish || t.translation || t.textHinglish || '',
      highlightType: undefined,
      highlightNote: undefined
    }));

    const rawText = turns.map(turn => `[${turn.timestamp}] ${turn.speaker}: ${turn.textHinglish}`).join('\n');
    const processingDurationMs = Date.now() - startTime;

    return {
      provider: this.name,
      model: modelName,
      rawText,
      durationSeconds: parsed.durationSeconds || Math.max(turns.length * 15, 60),
      language: parsed.languageDetected || languageHint,
      turns,
      processingDurationMs
    };
  }
}

let activeProvider: ITranscriptionProvider = new GeminiTranscriptionProvider();

export function getTranscriptionProvider(): ITranscriptionProvider {
  return activeProvider;
}

export function setTranscriptionProvider(provider: ITranscriptionProvider) {
  activeProvider = provider;
}
