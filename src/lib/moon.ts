import {
  Body,
  Illumination,
  Libration,
  MoonPhase,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  NextLocalSolarEclipse,
  NextMoonQuarter,
  Observer,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  SearchLocalSolarEclipse,
  SearchMoonQuarter,
  SearchRiseSet,
} from 'astronomy-engine';
import type { Location } from '../types';

/**
 * Moon calendar math, computed fully offline with astronomy-engine (MIT).
 *
 * All functions are pure and parameterized by explicit arguments — no `new
 * Date()` inside, so unit tests are deterministic. astronomy-engine returns
 * UTC instants (Date objects); every bucketing here is by the BROWSER-LOCAL
 * calendar day (getFullYear/getMonth/getDate on that instant), so "a full
 * moon on the 3rd" means the 3rd where the user is, not the 3rd in UTC.
 */

/** A full moon closer than this is conventionally called a supermoon. */
export const SUPERMOON_MAX_KM = 360_000;

/** Search horizon for one chained rise/set step (days). */
const RISE_SET_STEP_DAYS = 2;
/** Step past a found instant so the next search cannot re-find the same event. */
const RISE_SET_STEP_MINUTES = 1;
/** Hard cap per rise/set chain — a degenerate location must never hang the page. */
const RISE_SET_MAX_STEPS = 60;
/** How far before the month an event scan may reach. */
const EVENT_SCAN_BACK_DAYS = 30;
/** Global vs local eclipse peaks can differ by this much and be the same event. */
const VISIBILITY_TOLERANCE_MINUTES = 180;

export type PhaseName =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'thirdQuarter'
  | 'waningCrescent';

const PHASE_ICONS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] as const;
const PHASE_NAMES: readonly PhaseName[] = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'thirdQuarter',
  'waningCrescent',
];

/** 0°→🌑 (new), 45°→🌒 … 180°→🌕 (full) … 315°→🌘, rounding at midpoints. */
export function phaseIcon(angle: number): string {
  return PHASE_ICONS[Math.round(((((angle % 360) + 360) % 360) / 45)) % 8]!;
}

export function phaseName(angle: number): PhaseName {
  return PHASE_NAMES[Math.round(((((angle % 360) + 360) % 360) / 45)) % 8]!;
}

export interface MoonDay {
  /** "YYYY-MM-DD" in the browser-local timezone. */
  date: string;
  /** Leading/trailing cells outside the requested month. */
  inMonth: boolean;
  /** Illuminated fraction 0..1, sampled at local noon of the cell. */
  illumination: number;
  /** Phase angle 0..360 at local noon. */
  phaseAngle: number;
  phaseIcon: string;
  phaseName: PhaseName;
  /** UTC instants bucketed to this local day. */
  moonrise: Date | null;
  moonset: Date | null;
  /** The exact full/new-moon instant lands on this local day. */
  isFullMoon: boolean;
  isNewMoon: boolean;
}

/** A MoonDay for one specific day, plus the supermoon flag for it. */
export interface TodayMoonInfo extends MoonDay {
  /** Today is a full moon within supermoon range. */
  supermoon: boolean;
}

export interface MoonEventInfo {
  /** Local calendar day "YYYY-MM-DD" the event's peak falls on. */
  date: string;
  /** Exact UTC instant of the peak. */
  timeUtc: Date;
}

export interface SupermoonInfo extends MoonEventInfo {
  /** Earth–Moon distance at the full-moon instant, km. */
  distKm: number;
}

export interface LunarEclipseEvent extends MoonEventInfo {
  kind: 'penumbral' | 'partial' | 'total';
  /** 0..1, 0 for penumbral. */
  obscuration: number;
}

export interface SolarEclipseEvent extends MoonEventInfo {
  kind: 'partial' | 'annular' | 'total';
  /** Is the Sun above the horizon here at the peak? null — no location. */
  visibleHere: boolean | null;
}

export interface MoonMonthEvents {
  fullMoons: MoonEventInfo[];
  newMoons: MoonEventInfo[];
  supermoons: SupermoonInfo[];
  lunarEclipses: LunarEclipseEvent[];
  solarEclipses: SolarEclipseEvent[];
}

// ---------- local-time helpers (never parse ISO strings — that would be UTC) ----------

function localDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Local midnight of the 1st of the (0-indexed) month. */
function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function nextMonthStart(year: number, month: number): Date {
  return new Date(year, month + 1, 1, 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** "HH:MM" in the browser-local timezone. */
export function formatMoonTime(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

// ---------- rise/set: two chained sweeps instead of ~62 independent searches ----------

/**
 * All moonrise (direction=+1) or moonset (direction=-1) instants overlapping a
 * local month. The moon's day is ≈ 24 h 50 min, so consecutive same-direction
 * events are always within the 2-day search window; a null result means a
 * polar window (no rise/set at all) and ends the chain. `SearchRiseSet` finds
 * events strictly *after* its start time, but an event exactly at the start
 * can be re-found — so the cursor always steps 1 minute past each hit.
 */
function chainRiseSet(direction: 1 | -1, from: Date, end: Date, obs: Observer): Date[] {
  const events: Date[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor < end && guard < RISE_SET_MAX_STEPS) {
    guard += 1;
    const found = SearchRiseSet(Body.Moon, obs, direction, cursor, RISE_SET_STEP_DAYS);
    if (found === null) break; // polar window — this direction has nothing more
    events.push(found.date);
    cursor = new Date(found.date.getTime() + RISE_SET_STEP_MINUTES * 60_000);
  }
  return events;
}

interface RiseSetMap {
  get(key: string): { rise: Date | null; set: Date | null } | undefined;
}

function collectRiseSet(year: number, month: number, obs: Observer): RiseSetMap {
  const map = new Map<string, { rise: Date | null; set: Date | null }>();
  const put = (kind: 'rise' | 'set', when: Date) => {
    const key = localDayKey(when);
    const cell = map.get(key) ?? { rise: null, set: null };
    cell[kind] = when;
    map.set(key, cell);
  };
  const start = addDays(monthStart(year, month), -1);
  const end = nextMonthStart(year, month);
  // Start each chain one day early so an early moonset on the 1st (paired with
  // a rise from the previous evening) is still found.
  for (const when of chainRiseSet(1, start, end, obs)) put('rise', when);
  for (const when of chainRiseSet(-1, start, end, obs)) put('set', when);
  return map;
}

// ---------- calendar grid ----------

/**
 * A 42-cell (6 weeks) Monday-start grid covering the requested month.
 * Phase/illumination are sampled at LOCAL NOON of each cell; rise/set are
 * bucketed from the chained sweeps. Without a location the rise/set fields
 * stay null — the phases themselves are geocentric, so the grid is complete.
 */
export function monthMoonCalendar(year: number, month: number, loc: Location | null): MoonDay[] {
  const obs = loc ? new Observer(loc.latitude, loc.longitude, 0) : null;
  const riseSet = obs ? collectRiseSet(year, month, obs) : new Map<string, { rise: Date | null; set: Date | null }>();

  // Full/new moon instants bucketed by their LOCAL day.
  const fullDays = new Set(bucketQuarters(year, month, 2));
  const newDays = new Set(bucketQuarters(year, month, 0));

  // The Monday on/before the 1st: getDay() Sun=0..Sat=6 → shift to Mon=0.
  const first = monthStart(year, month);
  const lead = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -lead);

  const days: MoonDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cellDate = addDays(gridStart, i);
    const inMonth = cellDate.getMonth() === month && cellDate.getFullYear() === year;
    // Local noon (12:00) — DST-safe enough for a daily sample.
    const noon = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 12);
    const angle = MoonPhase(noon);
    const illum = Illumination(Body.Moon, noon);
    const key = localDayKey(cellDate);
    const rs = riseSet.get(key);
    days.push({
      date: key,
      inMonth,
      illumination: illum.phase_fraction,
      phaseAngle: angle,
      phaseIcon: phaseIcon(angle),
      phaseName: phaseName(angle),
      moonrise: rs?.rise ?? null,
      moonset: rs?.set ?? null,
      isFullMoon: fullDays.has(key),
      isNewMoon: newDays.has(key),
    });
  }
  return days;
}

/**
 * Local days ("YYYY-MM-DD") on which the moon-quarter events with the given
 * quarter index (0=new, 2=full) occur within the month (± a day's margin).
 */
function bucketQuarters(year: number, month: number, quarter: 0 | 2): string[] {
  const out: string[] = [];
  const start = addDays(monthStart(year, month), -2);
  const end = addDays(nextMonthStart(year, month), 1);
  try {
    let q = SearchMoonQuarter(start);
    let guard = 0;
    while (q.time.date < end && guard < 10) {
      guard += 1;
      if (q.quarter === quarter && q.time.date >= start) out.push(localDayKey(q.time.date));
      q = NextMoonQuarter(q);
    }
  } catch {
    /* astronomy-engine should not throw here, but the page must survive it */
  }
  return out;
}

// ---------- single day: the "Today" card ----------

/**
 * One day's moon info, independent of the viewed month (the Today card must
 * not change when the user browses another month). Rise/set are the chained
 * sweep's first hit at/after local midnight, kept only when it buckets to
 * THIS day — the lunar day is >24 h, so a day owns at most one of each.
 */
