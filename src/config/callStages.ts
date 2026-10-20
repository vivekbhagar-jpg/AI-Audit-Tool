/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Product and Call Stage Configuration for NxtWave AI Audit Platform
 */

import { KnowledgeDoc } from '../types';

export const PRODUCTS = [
  'Intensive',
  'Academy',
  'NIAT',
  'IIT KGP OCN',
  'NIAT - Academy'
] as const;

export type ProductType = typeof PRODUCTS[number];

/**
 * Exact centralized product-to-call-stage mapping:
 * - Intensive: Lead Qualification Call, Student Realisation Call/BOB Call, DM Call/VC
 * - Academy: Lead Qualification Call, Student Realisation Call/BOB Call, DM Call/VC
 * - NIAT: Invitation Calls, Interview VC, Closure VC, ER Calls, Sem Fee Calls
 * - NIAT - Academy: Lead Qualification Call, Student Realisation Call/BOB Call, DM Call/VC
 * - IIT KGP OCN: Lead Qualification Call, Student Realisation Call/BOB Call, DM Call/VC
 */
export const PRODUCT_STAGE_MAP: Record<string, readonly string[]> = {
  'Intensive': [
    'Lead Qualification Call',
    'Student Realisation Call/BOB Call',
    'DM Call/VC',
  ],
  'Academy': [
    'Lead Qualification Call',
    'Student Realisation Call/BOB Call',
    'DM Call/VC',
  ],
  'NIAT': [
    'Invitation Calls',
    'Interview VC',
    'Closure VC',
    'ER Calls',
    'Sem Fee Calls',
  ],
  'IIT KGP OCN': [
    'Lead Qualification Call',
    'Student Realisation Call/BOB Call',
    'DM Call/VC',
  ],
  'NIAT - Academy': [
    'Lead Qualification Call',
    'Student Realisation Call/BOB Call',
    'DM Call/VC',
  ],
} as const;

/**
 * Normalize legacy product names to the canonical products
 */
export function normalizeProduct(product?: string | null): string {
  if (!product) return 'Intensive';
  const trimmed = product.trim();
  if (trimmed === 'CCBP Intensive' || trimmed.toLowerCase().includes('intensive')) return 'Intensive';
  if (trimmed === 'CCBP 4.0 Academy' || (trimmed.toLowerCase().includes('academy') && !trimmed.includes('NIAT'))) return 'Academy';
  if (trimmed === 'NIAT') return 'NIAT';
  if (trimmed === 'IIT KGP OCN' || trimmed.toLowerCase().includes('kgp')) return 'IIT KGP OCN';
  if (trimmed === 'NIAT - Academy' || trimmed === 'NIAT Academy') return 'NIAT - Academy';
  return trimmed;
}

/**
 * Get all available call stages for a given product
 */
export function getStagesForProduct(product?: string | null): readonly string[] {
  const norm = normalizeProduct(product);
  return PRODUCT_STAGE_MAP[norm] || PRODUCT_STAGE_MAP['Intensive'];
}

/**
 * Get default initial call stage for a given product
 */
export function getDefaultStageForProduct(product?: string | null): string {
  const stages = getStagesForProduct(product);
  return stages[0] || 'Lead Qualification Call';
}

/**
 * Validate that a given Call Stage belongs to the specified Product
 */
export function isValidProductStage(product?: string | null, stage?: string | null): boolean {
  if (!stage || !stage.trim()) return false;
  const stages = getStagesForProduct(product);
  return stages.includes(stage.trim());
}

/**
 * Match a record product against a filter product (supporting backward compatibility)
 */
export function matchesProduct(recordProduct?: string | null, filterProduct?: string | null): boolean {
  if (!filterProduct || filterProduct === 'All' || filterProduct === 'All Programs' || filterProduct === 'All Products') {
    return true;
  }
  if (!recordProduct) return false;
  if (recordProduct === filterProduct) return true;

  if (filterProduct === 'Intensive') {
    return recordProduct === 'Intensive' || recordProduct === 'CCBP Intensive' || recordProduct.toLowerCase().includes('intensive');
  }
  if (filterProduct === 'Academy') {
    return (
      recordProduct === 'Academy' ||
      recordProduct === 'CCBP 4.0 Academy' ||
      (recordProduct.toLowerCase().includes('academy') && !recordProduct.includes('NIAT'))
    );
  }
  if (filterProduct === 'NIAT') {
    return recordProduct === 'NIAT';
  }
  if (filterProduct === 'IIT KGP OCN') {
    return recordProduct === 'IIT KGP OCN' || recordProduct.includes('IIT KGP');
  }
  if (filterProduct === 'NIAT - Academy') {
    return recordProduct === 'NIAT - Academy' || recordProduct === 'NIAT Academy';
  }
  return recordProduct === filterProduct;
}

/**
 * Match a record stage against a filter stage
 */
export function matchesStage(recordStage?: string | null, filterStage?: string | null): boolean {
  if (!filterStage || filterStage === 'All' || filterStage === 'All Stages' || filterStage === 'All Call Stages') {
    return true;
  }
  if (!recordStage) return false;
  const cleanRec = recordStage.trim().toLowerCase();
  const cleanFilter = filterStage.trim().toLowerCase();
  if (cleanRec === cleanFilter) return true;

  // Historical aliases matching to preserve historical audit accessibility
  if (cleanFilter === 'lead qualification call') {
    return cleanRec === 'lead qualification' || cleanRec.includes('qualification') || cleanRec.includes('initial lead');
  }
  if (cleanFilter === 'student realisation call/bob call') {
    return cleanRec.includes('realisation') || cleanRec.includes('bob call') || cleanRec.includes('curriculum') || cleanRec.includes('parent consultation');
  }
  if (cleanFilter === 'dm call/vc') {
    return cleanRec.includes('dm call') || cleanRec.includes('vc') || cleanRec.includes('closing') || cleanRec.includes('follow-up');
  }
  return false;
}

/**
 * Select only the relevant Knowledge Sources for a given product and call stage:
 * - Respects global reference policies (e.g. All Programs, Audit Rubrics, or unassigned stage)
 * - Restricts specific product-stage documents strictly to matching product and stage
 * - A document for Intensive / Lead Qualification Call is never used for NIAT or other stages
 */
export function filterKnowledgeSourcesForAudit(
  docs: KnowledgeDoc[],
  targetProduct: string,
  targetStage?: string | null
): KnowledgeDoc[] {
  return docs.filter((doc) => {
    // Only active documents can be used for compliance audit
    if (doc.status !== 'Active') return false;

    // Global reference documents (e.g. standard rubric or all programs policy)
    const isGlobalProduct = 
      doc.product === 'All Programs' || 
      doc.product === 'All' || 
      doc.category === 'Audit Rubrics';

    const matchesTargetProduct = isGlobalProduct || matchesProduct(doc.product, targetProduct);
    if (!matchesTargetProduct) return false;

    // Stage matching:
    // If doc has no specific stage or is global, it applies across stages of that product
    if (!doc.stage || doc.stage === 'All Stages' || doc.stage === 'All' || !doc.stage.trim()) {
      return true;
    }

    // If audit has no stage specified, include the doc
    if (!targetStage || !targetStage.trim()) {
      return true;
    }

    // Specific stage must match
    return doc.stage.trim().toLowerCase() === targetStage.trim().toLowerCase();
  });
}
