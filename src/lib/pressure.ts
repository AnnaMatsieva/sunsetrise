/**
 * Pressure tendency — the difference surface_pressure[i] - surface_pressure[i-lookback].
 * Returns null when there is no history (i-lookback < 0) or values are missing.
 * A rise after a front (dP > 0) is a favorable factor for a beautiful sunset.
 */
export function pressureTendency(
  pressure: (number | null)[],
  i: number,
  lookback = 3,
): number | null {
  const prevIdx = i - lookback;
  if (prevIdx < 0) return null;
  const cur = pressure[i] ?? null;
  const prev = pressure[prevIdx] ?? null;
  if (cur === null || prev === null) return null;
  return cur - prev;
}