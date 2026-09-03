import { REVERSE_GEOCODING_URL } from '../constants/endpoints';

/**
 * Reverse geocoding: coordinates → a place name, so "My location" shows the
 * real city. BigDataCloud's client endpoint is free, needs no API key and is
 * built for browser use (open CORS). Never throws — on any failure we return
 * null and the caller keeps the coordinate fallback.
 */

const TIMEOUT_MS = 5000;

export interface ReverseGeocodeResult {
  name: string;
  country?: string;
  admin1?: string;
}

interface RawResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

/** In-memory cache: one API call per rounded coordinate pair per page session. */
const cache = new Map<string, ReverseGeocodeResult | null>();

/** Drops the cache (used by tests; harmless in the app). */
export function clearReverseGeocodeCache(): void {
  cache.clear();
}

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/**
 * Resolve coordinates to {name, country?, admin1?}. null when the service is
 * unreachable, the answer has no usable name, or the external `signal` fired.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  const key = cacheKey(latitude, longitude);
  if (cache.has(key)) return cache.get(key) ?? null;

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  });
  const url = `${REVERSE_GEOCODING_URL}?${params.toString()}`;

  // Hard timeout: the confirmation must not hang if the service stalls.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await res.json()) as RawResponse;
    const name = [data.city, data.locality].find((n) => typeof n === 'string' && n.trim())?.trim();
    if (!name) {
      cache.set(key, null);
      return null;
    }
    const out: ReverseGeocodeResult = { name };
    if (typeof data.countryName === 'string' && data.countryName.trim()) {
      out.country = data.countryName.trim();
    }
    if (typeof data.principalSubdivision === 'string' && data.principalSubdivision.trim()) {
      out.admin1 = data.principalSubdivision.trim();
    }
    cache.set(key, out);
    return out;
  } catch {
    return null; // network/abort/parse failure — the caller falls back to "My location"
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}