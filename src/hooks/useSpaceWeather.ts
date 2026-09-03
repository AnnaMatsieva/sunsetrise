import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSpaceWeather } from '../api/swpcClient';
import { isAbortError } from '../api/errors';
import {
  deserializeSpaceWeather,
  serializeSpaceWeather,
  type SpaceWeather,
} from '../lib/space';
import { STRINGS } from '../i18n/strings';

/**
 * Space weather (NOAA SWPC) for the "Tonight's sky" card. Both pages render
 * that card, so the result is cached in localStorage with a TTL: switching
 * pages doesn't refetch, and a fresh visit shows the cached state instantly.
 * `enabled = false` (no location yet) never fetches — "idle".
 */

const CACHE_KEY = 'sunsetrise-space-weather-v1';
const TTL_MS = 10 * 60_000;

export interface SpaceWeatherResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: SpaceWeather | null;
  error: string | null;
  refetch: () => void;
}

/** Reads the cache; null when missing, corrupt, stale, or unusable. */
function readCache(now: number): SpaceWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const sw = deserializeSpaceWeather(JSON.parse(raw));
    if (sw === null || now - sw.fetchedAt > TTL_MS) return null;
    return sw;
  } catch {
    return null;
  }
}

export function useSpaceWeather(enabled = true): SpaceWeatherResult {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; data: SpaceWeather | null; error: string | null }>(() => {
    const cached = readCache(Date.now());
    return cached
      ? { status: 'success', data: cached, error: null }
      : { status: 'idle', data: null, error: null };
  });
  const [nonce, setNonce] = useState(0);
  // Set once a fetch (or a fresh-cache hit) has landed; cleared by refetch()
  // so the effect fetches again even though `status` is still 'success'.
  const fresh = useRef<boolean>(Boolean(readCache(Date.now())));

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    if (fresh.current) return; // fresh cache — nothing to fetch
    const ac = new AbortController();
    setState((s) => ({ status: 'loading', data: s.data, error: null }));
    let active = true;

    (async () => {
      try {
        const sw = await fetchSpaceWeather(ac.signal);
        if (!active) return;
        try {
          localStorage.setItem(CACHE_KEY, serializeSpaceWeather(sw));
        } catch {
          // storage full/blocked — the in-memory state still works
        }
        fresh.current = true;
        setState({ status: 'success', data: sw, error: null });
      } catch (e) {
        if (isAbortError(e)) return; // a stale request being aborted is not an error
        if (!active) return;
        setState((s) => ({
          status: 'error',
          data: s.data, // stale data may stay visible
          error: e instanceof Error ? e.message : STRINGS.error.network,
        }));
      }
    })();

    return () => {
      active = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce]);

  const refetch = useCallback(() => {
    fresh.current = false;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore storage failures — refetch proceeds anyway
    }
    setNonce((n) => n + 1);
  }, []);

  return { ...state, refetch };
}