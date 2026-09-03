import { useCallback, useEffect, useRef, useState } from 'react';
import type { DayScore, Location } from '../types';
import { fetchForecast } from '../api/forecastClient';
import { buildForecastScores } from '../lib/forecast';
import { AppError, ForecastError, NetworkError, isAbortError } from '../api/errors';
import { STRINGS, tmpl, type Dict } from '../i18n/strings';

const t = STRINGS;

export interface ForecastResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: DayScore[] | null;
  error: string | null;
  /** Force a refetch (ignores the per-coordinate cache). */
  refetch: () => void;
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Loads the forecast for a location, caching by rounded coordinates and
 * aborting a stale request (AbortController) when the location changes.
 * refetch() drops the cache entry for the current location and fetches again.
 */
interface ForecastState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: DayScore[] | null;
  error: string | null;
}

export function useForecast(location: Location | null): ForecastResult {
  const [state, setState] = useState<ForecastState>({
    status: 'idle',
    data: null,
    error: null,
  });
  const cache = useRef<Map<string, DayScore[]>>(new Map());
  const [nonce, setNonce] = useState(0);

  const lat = location?.latitude;
  const lon = location?.longitude;

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
        const resp = await fetchForecast(lat, lon, ac.signal);
        const scores = buildForecastScores(resp);
        if (!active) return;
        cache.current.set(key, scores);
        setState({ status: 'success', data: scores, error: null });
      } catch (e) {
        if (isAbortError(e)) return; // a stale request being aborted is not an error
        if (!active) return;
        setState({ status: 'error', data: null, error: forecastErrorFor(e, t) });
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

/** Error message for a forecast failure, by error class (we don't use codes —
 *  the hook layer has access to the dictionary; the api client throws AppError with a fallback text). */
function forecastErrorFor(e: unknown, t: Dict): string {
  if (e instanceof NetworkError) return t.error.network;
  if (e instanceof ForecastError) {
    return e.status !== undefined ? tmpl(t.error.forecastHttp, { status: e.status }) : t.error.forecastGeneric;
  }
  if (e instanceof AppError) return e.message || t.error.forecastFail;
  return t.error.forecastFail;
}