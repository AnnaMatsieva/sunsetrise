import { useCallback, useEffect, useState } from 'react';
import type { Location } from '../types';

const KEY = 'sunsetrise-recents';
const MAX = 8;

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
/** Stable location key from rounded coordinates (dedup). */
export const locationKey = (loc: Pick<Location, 'latitude' | 'longitude'>): string =>
  `${round3(loc.latitude)},${round3(loc.longitude)}`;

function isLocation(x: unknown): x is Location {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.name === 'string' && typeof r.latitude === 'number' && typeof r.longitude === 'number';
}

function load(): Location[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLocation);
  } catch {
    return [];
  }
}

export interface RecentsApi {
  recents: Location[];
  /** Add a location to the front (dedup by coordinates, capped at MAX). */
  add: (loc: Location) => void;
  /** Remove a location from the list. */
  remove: (loc: Pick<Location, 'latitude' | 'longitude'>) => void;
  /** Clear the list. */
  clear: () => void;
}

/**
 * Recent cities in localStorage (capped at 8, dedup by coordinates).
 * Source for quick-pick chips and for restoring the location after a reload.
 */
export function useRecents(): RecentsApi {
  const [recents, setRecents] = useState<Location[]>(() => load());

  // Persist on every list change.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(recents));
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [recents]);

  const add = useCallback((loc: Location) => {
    setRecents((prev) => {
      const k = locationKey(loc);
      return [loc, ...prev.filter((r) => locationKey(r) !== k)].slice(0, MAX);
    });
  }, []);

  const remove = useCallback((loc: Pick<Location, 'latitude' | 'longitude'>) => {
    const k = locationKey(loc);
    setRecents((prev) => prev.filter((r) => locationKey(r) !== k));
  }, []);

  const clear = useCallback(() => setRecents([]), []);

  return { recents, add, remove, clear };
}