export function moonDayFor(date: Date, loc: Location | null): TodayMoonInfo {
  const key = localDayKey(date);
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);

  let moonrise: Date | null = null;
  let moonset: Date | null = null;
  if (loc) {
    const obs = new Observer(loc.latitude, loc.longitude, 0);
    const rise = SearchRiseSet(Body.Moon, obs, 1, midnight, RISE_SET_STEP_DAYS);
    if (rise && localDayKey(rise.date) === key) moonrise = rise.date;
    const set = SearchRiseSet(Body.Moon, obs, -1, midnight, RISE_SET_STEP_DAYS);
    if (set && localDayKey(set.date) === key) moonset = set.date;
  }

  let isFullMoon = false;
  let isNewMoon = false;
  let supermoon = false;
  try {
    const q = SearchMoonQuarter(midnight);
    if (localDayKey(q.time.date) === key) {
      if (q.quarter === 2) {
        isFullMoon = true;
        supermoon = Libration(q.time).dist_km <= SUPERMOON_MAX_KM;
      } else if (q.quarter === 0) {
        isNewMoon = true;
      }
    }
  } catch {
    /* degrade quietly */
  }

  const angle = MoonPhase(noon);
  return {
    date: key,
    inMonth: true,
    illumination: Illumination(Body.Moon, noon).phase_fraction,
    phaseAngle: angle,
    phaseIcon: phaseIcon(angle),
    phaseName: phaseName(angle),
    moonrise,
    moonset,
    isFullMoon,
    isNewMoon,
    supermoon,
  };
}

// ---------- month events: full/new, supermoon, eclipses ----------

/**
 * Everything notable about the moon in the given (0-indexed) month, bucketed
 * to browser-local days. Eclipse scans start up to 30 days early so an
 * eclipse just before the month never pushes one inside it out of reach.
 */
export function monthMoonEvents(year: number, month: number, loc: Location | null): MoonMonthEvents {
  const start = addDays(monthStart(year, month), -EVENT_SCAN_BACK_DAYS);
  const end = addDays(nextMonthStart(year, month), 1);

  const fullMoons: MoonEventInfo[] = [];
  const newMoons: MoonEventInfo[] = [];
  const supermoons: SupermoonInfo[] = [];

  try {
    let q = SearchMoonQuarter(start);
    let guard = 0;
    while (q.time.date < end && guard < 16) {
      guard += 1;
      const when = q.time.date;
      if (when >= start) {
        const info: MoonEventInfo = { date: localDayKey(when), timeUtc: when };
        if (q.quarter === 2) {
          fullMoons.push(info);
          const distKm = Libration(q.time).dist_km;
          if (distKm <= SUPERMOON_MAX_KM) supermoons.push({ ...info, distKm });
        } else if (q.quarter === 0) {
          newMoons.push(info);
        }
      }
      q = NextMoonQuarter(q);
    }
  } catch {
    /* degrade quietly */
  }

  const lunarEclipses: LunarEclipseEvent[] = [];
  try {
    let e = SearchLunarEclipse(start);
    let guard = 0;
    while (e.peak.date < end && guard < 6) {
      guard += 1;
      if (e.peak.date >= start) {
        lunarEclipses.push({
          date: localDayKey(e.peak.date),
          timeUtc: e.peak.date,
          // EclipseKind's string values match our literal kinds 1:1.
          kind: e.kind as LunarEclipseEvent['kind'],
          obscuration: e.obscuration,
        });
      }
      e = NextLunarEclipse(e.peak);
    }
  } catch {
    /* degrade quietly */
  }

  const solarEclipses: SolarEclipseEvent[] = [];
  try {
    let e = SearchGlobalSolarEclipse(start);
    const peaks: { when: Date; kind: 'partial' | 'annular' | 'total' }[] = [];
    let guard = 0;
    while (e.peak.date < end && guard < 6) {
      guard += 1;
      if (e.peak.date >= start) {
        peaks.push({ when: e.peak.date, kind: e.kind as SolarEclipseEvent['kind'] });
      }
      e = NextGlobalSolarEclipse(e.peak);
    }
    if (peaks.length > 0) {
      // Local visibility: SearchLocalSolarEclipse only finds eclipses the
      // observer actually sees, but its peak (darkest for THIS observer) is a
      // different instant from the global peak (greatest eclipse) — by up to
      // a couple of hours — so match within a tolerance instead of exactly.
      let localPeaks: { time: Date; altitude: number }[] | null = null;
      if (loc) {
        localPeaks = [];
        try {
          const observer = new Observer(loc.latitude, loc.longitude, 0);
          let le = SearchLocalSolarEclipse(start, observer);
          let lguard = 0;
          while (le.peak.time.date < end && lguard < 6) {
            lguard += 1;
            if (le.peak.time.date >= start && le.peak.altitude > 0) {
              localPeaks.push({ time: le.peak.time.date, altitude: le.peak.altitude });
            }
            le = NextLocalSolarEclipse(le.peak.time, observer);
          }
        } catch {
          localPeaks = null; // visibility unknown rather than wrong
        }
      }
      for (const { when, kind } of peaks) {
        solarEclipses.push({
          date: localDayKey(when),
          timeUtc: when,
          kind,
          visibleHere: localPeaks
            ? localPeaks.some(
                (p) => Math.abs(p.time.getTime() - when.getTime()) <= VISIBILITY_TOLERANCE_MINUTES * 60_000,
              )
            : null,
        });
      }
    }
  } catch {
    /* degrade quietly */
  }

  return { fullMoons, newMoons, supermoons, lunarEclipses, solarEclipses };
}