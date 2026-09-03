/**
 * UV index → health danger. Bands follow the WHO Global Solar UV Index
 * guidance; the sunburn estimate is the classic MED (Minimal Erythema Dose)
 * rule of thumb — an approximation, not a medical statement.
 */

/** There is no general clamp in smooth.ts — this module only needs this one. */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export type UvCategory = 'low' | 'moderate' | 'high' | 'very high' | 'extreme';

/** Hazard level 1..6 of the shared HzBadge scale (see tokens.css --hz-*). */
export type HzLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface UvBand {
  /** Inclusive upper bound of the band; the last band is open-ended. */
  max: number;
  category: UvCategory;
  hz: HzLevel;
}

/** WHO UV Index bands. A value ≤ max belongs to the band. */
export const UV_BANDS: readonly UvBand[] = [
  { max: 2, category: 'low', hz: 1 },
  { max: 5, category: 'moderate', hz: 2 },
  { max: 7, category: 'high', hz: 4 },
  { max: 10, category: 'very high', hz: 5 },
  { max: Infinity, category: 'extreme', hz: 6 },
];

/** UV band for a value; null (or negative) input → null. */
export function uvCategory(uv: number | null | undefined): UvCategory | null {
  if (uv === null || uv === undefined || uv < 0 || !Number.isFinite(uv)) return null;
  for (const b of UV_BANDS) {
    if (uv <= b.max) return b.category;
  }
  return null; // unreachable — the last band is open-ended
}

/** Hazard badge level for a UV value (null → null). */
export function uvHzLevel(uv: number | null | undefined): HzLevel | null {
  if (uv === null || uv === undefined || uv < 0 || !Number.isFinite(uv)) return null;
  for (const b of UV_BANDS) {
    if (uv <= b.max) return b.hz;
  }
  return null;
}

/**
 * Skin phototype (Fitzpatrick scale), I (always burns) … VI (never burns).
 * Only type II ("fair skin") is shown in the UI.
 */
export type SkinType = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * MED relative to type II, used as the multiplier k. Typical MED values in
 * J/m² (250–300 nm weighted): I 200, II 300, III 450, IV 600, V 900, VI 1200.
 */
const SKIN_MED_FACTOR: Record<SkinType, number> = {
  1: 200 / 300,
  2: 1,
  3: 450 / 300,
  4: 600 / 300,
  5: 900 / 300,
  6: 1200 / 300,
};

/**
 * Minutes of exposure until the first redness for the given UV index and skin
 * type, using minutes ≈ k · 200 / (3 · UV) (≈ 11 min for fair skin at UV 6).
 * Returns null below UV 3 — under "moderate" the estimate is not meaningful —
 * and for zero/invalid UV.
 */
export function sunburnMinutes(
  uv: number | null | undefined,
  skinType: SkinType = 2,
): number | null {
  if (uv === null || uv === undefined || !Number.isFinite(uv) || uv < 3) return null;
  const raw = (SKIN_MED_FACTOR[skinType] * 200) / (3 * uv);
  const minutes = Math.round(raw / 5) * 5;
  return clamp(minutes, 5, 600);
}

/** The part of the day when the sun is dangerous (UV ≥ 3), "HH:00" → "HH:00". */
export interface UvWindow {
  from: string;
  to: string;
}

/**
 * Time window when UV reaches the "moderate" band (≥ 3) on a given day —
 * "the sun is dangerous from {from} until {to}". Naive-local hour strings
 * only (the project rule); null when the day never reaches UV 3 or the data
 * doesn't cover the day.
 */
export function sunDangerWindow(
  time: readonly string[],
  uv: readonly (number | null)[] | undefined,
  dayKey: string,
): UvWindow | null {
  if (!uv) return null;
  let first = -1;
  let last = -1;
  for (let i = 0; i < time.length; i++) {
    if ((time[i] ?? '').slice(0, 10) !== dayKey) continue;
    const v = uv[i] ?? null;
    if (v !== null && v >= 3) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return null;
  const from = (time[first] ?? '').slice(11, 16);
  const to = (time[last] ?? '').slice(11, 16);
  if (!from || !to) return null;
  return { from, to };
}