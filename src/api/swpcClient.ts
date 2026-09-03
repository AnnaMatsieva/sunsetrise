import { SWPC_FLARES_URL, SWPC_KP_URL } from '../constants/endpoints';
import { SpaceWeatherError, isAbortError } from './errors';
import { parseFlares, parseKp, type SolarFlareInfo, type KpInfo, type SpaceWeather } from '../lib/space';

/**
 * NOAA Space Weather Prediction Center client — open JSON services (no key,
 * open CORS), a bonus data source: one small request each for solar flares and
 * the planetary Kp index. Partial success beats total failure: if only one
 * endpoint answers, we keep its part; both must fail for the promise to reject.
 */

const TIMEOUT_MS = 8000;

/** One GET with a hard timeout, chained onto the caller's abort signal. */
async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new SpaceWeatherError('SWPC HTTP error', res.status);
    return await res.json();
  } catch (e) {
    if (isAbortError(e)) {
      // Only the caller's abort propagates — our own timeout must read as a
      // plain failure, or the hook would treat a timeout as a stale request.
      if (signal?.aborted) throw e;
      throw new SpaceWeatherError('SWPC request timed out');
    }
    if (e instanceof SpaceWeatherError) throw e;
    throw new SpaceWeatherError('SWPC request failed');
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

/** Lenient: an unexpected shape means "no flares data", not a crash. */
export async function fetchFlares(signal?: AbortSignal): Promise<SolarFlareInfo | null> {
  return parseFlares(await fetchJson(SWPC_FLARES_URL, signal), new Date());
}

export async function fetchKp(signal?: AbortSignal): Promise<KpInfo | null> {
  return parseKp(await fetchJson(SWPC_KP_URL, signal), new Date());
}

/** Both endpoints, tolerating a partial failure — but never swallowing an abort. */
export async function fetchSpaceWeather(signal?: AbortSignal): Promise<SpaceWeather> {
  const errors: unknown[] = [];
  const settle = async (p: Promise<unknown>): Promise<unknown> => {
    try {
      return await p;
    } catch (e) {
      errors.push(e);
      return null;
    }
  };
  const [flare, kp] = await Promise.all([
    settle(fetchFlares(signal)),
    settle(fetchKp(signal)),
  ]);
  const aborted = errors.find((e) => isAbortError(e));
  if (aborted) throw aborted;
  if (flare === null && kp === null) {
    throw errors.find((e) => e instanceof SpaceWeatherError) ?? new SpaceWeatherError('Both SWPC endpoints failed.');
  }
  return {
    flare: flare as SolarFlareInfo | null,
    kp: kp as KpInfo | null,
    fetchedAt: Date.now(),
  };
}