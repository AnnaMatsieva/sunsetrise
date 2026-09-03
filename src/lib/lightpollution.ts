import { CITIES, type CityLight } from '../constants/cityLight';

/**
 * Light-pollution estimate (Bortle class) from the embedded city table — the
 * honest "no satellite data available" approximation. A city contributes
 * light proportional to its population, decaying exponentially with distance
 * over a glow radius that grows with the city size (a metro glows far wider
 * than a town). Pure functions, `cities` injectable for deterministic tests.
 */

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Population-weighted light contribution: pop/1e5 units at the center. */
function cityBase(pop: number): number {
  return pop / 1e5;
}

/** Glow radius of a city, km — scales with sqrt(population). */
function glowRadiusKm(pop: number): number {
  return 7 * Math.sqrt(cityBase(pop));
}

/**
 * Cumulative artificial-brightness flux at a point, mapped to Bortle classes.
 * Exported so the calibration is centralized (and tunable) in one place.
 */
export const FLUX_TO_BORTLE: ReadonlyArray<{ max: number; bortle: number }> = [
  { max: 0.02, bortle: 1 },
  { max: 0.05, bortle: 2 },
  { max: 0.15, bortle: 3 },
  { max: 0.5, bortle: 4 },
  { max: 1.5, bortle: 5 },
  { max: 5, bortle: 6 },
  { max: 15, bortle: 7 },
  { max: 50, bortle: 8 },
];

/**
 * Estimated Bortle class (1–9) for a location, or null when the point sits far
 * from every mapped city — treated as a dark rural sky (no penalty at all).
 */
export function bortleFor(
  lat: number,
  lon: number,
  cities: ReadonlyArray<CityLight> = CITIES,
): number | null {
  let flux = 0;
  for (const c of cities) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    flux += cityBase(c.pop) * Math.exp(-d / glowRadiusKm(c.pop));
  }
  if (flux < 0.005) return null;
  const hit = FLUX_TO_BORTLE.find((t) => flux < t.max);
  return hit ? hit.bortle : 9;
}

/**
 * How much the sky's light pollution eats the faint stars, as a multiplier for
 * the stargazing score. Dark skies (B1–2, or unknown rural) cost nothing.
 */
export function lightFactor(bortle: number | null): number {
  if (bortle === null) return 1;
  const FACTORS: Record<number, number> = {
    1: 1.0,
    2: 1.0,
    3: 0.9,
    4: 0.8,
    5: 0.7,
    6: 0.55,
    7: 0.4,
    8: 0.25,
    9: 0.08,
  };
  return FACTORS[bortle] ?? 1;
}