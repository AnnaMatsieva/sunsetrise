import type { QualityCategory } from '../types';
import { CATEGORIES } from '../constants/categories';

/**
 * Score 0..1 → category. Boundaries belong to the UPPER category
 * (consistent with SunsetWx: 0.25→Fair, 0.5→Good, 0.75→Great).
 * null → null (the event does not happen or there is no data).
 */
export function scoreToCategory(score: number | null): QualityCategory | null {
  if (score === null || Number.isNaN(score)) return null;
  for (const band of CATEGORIES) {
    if (score >= band.min && score < band.max) return band.category;
  }
  // Covers score === 1.0 exactly (the last band has max 1.0001).
  return CATEGORIES[CATEGORIES.length - 1]?.category ?? null;
}