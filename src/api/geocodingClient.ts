import type { GeoResult } from '../types';
import { GEOCODING_URL } from '../constants/endpoints';
import { GeocodingError, NetworkError, isAbortError } from './errors';

const MIN_QUERY_LENGTH = 2;

interface RawGeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

/** Location search by name. An empty query (<2 chars) → []. Throws AppError. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const params = new URLSearchParams({
    name: trimmed,
    count: '10',
    language: 'en',
    format: 'json',
  });
  const url = `${GEOCODING_URL}?${params.toString()}`;

  let res: Response;
  const init: RequestInit = {};
  if (signal) init.signal = signal;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new NetworkError('Could not reach the geocoding service.');
  }

  if (!res.ok) {
    throw new GeocodingError(`The geocoding service returned error ${res.status}.`, res.status);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new GeocodingError('Could not parse the geocoding service response.');
  }

  const results = (data as { results?: RawGeoResult[] }).results;
  if (!Array.isArray(results)) return [];
  return results.map((r): GeoResult => {
    const out: GeoResult = {
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
    };
    if (r.country !== undefined) out.country = r.country;
    if (r.country_code !== undefined) out.country_code = r.country_code;
    if (r.admin1 !== undefined) out.admin1 = r.admin1;
    if (r.timezone !== undefined) out.timezone = r.timezone;
    return out;
  });
}