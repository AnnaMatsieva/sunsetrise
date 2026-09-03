import { useEffect, useState } from 'react';
import type { GeoResult } from '../types';
import { searchCities } from '../api/geocodingClient';
import { AppError, GeocodingError, NetworkError, isAbortError } from '../api/errors';
import { STRINGS, tmpl, type Dict } from '../i18n/strings';

const t = STRINGS;

export interface GeocodingResult {
  results: GeoResult[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

const DEBOUNCE_MS = 300;

/** Debounced location search by string. An empty/too-short query → idle, []. */
export function useGeocoding(query: string): GeocodingResult {
  const [state, setState] = useState<GeocodingResult>({
    results: [],
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setState({ results: [], status: 'idle', error: null });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading' }));
    const ac = new AbortController();
    const timer = setTimeout(() => {
      (async () => {
        try {
          const results = await searchCities(trimmed, ac.signal);
          setState({ results, status: 'success', error: null });
        } catch (e) {
          if (isAbortError(e)) return; // an aborted request is not an error for the user
          setState({ results: [], status: 'error', error: messageFor(e, t) });
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return state;
}

/** Maps a geocoding error to a message (we don't use codes — errors are rare,
 *  and the hook layer has access to the dictionary). */
function messageFor(e: unknown, t: Dict): string {
  if (e instanceof NetworkError) return t.error.geocodingNetwork;
  if (e instanceof GeocodingError) {
    return e.status !== undefined
      ? tmpl(t.error.geocodingHttp, { status: e.status })
      : t.error.geocodingFail;
  }
  if (e instanceof AppError) return e.message || t.error.geocodingFail;
  return t.error.geocodingFail;
}