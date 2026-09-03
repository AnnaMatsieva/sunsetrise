import type { QualityCategory } from '../types';

/**
 * Category colors — the single source of truth for badges, charts and the legend.
 * Light and dark themes. Values are duplicated in styles/tokens.css
 * (CSS custom properties) — keep them in sync.
 *
 * The palette is "quiet chrome": saturated color only for meaning (quality).
 * Strips/badges take fg/bg/border, chart bars take bar. Great gets
 * a glow (the second "sky moment" after the hero).
 */
export interface CategoryColor {
  fg: string; // text
  bg: string; // pill/bar background
  border: string; // border
  glow: string; // box-shadow for "Great" and the best day
  bar: string; // chart bar color (saturated)
}

export const CATEGORY_COLORS: Record<QualityCategory, CategoryColor> = {
  Poor: {
    fg: '#5c6a7d',
    bg: 'rgba(120, 135, 160, 0.13)',
    border: 'rgba(120, 135, 160, 0.26)',
    glow: 'transparent',
    bar: '#73809a',
  },
  Fair: {
    fg: '#8c6a26',
    bg: 'rgba(210, 165, 80, 0.16)',
    border: 'rgba(199, 150, 60, 0.34)',
    glow: 'transparent',
    bar: '#c19040',
  },
  Good: {
    fg: '#923914',
    bg: 'rgba(224, 130, 52, 0.16)',
    border: 'rgba(214, 110, 40, 0.36)',
    glow: 'transparent',
    bar: '#dc6b2e',
  },
  Great: {
    fg: '#b03a5e',
    bg: 'rgba(214, 88, 122, 0.14)',
    border: 'rgba(214, 88, 122, 0.38)',
    glow: '0 0 0 1px rgba(214, 88, 122, 0.35), 0 0 20px 3px rgba(214, 88, 122, 0.22)',
    bar: '#d6587a',
  },
};

export const CATEGORY_COLORS_DARK: Record<QualityCategory, CategoryColor> = {
  Poor: {
    fg: '#9aa6b8',
    bg: 'rgba(120, 135, 160, 0.15)',
    border: 'rgba(120, 135, 160, 0.30)',
    glow: 'transparent',
    bar: '#7e8ca3',
  },
  Fair: {
    fg: '#d9b06a',
    bg: 'rgba(210, 165, 80, 0.14)',
    border: 'rgba(210, 165, 80, 0.34)',
    glow: 'transparent',
    // Slightly deeper/more saturated than the light counterpart: in the dark theme
    // amber and orange must stay distinguishable (CVD ΔE). See notes in HourlyChart.
    bar: '#c79a4e',
  },
  Good: {
    fg: '#f0a35a',
    bg: 'rgba(224, 130, 52, 0.16)',
    border: 'rgba(224, 130, 52, 0.38)',
    glow: 'transparent',
    bar: '#e0682a',
  },
  Great: {
    fg: '#f47fa0',
    bg: 'rgba(214, 88, 122, 0.16)',
    border: 'rgba(240, 106, 140, 0.42)',
    glow: '0 0 0 1px rgba(240, 106, 140, 0.42), 0 0 22px 3px rgba(240, 106, 140, 0.30)',
    bar: '#f06a8c',
  },
};

/** The current palette for the active theme. */
export function colorsFor(category: QualityCategory, dark: boolean): CategoryColor {
  return (dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS)[category];
}