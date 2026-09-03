/**
 * Aggregation of hourly scores into a single number for an event.
 */

/**
 * Weighted average with gaps: null values are ignored, weights are
 * renormalized over the sum of weights of valid entries. All-null → null.
 */
export function weightedAverageWithNulls(
  values: ReadonlyArray<number | null>,
  weights: ReadonlyArray<number>,
): number | null {
  if (values.length === 0 || values.length !== weights.length) return null;

  let sum = 0;
  let totalWeight = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? null;
    const w = weights[i] ?? 0;
    if (v === null || Number.isNaN(v)) continue;
    sum += v * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return null;
  return sum / totalWeight;
}

/**
 * Blend of average and peak: (1-peakWeight)*avg + peakWeight*max.
 * avg=null → null. peak=null (empty array/all-null) → just return avg.
 */
export function blendWithPeak(
  avg: number | null,
  values: ReadonlyArray<number | null>,
  peakWeight = 0.2,
): number | null {
  if (avg === null) return null;
  const peak = maxIgnoringNulls(values);
  if (peak === null) return avg;
  return (1 - peakWeight) * avg + peakWeight * peak;
}

/** Maximum, ignoring null/NaN. All-null → null. */
export function maxIgnoringNulls(values: ReadonlyArray<number | null>): number | null {
  let best: number | null = null;
  for (const v of values) {
    if (v === null || Number.isNaN(v)) continue;
    if (best === null || v > best) best = v;
  }
  return best;
}