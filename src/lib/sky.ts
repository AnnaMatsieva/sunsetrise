/**
 * "Tonight's sky" — what besides the moon is worth looking up for.
 *
 * Everything here is computed offline: planets and moon via astronomy-engine
 * (MIT), meteor showers via the static IMO calendar table
 * (constants/meteorShowers.ts). No network, no keys. All functions take `now`
 * as an explicit argument so unit tests are deterministic.
 */
import { Body, DefineStar, Equator, GeoMoon, Horizon, Illumination, Observer, SearchRiseSet } from 'astronomy-engine';
import type { Location, QualityCategory } from '../types';
import { METEOR_SHOWERS, type MeteorShower } from '../constants/meteorShowers';

// ---------- reference stars ----------

/**
 * Four bright stars as orientation aids for the sky map: unlike planets they
 * never wander, so once a viewer matches them to the sky the whole map
 * becomes readable. Coordinates are J2000 (RA in hours, Dec in degrees),
 * distances in light-years — DefineStar needs all three.
 */
const REFERENCE_STARS: ReadonlyArray<{ body: Body; name: string; raDeg: number; decDeg: number; distLy: number }> = [
  { body: Body.Star1, name: 'Vega', raDeg: 279.23, decDeg: 38.78, distLy: 25.0 },
  { body: Body.Star2, name: 'Sirius', raDeg: 101.29, decDeg: -16.72, distLy: 8.6 },
  { body: Body.Star3, name: 'Arcturus', raDeg: 213.92, decDeg: 19.18, distLy: 36.7 },
  { body: Body.Star4, name: 'Capella', raDeg: 79.17, decDeg: 46.0, distLy: 42.9 },
];
for (const s of REFERENCE_STARS) {
  DefineStar(s.body, s.raDeg / 15, s.decDeg, s.distLy);
}

// ---------- meteor showers ----------

export interface ShowerStatus {
  shower: MeteorShower;
  /** The nearest occurrence: this year's, or next year's when this one passed. */
  start: Date;
  peak: Date;
  end: Date;
  /** Current estimated meteors/h (triangle profile to the peak ZHR); 0 outside the range. */
  zhrNow: number;
  active: boolean;
  /** peak − now, whole days (negative while the rate is fading past the peak). */
  daysToPeak: number;
}

const DAY_MS = 86_400_000;

function mdy(year: number, [m, d]: [number, number]): Date {
  return new Date(year, m - 1, d);
}

/** One year's occurrence of a shower, with the new-year wrap resolved. */
function instance(shower: MeteorShower, year: number): { start: Date; peak: Date; end: Date } {
  let start = mdy(year, shower.start);
  const peak = mdy(year, shower.peak);
  let end = mdy(year, shower.end);
  if (start > peak) start = mdy(year - 1, shower.start);
  if (end < peak) end = mdy(year + 1, shower.end);
  return { start, peak, end };
}

/** Triangle activity profile: 0 at the range edges, the peak ZHR at the peak. */
function zhrAt(shower: MeteorShower, occ: { start: Date; peak: Date; end: Date }, now: Date): number {
  if (now < occ.start || now > occ.end) return 0;
  const span = now < occ.peak
    ? occ.peak.getTime() - occ.start.getTime()
    : occ.end.getTime() - occ.peak.getTime();
  const frac = span > 0 ? 1 - Math.abs(now.getTime() - occ.peak.getTime()) / span : 1;
  return Math.max(1, Math.round(shower.zhr * Math.max(0, frac)));
}

/**
 * Every major shower resolved to its nearest occurrence (an active one if we
 * are inside its range, otherwise the next upcoming peak).
 */
export function meteorShowerStatus(now: Date): ShowerStatus[] {
  return METEOR_SHOWERS.map((shower) => {
    const candidates = [
      instance(shower, now.getFullYear()),
      instance(shower, now.getFullYear() + 1),
    ];
    const occ =
      candidates.find((c) => c.start <= now && now <= c.end) ??
      candidates.find((c) => c.peak > now) ??
      candidates[candidates.length - 1]!;
    return {
      shower,
      ...occ,
      zhrNow: zhrAt(shower, occ, now),
      active: occ.start <= now && now <= occ.end,
      daysToPeak: Math.round((occ.peak.getTime() - now.getTime()) / DAY_MS),
    };
  });
}

