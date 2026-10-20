/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Rubric Service for NxtWave AI Audit Platform
 * Connects to local Express + SQLite API (/api/rubrics).
 */

export interface RubricWeightsConfig {
  greeting: number;
  needAnalysis: number;
  curriculum: number;
  placement: number;
  pricing: number;
  objection: number;
  urgency: number;
  softSkills: number;
}

export const DEFAULT_RUBRIC_WEIGHTS: RubricWeightsConfig = {
  greeting: 10,
  needAnalysis: 15,
  curriculum: 15,
  placement: 20,
  pricing: 15,
  objection: 10,
  urgency: 10,
  softSkills: 5,
};

/**
 * Fetch default 8-factor rubric weights via backend API
 */
export async function getRubricWeights(): Promise<{ weights: RubricWeightsConfig; fromFirestore: boolean }> {
  try {
    const res = await fetch('/api/rubrics');
    if (res.ok) {
      const data = await res.json();
      if (data.weights) {
        return { weights: data.weights as RubricWeightsConfig, fromFirestore: true };
      }
    }
  } catch (error) {
    console.warn('[RubricService] Failed to load rubric from API:', error);
  }

  return { weights: DEFAULT_RUBRIC_WEIGHTS, fromFirestore: false };
}

/**
 * Save updated rubric weights via backend API
 */
export async function saveRubricWeights(weights: RubricWeightsConfig): Promise<void> {
  const res = await fetch('/api/rubrics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weights })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update rubric weights.');
  }
}
