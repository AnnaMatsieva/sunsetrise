import type { QualityCategory } from '../types';

/**
 * Category bands (following SunsetWx principles), as fractions of 0..1.
 * Texts (label/short/hint) live in the i18n dictionary — only numeric bounds here.
 */
export interface CategoryBand {
  category: QualityCategory;
  min: number; // inclusive
  max: number; // exclusive
}

export const CATEGORIES: CategoryBand[] = [
  { category: 'Poor', min: 0, max: 0.25 },
  { category: 'Fair', min: 0.25, max: 0.5 },
  { category: 'Good', min: 0.5, max: 0.75 },
  { category: 'Great', min: 0.75, max: 1.0001 }, // the 1.0 upper bound is reached inclusively
];

export const CATEGORY_ORDER: QualityCategory[] = ['Poor', 'Fair', 'Good', 'Great'];