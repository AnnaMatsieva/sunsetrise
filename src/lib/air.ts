import type { AirQualityResponse, DayAir, PollenInfo, PollenKey } from '../types';

/**
 * Air-quality shaping: European AQI bands (EEA 6-band scale), pollen level
 * thresholds, the smoke flag and the "Air & health" card snapshot.
 *
 * Time rules follow the project convention: with `timezone=auto` the response's
 * `hourly.time[]` is naive-local to the LOCATION, so "now" is derived from the
 * response's own `utc_offset_seconds` and matched by string key — never via
 * `new Date("naive-local")`.
 */

export type HzLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface AqiBand {
  /** Inclusive upper bound; the last band is open-ended. */
  max: number;
  hz: HzLevel;
}

/** EEA European AQI bands. A value ≤ max belongs to the band. */
export const EAQI_BANDS: readonly AqiBand[] = [
  { max: 20, hz: 1 },
  { max: 40, hz: 2 },
  { max: 60, hz: 3 },
  { max: 80, hz: 4 },
  { max: 100, hz: 5 },
  { max: Infinity, hz: 6 },
];

/** EEA band for an AQI value (upper bound inclusive); null → null. */
export function eaqiHzLevel(aqi: number | null | undefined): HzLevel | null {
  if (aqi === null || aqi === undefined || aqi < 0 || !Number.isFinite(aqi)) return null;
  for (const b of EAQI_BANDS) {
    if (aqi <= b.max) return b.hz;
  }
  return null;
}

/** Open-Meteo variable name for a pollen key. */
const POLLEN_VAR: Record<PollenKey, string> = {
  alder: 'alder_pollen',
  birch: 'birch_pollen',
  grass: 'grass_pollen',
  mugwort: 'mugwort_pollen',
  olive: 'olive_pollen',
  ragweed: 'ragweed_pollen',
};

/**
 * Pollen concentration thresholds in grains/m³ (approximate guidance values
 * compiled from EAACI/pollen-monitor practice; daily-mean-ish levels). Only
 * `high` is surfaced as a flag; `low` is any value below `moderate`.
 */
export const POLLEN_THRESHOLDS: Record<PollenKey, { moderate: number; high: number }> = {
  alder: { moderate: 10, high: 50 },
  birch: { moderate: 10, high: 100 },
  grass: { moderate: 10, high: 50 },
  mugwort: { moderate: 5, high: 30 },
  olive: { moderate: 5, high: 25 },
  ragweed: { moderate: 5, high: 20 },
};

const POLLEN_KEYS = Object.keys(POLLEN_THRESHOLDS) as PollenKey[];

/** Pollen level for a concentration; null value → null (no data, row hidden). */
export function pollenLevel(
  key: PollenKey,
  value: number | null | undefined,
): PollenInfo['level'] {
  if (value === null || value === undefined || value < 0 || !Number.isFinite(value)) return null;
  const th = POLLEN_THRESHOLDS[key];
  if (value >= th.high) return 'high';
  if (value >= th.moderate) return 'moderate';
  return 'low';
}

/**
 * Smoke haze flag from aerosol optical depth. AOD ≥ 0.5 is a strong aerosol
 * signal; suppressed when dust is high — then the aerosols are dust, not smoke.
 * Unknown AOD → null.
 */
export function smokeFrom(
  aod: number | null | undefined,
  dust: number | null | undefined,
): boolean | null {
  if (aod === null || aod === undefined || !Number.isFinite(aod)) return null;
  if (aod < 0.5) return false;
  return !(dust !== null && dust !== undefined && dust >= 50);
}

/** Location-local wall clock → naive-local hour key, via the response's own offset. */
function localHourKey(utcOffsetSeconds: number, now: Date): string {
  const d = new Date(now.getTime() + utcOffsetSeconds * 1000);
  const p = (x: number): string => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:00`;
}

/** Reads a lenient hourly field at an index. */
function at(
  hourly: AirQualityResponse['hourly'],
  field: string,
  idx: number,
): number | null {
  const arr = hourly[field as keyof AirQualityResponse['hourly']] as (number | null)[] | undefined;
  return idx >= 0 ? arr?.[idx] ?? null : null;
}

/**
 * Shapes the "Air & health" card snapshot: current-hour AQI/PM/dust/smoke,
 * pollen levels and the worst AQI over the forecast days.
 */
export function buildDayAir(resp: AirQualityResponse, now: Date = new Date()): DayAir {
  const { hourly, utc_offset_seconds } = resp;
  const key = localHourKey(utc_offset_seconds, now);
  const idx = hourly.time.indexOf(key);

  const aqi = at(hourly, 'european_aqi', idx);
  const pm25 = at(hourly, 'pm2_5', idx);
  const pm10 = at(hourly, 'pm10', idx);
  const dust = at(hourly, 'dust', idx);
  const smoke = smokeFrom(at(hourly, 'aerosol_optical_depth', idx), dust);

  const pollens: PollenInfo[] = [];
  for (const key2 of POLLEN_KEYS) {
    const value = at(hourly, POLLEN_VAR[key2], idx);
    if (value === null) continue;
    pollens.push({ key: key2, value, level: pollenLevel(key2, value) });
  }

  // Worst AQI of the forecast days (grouped by the naive-local date prefix).
  let peakAqi: DayAir['peakAqi'] = null;
  for (let i = 0; i < hourly.time.length; i++) {
    const v = hourly.european_aqi?.[i] ?? null;
    if (v === null) continue;
    const date = (hourly.time[i] ?? '').slice(0, 10);
    if (peakAqi === null || v > peakAqi.aqi) peakAqi = { date, aqi: v };
  }

  return {
    aqi,
    pm25,
    pm10,
    dust,
    smoke,
    pollens,
    anyPollenHigh: pollens.some((p) => p.level === 'high'),
    peakAqi,
  };
}