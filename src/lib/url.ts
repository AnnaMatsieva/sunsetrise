import type { Location } from '../types';

/**
 * Handling of location in query parameters for sharing a forecast.
 * Format: ?lat=..&lon=..&city=..&country=..  (city/country are optional).
 * All values are URL-encoded. Parameters without latitude/longitude are ignored.
 */

/** Extracts a location from a search string (?lat=..&lon=..&city=..). null when data is insufficient. */
export function locationFromSearchParams(search: string): Location | null {
  const params = new URLSearchParams(search);
  const latRaw = params.get('lat');
  const lonRaw = params.get('lon');
  if (latRaw === null || lonRaw === null) return null; // without coordinates it's not a location
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const city = params.get('city');
  const loc: Location = {
    name: city && city.trim() ? city.trim() : `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    latitude: lat,
    longitude: lon,
  };
  const country = params.get('country');
  if (country && country.trim()) loc.country = country.trim();
  const admin1 = params.get('admin1');
  if (admin1 && admin1.trim()) loc.admin1 = admin1.trim();
  return loc;
}

/** Builds a query parameter string for a location (with a leading "?"). */
export function buildLocationSearch(loc: Location): string {
  const params = new URLSearchParams();
  params.set('lat', String(loc.latitude));
  params.set('lon', String(loc.longitude));
  params.set('city', loc.name);
  if (loc.country !== undefined) params.set('country', loc.country);
  if (loc.admin1 !== undefined) params.set('admin1', loc.admin1);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export type PageId = 'sun' | 'moon';

/**
 * Cross-page link, document-relative (base:'./' — the app lives in a GitHub
 * Pages subdirectory, root-relative paths like "/moon.html" would break there).
 * The current location rides along in the query, so a page switch keeps it
 * even without localStorage.
 */
export function pageHref(page: PageId, loc: Location | null): string {
  return `./${page === 'moon' ? 'moon.html' : ''}${loc ? buildLocationSearch(loc) : ''}`;
}