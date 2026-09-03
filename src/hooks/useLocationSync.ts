import { useCallback, useEffect, useState } from 'react';
import type { Location } from '../types';
import { buildLocationSearch, locationFromSearchParams } from '../lib/url';
import { useRecents } from './useRecents';

export interface LocationSync {
  location: Location | null;
  /** Sets the location; the URL and the recents list follow it. */
  setLocation: (loc: Location) => void;
  /** Recent cities (localStorage) — the shared fallback for both pages. */
  recents: Location[];
  /** Removes a city from the recents list (the × chip buttons). */
  removeRecent: (loc: Pick<Location, 'latitude' | 'longitude'>) => void;
}

/**
 * One location state for every page. Priority on init: a share link
 * (?lat..&lon..) → the most recent city from localStorage → nothing.
 * On every change the URL is rewritten in place (the current pathname stays —
 * moon.html keeps being moon.html) and the location lands in recents, so the
 * choice made on one page applies on the other too.
 */
export function useLocationSync(): LocationSync {
  const { recents, add: addRecent, remove: removeRecent } = useRecents();
  const [location, setLocation] = useState<Location | null>(
    () => locationFromSearchParams(window.location.search) ?? recents[0] ?? null,
  );

  useEffect(() => {
    if (!location) return;
    const qs = buildLocationSearch(location);
    const url = `${window.location.pathname}${qs}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url !== current) {
      window.history.replaceState(null, '', url);
    }
    addRecent(location);
  }, [location, addRecent]);

  const setLocationStable = useCallback((loc: Location) => setLocation(loc), []);

  return { location, setLocation: setLocationStable, recents, removeRecent };
}