// ---------- planets ----------

export interface PlanetView {
  body: Body;
  /** Apparent magnitude right now (lower = brighter). */
  mag: number;
  /** Altitude in degrees at tonight's 22:00 (local) — or now, if it is later. */
  altDeg: number;
  /** Azimuth in degrees at the same moment (0 = N, 90 = E). */
  azDeg: number;
  /** Next rise/set within the following 24 h, if any. */
  rise: Date | null;
  set: Date | null;
}

/**
 * The reference moment for "tonight": 22:00 local — late evenings are when
 * people actually look up — or now, if it is already later.
 */
export function eveningWhen(now: Date = new Date()): Date {
  const at22 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22);
  return now > at22 ? now : at22;
}

/**
 * Whether a planet is worth looking for tonight, from the given location.
 * Returns null when the ephemeris math fails — the card must survive it.
 */
export function planetVisibility(
  body: Body,
  loc: Location,
  now: Date = new Date(),
): PlanetView | null {
  try {
    const obs = new Observer(loc.latitude, loc.longitude, 0);
    const when = eveningWhen(now);
    const eq = Equator(body, when, obs, true, true);
    const hz = Horizon(when, obs, eq.ra, eq.dec, 'normal');
    const limit = new Date(when.getTime() + DAY_MS);
    const rise = SearchRiseSet(body, obs, 1, when, 1.5);
    const set = SearchRiseSet(body, obs, -1, when, 1.5);
    return {
      body,
      mag: Illumination(body, when).mag,
      altDeg: hz.altitude,
      azDeg: hz.azimuth,
      rise: rise && rise.date <= limit ? rise.date : null,
      set: set && set.date <= limit ? set.date : null,
    };
  } catch {
    return null;
  }
}

// ---------- sky map ----------

/** One findable object on the "where to look" horizon diagram. */
export interface SkyPoint {
  /** UI key: a planets-map name, a shower/star name or 'Moon'. */
  name: string;
  kind: 'planet' | 'moon' | 'shower' | 'star';
  /** Azimuth in degrees (0 = N, 90 = E) — for a rising-later point, the azimuth of the rise. */
  azDeg: number;
  /**
   * Altitude above the horizon in degrees. 0 with a non-null `rise` marks a
   * body below the horizon now that comes up later tonight (drawn at the rim).
   */
  altDeg: number;
  /** Apparent magnitude — planets only. */
  mag: number | null;
  /** The upcoming rise time, for a body below the horizon now; null when up. */
  rise: Date | null;
}

const SKY_MAP_BODIES: ReadonlyArray<{ body: Body; name: string; kind: SkyPoint['kind'] }> = [
  { body: Body.Saturn, name: 'Saturn', kind: 'planet' },
  { body: Body.Jupiter, name: 'Jupiter', kind: 'planet' },
  { body: Body.Moon, name: 'Moon', kind: 'moon' },
];

/**
 * What the night sky offers and where: above-horizon bodies with their azimuth
 * and altitude, bodies below the horizon now that rise within the next 24 h
 * (pinned to the rim at the azimuth of their rise), and the radiants of the
 * currently active meteor showers. One body failing to ephemerise is skipped —
 * the map shows what it can.
 */
