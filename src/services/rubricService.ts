import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

const RUBRICS_COLLECTION = 'audit_rubrics';
const DEFAULT_RUBRIC_ID = 'rubric-8factor-v5';

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
 * Fetch default 8-factor rubric weights from Firestore
 */
export async function getRubricWeights(): Promise<{ weights: RubricWeightsConfig; fromFirestore: boolean }> {
  if (!isFirebaseConfigured || !db) {
    return { weights: DEFAULT_RUBRIC_WEIGHTS, fromFirestore: false };
  }

  const docPath = `${RUBRICS_COLLECTION}/${DEFAULT_RUBRIC_ID}`;
  try {
    const docSnap = await getDoc(doc(db, RUBRICS_COLLECTION, DEFAULT_RUBRIC_ID));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.weights) {
        return { weights: data.weights as RubricWeightsConfig, fromFirestore: true };
      }
    }
  } catch (error) {
    console.warn('[RubricService] Failed to load rubric from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.GET, docPath, auth?.currentUser);
    } catch {
      // Error logged
    }
  }

  return { weights: DEFAULT_RUBRIC_WEIGHTS, fromFirestore: false };
}

/**
 * Save updated rubric weights to Firestore
 */
export async function saveRubricWeights(weights: RubricWeightsConfig): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    return;
  }

  const docPath = `${RUBRICS_COLLECTION}/${DEFAULT_RUBRIC_ID}`;
  try {
    await setDoc(doc(db, RUBRICS_COLLECTION, DEFAULT_RUBRIC_ID), {
      id: DEFAULT_RUBRIC_ID,
      name: 'NxtWave 8-Factor Quality QA Rubric',
      version: 'v5.1',
      isDefault: true,
      weights,
      updatedBy: auth?.currentUser?.uid || 'system',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath, auth?.currentUser);
  }
}
