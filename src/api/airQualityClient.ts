import { AIR_QUALITY_URL, AQ_HOURLY_VARS, AQ_FORECAST_DAYS } from '../constants/endpoints';
import { AirQualityError, isAbortError } from './errors';
import type { AirQualityResponse } from '../types';

/**
 * Open-Meteo Air Quality API client (CAMS data — no key, open CORS), the
 * health counterpart of the forecast. Like the SWPC client this is a bonus
 * source: it validates leniently and must never take the main page down —
 * the UI hides the card on failure.
 *
 * Pollen is Europe-only model data. With the default `domains=auto` the API
 * answers 200 everywhere and simply returns null grains outside Europe, so
 * no special gating is needed (verified 2026-09); explicit `domains=cams_europe`
 * WOULD 400 for non-European coordinates and is therefore never sent.
 */

const TIMEOUT_MS = 8000;

function isArrayOfNumOrNull(v: unknown): v is (number | null)[] {
  return Array.isArray(v) && v.every((x) => x === null || typeof x === 'number');
}

/** Light validation: only `time` is strict, every other field degrades to absent. */
export function validateAirQuality(data: unknown): AirQualityResponse {
  if (!data || typeof data !== 'object') {
    throw new AirQualityError('The air quality service returned a malformed response.');
  }
  const d = data as Record<string, unknown>;
  const hourly = d['hourly'] as Record<string, unknown> | undefined;
  if (!hourly || !Array.isArray(hourly['time']) || (hourly['time'] as unknown[]).length === 0) {
    throw new AirQualityError('The response is missing the hourly time array.');
  }
  const time = hourly['time'] as string[];
  const fields: Record<string, (number | null)[]> = {};
  for (const f of AQ_HOURLY_VARS) {
    const v = hourly[f];
    if (isArrayOfNumOrNull(v) && v.length === time.length) fields[f] = v;
  }
  return {
    latitude: typeof d['latitude'] === 'number' ? d['latitude'] : 0,
    longitude: typeof d['longitude'] === 'number' ? d['longitude'] : 0,
    timezone: typeof d['timezone'] === 'string' ? d['timezone'] : 'GMT',
    utc_offset_seconds: typeof d['utc_offset_seconds'] === 'number' ? d['utc_offset_seconds'] : 0,
    hourly: { time, ...fields },
  };
}

/** Fetches the air-quality forecast for AQ_FORECAST_DAYS days. Throws AirQualityError. */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<AirQualityResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: AQ_HOURLY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(AQ_FORECAST_DAYS),
  });
  const url = `${AIR_QUALITY_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new AirQualityError(`The air quality service returned error ${res.status}.`, res.status);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new AirQualityError('Could not parse the air quality service response.');
    }
    return validateAirQuality(data);
  } catch (e) {
    if (isAbortError(e)) {
      // Only the caller's abort propagates — our own timeout must read as a
      // plain failure, or the hook would treat a timeout as a stale request.
      if (signal?.aborted) throw e;
      throw new AirQualityError('The air quality request timed out');
    }
    if (e instanceof AirQualityError) throw e;
    throw new AirQualityError();
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}