export function skyMapPoints(loc: Location, now: Date = new Date()): SkyPoint[] {
  let obs: Observer;
  try {
    obs = new Observer(loc.latitude, loc.longitude, 0);
  } catch {
    return [];
  }
  const when = eveningWhen(now);
  const limit = new Date(when.getTime() + DAY_MS);
  const points: SkyPoint[] = [];
  for (const { body, name, kind } of SKY_MAP_BODIES) {
    try {
      const eq = Equator(body, when, obs, true, true);
      const hz = Horizon(when, obs, eq.ra, eq.dec, 'normal');
      if (hz.altitude > 0) {
        points.push({
          name,
          kind,
          azDeg: hz.azimuth,
          altDeg: hz.altitude,
          mag: kind === 'planet' ? Illumination(body, when).mag : null,
          rise: null,
        });
        continue;
      }
      // Below the horizon: worth a dim rim marker only if it rises within 24 h.
      const rise = SearchRiseSet(body, obs, +1, when, 1.5);
      if (!rise || rise.date > limit) continue;
      const riseEq = Equator(body, rise.date, obs, true, true);
      const riseHz = Horizon(rise.date, obs, riseEq.ra, riseEq.dec, 'normal');
      points.push({
        name,
        kind,
        azDeg: riseHz.azimuth,
        altDeg: 0,
        mag: kind === 'planet' ? Illumination(body, when).mag : null,
        rise: rise.date,
      });
    } catch {
      // skip this body
    }
  }
  // Active showers: the radiant is a fixed direction — where the meteors
  // appear to fly FROM. Only up-radiants are drawn (a radiant near the
  // horizon still works, meteors just streak longer).
  for (const s of meteorShowerStatus(now)) {
    if (!s.active || !s.shower.radiant) continue;
    try {
      const hz = Horizon(when, obs, s.shower.radiant.raDeg / 15, s.shower.radiant.decDeg, 'normal');
      if (hz.altitude <= 0) continue;
      points.push({
        name: s.shower.name,
        kind: 'shower',
        azDeg: hz.azimuth,
        altDeg: hz.altitude,
        mag: null,
        rise: null,
      });
    } catch {
      // skip this shower
    }
  }
  // Reference stars — the fixed landmarks that make the map usable.
  for (const s of REFERENCE_STARS) {
    try {
      const eq = Equator(s.body, when, obs, true, true);
      const hz = Horizon(when, obs, eq.ra, eq.dec, 'normal');
      if (hz.altitude <= 0) continue;
      points.push({
        name: s.name,
        kind: 'star',
        azDeg: hz.azimuth,
        altDeg: hz.altitude,
        mag: null,
        rise: null,
      });
    } catch {
      // skip this star
    }
  }
  return points;
}

// ---------- moon–planet conjunctions ----------

/** The Moon passing close to a planet on one of the next evenings. */
export interface MoonConjunction {
  /** Naive-local evening date "YYYY-MM-DD" the approach belongs to. */
  dateKey: string;
  /** UI key of the planet (a sky.planets entry). */
  planet: string;
  /** Angular separation at the evening moment, degrees (Moon center to planet). */
  sepDeg: number;
  /** Moon's azimuth/altitude at the evening moment — where to point the eyes. */
  azDeg: number;
  altDeg: number;
}

const CONJUNCTION_LIMIT_DEG = 4;
const CONJUNCTION_DAYS = 7;

/** Great-circle separation between two alt/az directions, in degrees. */
function separationDeg(
  az1: number, alt1: number,
  az2: number, alt2: number,
): number {
  const rad = Math.PI / 180;
  const c =
    Math.sin(alt1 * rad) * Math.sin(alt2 * rad) +
    Math.cos(alt1 * rad) * Math.cos(alt2 * rad) * Math.cos((az1 - az2) * rad);
  return Math.acos(Math.max(-1, Math.min(1, c))) / rad;
}

/** Topocentric alt/az of a solar-system body at a moment. */
function altAz(body: Body, obs: Observer, when: Date): { azDeg: number; altDeg: number } {
  const eq = Equator(body, when, obs, true, true);
  const hz = Horizon(when, obs, eq.ra, eq.dec, 'normal');
  return { azDeg: hz.azimuth, altDeg: hz.altitude };
}

/**
 * Evenings in the next week when the Moon passes near one of the map planets
 * — the easiest naked-eye sky event there is. Evaluated at the same evening
 * moment the map shows; both objects need to be above the horizon.
 */
export function moonConjunctions(loc: Location, now: Date = new Date()): MoonConjunction[] {
  let obs: Observer;
  try {
    obs = new Observer(loc.latitude, loc.longitude, 0);
  } catch {
    return [];
  }
  const out: MoonConjunction[] = [];
  for (let i = 0; i < CONJUNCTION_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const when = eveningWhen(day);
    try {
      const moon = altAz(Body.Moon, obs, when);
      if (moon.altDeg <= 2) continue;
      for (const { body, name } of CONJUNCTION_PLANETS) {
        const hz = altAz(body, obs, when);
        const sep = separationDeg(moon.azDeg, moon.altDeg, hz.azDeg, hz.altDeg);
        if (hz.altDeg > 2 && sep < CONJUNCTION_LIMIT_DEG) {
          out.push({
            dateKey: localDateKey(when),
            planet: name,
            sepDeg: sep,
            azDeg: moon.azDeg,
            altDeg: moon.altDeg,
          });
        }
      }
    } catch {
      // skip this evening
    }
  }
  return out;
}

