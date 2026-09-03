import { useCallback, useEffect, useRef, useState } from 'react';
import type { DayAir, Location } from '../types';
import { fetchAirQuality } from '../api/airQualityClient';
import { buildDayAir } from '../lib/air';
import { isAbortError } from '../api/errors';

export interface AirQualityResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Shaped "Air & health" snapshot — null while idle/loading or on error. */
  data: DayAir | null;
  error: string | null;
  /** Force a refetch (ignores the per-coordinate cache). */
  refetch: () => void;
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

interface AirState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: DayAir | null;
  error: string | null;
}

/**
 * Loads air quality for a location — an independent health data source, the
 * forecast's younger sibling: cached per rounded coordinates, stale requests
 * aborted on location change. Failure is deliberately quarantined here: the
 * hook's error never touches useForecast, and the card just disappears.
 */
export function useAirQuality(location: Location | null, enabled = true): AirQualityResult {
  const [state, setState] = useState<AirState>({ status: 'idle', data: null, error: null });
  const cache = useRef<Map<string, DayAir>>(new Map());
  const [nonce, setNonce] = useState(0);

  const lat = enabled ? location?.latitude : undefined;
  const lon = enabled ? location?.longitude : undefined;

  useEffect(() => {
    if (lat === undefined || lon === undefined) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    const key = `${round3(lat)},${round3(lon)}`;
    const cached = cache.current.get(key);
    if (cached) {
      setState({ status: 'success', data: cached, error: null });
      return;
    }

    const ac = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    let active = true;

    (async () => {
      try {
        const resp = await fetchAirQuality(lat, lon, ac.signal);
        const air = buildDayAir(resp);
        if (!active) return;
        cache.current.set(key, air);
        setState({ status: 'success', data: air, error: null });
      } catch (e) {
        if (isAbortError(e)) return; // a stale request being aborted is not an error
        if (!active) return;
        setState({
          status: 'error',
          data: null,
          error: e instanceof Error ? e.message : 'Could not load air quality.',
        });
      }
    })();

    return () => {
      active = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, nonce]);

  const refetch = useCallback(() => {
    if (lat === undefined || lon === undefined) return;
    cache.current.delete(`${round3(lat)},${round3(lon)}`);
    setNonce((n) => n + 1);
  }, [lat, lon]);

  return { ...state, refetch };
}