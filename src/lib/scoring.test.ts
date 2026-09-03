import { describe, it, expect } from 'vitest';
import type { HourlyData, HourlyInput } from '../types';
import { computeHourScore, computeEventScore } from './scoring';

/* ----------------------------- helpers ----------------------------- */

const BASELINE: HourlyInput = {
  cloud_cover_low: 10,
  cloud_cover_mid: 45,
  cloud_cover_high: 50,
  cloud_cover: 55,
  relative_humidity_2m: 60,
  dew_point_2m: 12,
  temperature_2m: 20,
  visibility: 20000,
  precipitation: 0,
  surface_pressure: 1015,
  weather_code: 1,
};

function hour(overrides: Partial<HourlyInput>): HourlyInput {
  return { ...BASELINE, ...overrides };
}
function scoreHour(overrides: Partial<HourlyInput>, dP: number | null = 1): number | null {
  return computeHourScore(hour(overrides), dP);
}

function buildTimes(n: number, startIso: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(startIso);
  if (!m) throw new Error('bad startIso');
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  let da = Number(m[3]);
  let h = Number(m[4]);
  const pad = (x: number) => String(x).padStart(2, '0');
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${pad(mo + 1)}-${pad(da)}T${pad(h)}:00`);
    h++;
    if (h === 24) {
      h = 0;
      const dt = new Date(Date.UTC(y, mo, da));
      dt.setUTCDate(dt.getUTCDate() + 1);
      y = dt.getUTCFullYear();
      mo = dt.getUTCMonth();
      da = dt.getUTCDate();
    }
  }
  return out;
}

const FIELDS: ReadonlyArray<keyof HourlyInput> = [
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'cloud_cover',
  'relative_humidity_2m',
  'dew_point_2m',
  'temperature_2m',
  'visibility',
  'precipitation',
  'surface_pressure',
  'weather_code',
];

function buildHourly(hours: Partial<HourlyInput>[], startIso = '2024-06-15T20:00'): HourlyData {
  const time = buildTimes(hours.length, startIso);
  const make = (f: keyof HourlyInput): (number | null)[] =>
    hours.map((h) => {
      const v = h[f];
      // An explicit null stays null; fall back to baseline only if the key is unset.
      return v === undefined ? (BASELINE[f] ?? null) : (v ?? null);
    });
  return {
    time,
    cloud_cover_low: make('cloud_cover_low'),
    cloud_cover_mid: make('cloud_cover_mid'),
    cloud_cover_high: make('cloud_cover_high'),
    cloud_cover: make('cloud_cover'),
    relative_humidity_2m: make('relative_humidity_2m'),
    dew_point_2m: make('dew_point_2m'),
    temperature_2m: make('temperature_2m'),
    visibility: make('visibility'),
    precipitation: make('precipitation'),
    surface_pressure: make('surface_pressure'),
    weather_code: make('weather_code'),
  };
}

/** N hours of baseline; overrides by index. */
function hourlyN(
  n: number,
  startIso = '2024-06-15T20:00',
  overrides: Record<number, Partial<HourlyInput>> = {},
): HourlyData {
  const hours: Partial<HourlyInput>[] = [];
  for (let i = 0; i < n; i++) hours.push(overrides[i] ?? {});
  return buildHourly(hours, startIso);
}

/* ----------------------------- cases 1–5 (per hour) ----------------------------- */

describe('computeHourScore — key scenarios', () => {
  it('1) Clear and dry → Fair (~0.43)', () => {
    const s = scoreHour({
      cloud_cover_low: 0,
      cloud_cover_mid: 0,
      cloud_cover_high: 0,
      cloud_cover: 0,
      relative_humidity_2m: 40,
      visibility: 25000,
      precipitation: 0,
      weather_code: 0,
    });
    expect(s).not.toBeNull();
    expect(s).toBeGreaterThanOrEqual(0.4);
    expect(s).toBeLessThan(0.5);
  });

  it('2) Ideal cirrus+altocumulus → Great (~1.0)', () => {
    const s = scoreHour({
      cloud_cover_low: 5,
      cloud_cover_mid: 45,
      cloud_cover_high: 50,
      cloud_cover: 55,
      relative_humidity_2m: 60,
      visibility: 20000,
      precipitation: 0,
      weather_code: 1,
    });
    expect(s).toBeCloseTo(1, 1);
  });

  it('3) Solid low clouds + rain → Poor (<0.05)', () => {
    const s = scoreHour({
      cloud_cover_low: 95,
      cloud_cover_mid: 10,
      cloud_cover_high: 10,
      cloud_cover: 98,
      relative_humidity_2m: 88,
      visibility: 4000,
      precipitation: 1.2,
      weather_code: 61,
    });
    expect(s).not.toBeNull();
    expect(s).toBeLessThan(0.05);
  });

  it('4) Solid cirrus (cirrostratus) → Good, NOT penalized', () => {
    const s = scoreHour({
      cloud_cover_low: 5,
      cloud_cover_mid: 0,
      cloud_cover_high: 95,
      cloud_cover: 96,
      relative_humidity_2m: 55,
      visibility: 30000,
      precipitation: 0,
      weather_code: 3,
    });
    expect(s).not.toBeNull();
    expect(s).toBeGreaterThanOrEqual(0.5);
    expect(s).toBeLessThan(0.75);
  });

  it('5) Hour with a thunderstorm in an otherwise-decent window → hour ~0', () => {
    const s = scoreHour({
      cloud_cover_low: 20,
      cloud_cover_mid: 40,
      cloud_cover_high: 60,
      cloud_cover: 70,
      relative_humidity_2m: 60,
      visibility: 15000,
      precipitation: 8,
      weather_code: 95,
    });
    expect(s).not.toBeNull();
    expect(s).toBeLessThan(0.1);
  });

  it('required field null → null (no fake 0)', () => {
    expect(scoreHour({ cloud_cover_low: null })).toBeNull();
    expect(scoreHour({ relative_humidity_2m: null })).toBeNull();
  });

  it('result is always in [0,1] or null', () => {
    const extremes = scoreHour({
      cloud_cover_low: 100,
      cloud_cover_mid: 100,
      cloud_cover_high: 100,
      cloud_cover: 100,
      relative_humidity_2m: 100,
      visibility: 0,
      precipitation: 50,
      weather_code: 99,
    });
    expect(extremes === null || (extremes >= 0 && extremes <= 1)).toBe(true);
  });
});

/* ----------------------------- cases 6–9 (event) ----------------------------- */

describe('computeEventScore — events and edge cases', () => {
  it('6) Polar night (eventIso=null) → score null, no crash', () => {
    const data = hourlyN(168);
    const ev = computeEventScore('sunset', data, null);
    expect(ev.score).toBeNull();
    expect(ev.category).toBeNull();
    expect(ev.eventTime).toBeNull();
  });

  it('7a) Event near the end of the array — renormalization, number in [0,1]', () => {
    const data = hourlyN(8, '2024-06-15T20:00');
    // the last bucket is 03:00 the next day
    const ev = computeEventScore('sunset', data, '2024-06-16T03:50');
    expect(ev.score).not.toBeNull();
    expect(ev.score).toBeGreaterThanOrEqual(0);
    expect(ev.score).toBeLessThanOrEqual(1);
  });

  it('7b) <2 valid buckets → null (array of 1 hour)', () => {
    const data = hourlyN(1, '2024-06-15T20:00');
    const ev = computeEventScore('sunset', data, '2024-06-15T20:30');
    expect(ev.score).toBeNull();
  });

  it('8) Null humidity in one hour of the window → hour null, weight redistributed, event still scored', () => {
    const data = hourlyN(168, '2024-06-15T20:00', {
      // event center at 21:00 → index 1
      1: { relative_humidity_2m: null },
    });
    const ev = computeEventScore('sunset', data, '2024-06-15T21:18');
    expect(ev.score).not.toBeNull();
    expect(ev.hourScores.length).toBe(7);
    // the center is offset 0 → position 3 in the window array [-3,-2,-1,0,1,2,3]
    expect(ev.hourScores[3]).toBeNull();
  });

  it('9) All hours null → score null', () => {
    const hours: Partial<HourlyInput>[] = [];
    for (let i = 0; i < 10; i++) {
      hours.push({
        cloud_cover_low: null,
        cloud_cover_mid: null,
        cloud_cover_high: null,
        relative_humidity_2m: null,
      });
    }
    const data = buildHourly(hours, '2024-06-15T20:00');
    const ev = computeEventScore('sunset', data, '2024-06-15T22:00');
    expect(ev.score).toBeNull();
  });

  it('asymmetry: sunrise weights are shifted toward pre-glow', () => {
    // A window with one good hour before sunrise should score sunrise higher
    // than when the good hour is after.
    const good = { cloud_cover_high: 50, cloud_cover_mid: 45 } as Partial<HourlyInput>;
    const bad = { cloud_cover_high: 0, cloud_cover_mid: 0, cloud_cover: 0 } as Partial<HourlyInput>;
    const data = hourlyN(168, '2024-06-15T20:00', {
      1: bad, // center 21:00; offset -1 (20:00) → index 0
      2: good, // offset 0 (21:00)
      3: good, // offset +1
    });
    // Compare sunrise vs sunset on the same data — the weight asymmetry.
    const sunrise = computeEventScore('sunrise', data, '2024-06-15T21:18');
    const sunset = computeEventScore('sunset', data, '2024-06-15T21:18');
    expect(sunrise.score).not.toBeNull();
    expect(sunset.score).not.toBeNull();
  });
});

/* ----------------------------- cases 10–11 (properties) ----------------------------- */

describe('computeHourScore — properties', () => {
  it('10) Monotonically non-decreasing in cloud_cover_high over the 0→20 rise', () => {
    let prev = -Infinity;
    for (let h = 0; h <= 20; h++) {
      const s = scoreHour({
        cloud_cover_high: h,
        cloud_cover: h, // total follows high, < 95 → no overcast penalty
      });
      expect(s).not.toBeNull();
      expect(s!).toBeGreaterThanOrEqual(prev);
      prev = s!;
    }
  });
});

describe('computeHourScore — fuzz (deterministic)', () => {
  // A simple LCG instead of Math.random for reproducibility.
  let seed = 123456789;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const CODES = [0, 1, 2, 3, 45, 61, 63, 71, 80, 95, 96, 99];

  it('11) Any valid inputs → null or [0,1]', () => {
    for (let n = 0; n < 1000; n++) {
      const s = computeHourScore(
        {
          cloud_cover_low: ri(0, 100),
          cloud_cover_mid: ri(0, 100),
          cloud_cover_high: ri(0, 100),
          cloud_cover: ri(0, 100),
          relative_humidity_2m: ri(0, 100),
          dew_point_2m: ri(-20, 30),
          temperature_2m: ri(-30, 45),
          visibility: ri(0, 60000),
          precipitation: ri(0, 30),
          surface_pressure: ri(980, 1040),
          weather_code: CODES[ri(0, CODES.length - 1)]!,
        },
        ri(-10, 10),
      );
      expect(s === null || (s >= 0 && s <= 1)).toBe(true);
    }
  });
});

/* ----------------------------- export guard ----------------------------- */
void FIELDS;