/** The planets the map already tracks, with UI-name keys. */
const CONJUNCTION_PLANETS: ReadonlyArray<{ body: Body; name: string }> = [
  { body: Body.Saturn, name: 'Saturn' },
  { body: Body.Jupiter, name: 'Jupiter' },
];

/** Local Date → naive-local "YYYY-MM-DD". */
function localDateKey(d: Date): string {
  const p = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------- moon ----------

/** Moon's illuminated fraction right now (0..1) — the meteor-shower spoiler. */
export function moonIllumination(now: Date = new Date()): number {
  try {
    return Illumination(Body.Moon, now).phase_fraction;
  } catch {
    return 0;
  }
}

const KM_PER_AU = 149_597_870.7;

/** Moon center distance at a moment, km — null when ephemeris fails. */
function moonDistanceKm(when: Date): number | null {
  try {
    return GeoMoon(when).Length() * KM_PER_AU;
  } catch {
    return null;
  }
}

/** Typical perigee is ~356,500–370,000 km; below this the disc looks big. */
const GIANT_MOON_KM = 372_000;

export interface MoonriseInfo {
  /**
   * Minutes between the next two moonrises — the classic ~50, ranging
   * ~30–70 through the month. Short delay = the "fast-moon season".
   */
  delayMin: number | null;
  /** Moon distance at the next rise, km — null when unknown. */
  riseDistanceKm: number | null;
  /** True when the next rise happens near perigee — the "giant moon". */
  giant: boolean;
}

/**
 * The next moonrise and the one after it, for the moonrise-pace line: how
 * much later the Moon comes up each evening, and whether tonight's rise is
 * the big-disc kind (perigee). All null-able — the row must survive failures.
 */
export function moonriseInfo(loc: Location, now: Date = new Date()): MoonriseInfo {
  try {
    const obs = new Observer(loc.latitude, loc.longitude, 0);
    const r1 = SearchRiseSet(Body.Moon, obs, +1, now, 24 * 2);
    if (!r1) return { delayMin: null, riseDistanceKm: null, giant: false };
    const r2 = SearchRiseSet(Body.Moon, obs, +1, new Date(r1.date.getTime() + 60_000), 24 * 2);
    const dist = moonDistanceKm(r1.date);
    // Consecutive rises sit ~24 h apart; the classic "50 min later each
    // evening" is the excess over a full day (it ranges ~30–70 min).
    const delayMin = r2
      ? Math.round((r2.date.getTime() - r1.date.getTime() - 24 * 3_600_000) / 60_000)
      : null;
    return {
      delayMin,
      riseDistanceKm: dist,
      giant: dist !== null && dist < GIANT_MOON_KM,
    };
  } catch {
    return { delayMin: null, riseDistanceKm: null, giant: false };
  }
}

// ---------- stargazing ----------

export interface Stargazing {
  /** 0..100, null when the night cloud cover is unknown. */
  score: number | null;
  category: QualityCategory | null;
}

/** Score thresholds reuse the same four categories as the sunset quality. */
const STARS_THRESHOLDS: ReadonlyArray<{ min: number; category: QualityCategory }> = [
  { min: 0.75, category: 'Great' },
  { min: 0.5, category: 'Good' },
  { min: 0.25, category: 'Fair' },
  { min: 0, category: 'Poor' },
];

/**
 * How well the stars will be visible tonight: a clear dark sky scores 100,
 * clouds eat it linearly, the Moon washes out up to 60% of it, and light
 * pollution (`lightFactor`, from the Bortle estimate) scales what's left.
 * Cloud cover comes from the weather forecast; without it the score is
 * unknown (null), not zero — a missing forecast must not read as "cloudy".
 */
export function stargazingScore(
  cloudNight: number | null,
  moonIllum: number,
  lightFactor = 1,
): Stargazing {
  if (cloudNight === null) return { score: null, category: null };
  const score = Math.round((1 - cloudNight) * (1 - 0.6 * moonIllum) * lightFactor * 100);
  const category = STARS_THRESHOLDS.find((t) => score / 100 >= t.min)!.category;
  return { score, category };
}