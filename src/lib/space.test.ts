import { describe, it, expect } from 'vitest';
import {
  parseFlares,
  parseKp,
  flareCategory,
  kpCategory,
  serializeSpaceWeather,
  deserializeSpaceWeather,
  type SpaceWeather,
} from './space';

const now = new Date(Date.UTC(2026, 8, 2, 12, 0, 0)); // Sep 2, 2026 12:00 UTC

/** The real shape of xray-flares-latest.json (verified live). */
const flaresFixture = [
  {
    time_tag: '2026-09-02T09:14:00Z',
    satellite: 18,
    current_class: 'A0.0',
    current_ratio: null,
    current_int_xrlong: 0.0036,
    begin_time: '2026-09-01T23:17:00Z',
    begin_class: 'B6.5',
    max_time: '2026-09-01T23:38:00Z',
    max_class: 'C1.9',
    max_xrlong: 1.95e-6,
    end_time: '2026-09-01T23:58:00Z',
    max_ratio_time: '2026-09-01T23:21:04Z',
    max_ratio: 0.28,
    end_class: 'C1.2',
  },
];

const kpFixture = [
  { time_tag: '2026-09-02T09:17:00', kp_index: 1, estimated_kp: 0.67, kp: '1M' },
  { time_tag: '2026-09-02T09:18:00', kp_index: 3, estimated_kp: 2.67, kp: '3M' },
];

describe('parseFlares', () => {
  it('parses the real fixture: ended flare → not ongoing, last max kept', () => {
    const f = parseFlares(flaresFixture, now);
    expect(f).not.toBeNull();
    expect(f!.ongoingClass).toBeNull(); // end_time 23:58 Sep 1 is past now
    expect(f!.lastMaxClass).toBe('C1.9');
    expect(f!.lastMaxTime).toEqual(new Date(Date.UTC(2026, 8, 1, 23, 38)));
  });

  it('an end_time in the future → the flare is ongoing', () => {
    const f = parseFlares(
      [{ ...flaresFixture[0]!, end_time: '2026-09-02T15:00:00Z', current_class: 'M3.1' }],
      now,
    );
    expect(f!.ongoingClass).toBe('M3.1');
  });

  it('a missing end_time counts as ongoing', () => {
    const rec: Record<string, unknown> = { ...flaresFixture[0]! };
    delete rec.end_time;
    const f = parseFlares([rec], now);
    expect(f!.ongoingClass).toBe('A0.0');
  });

  it('garbage → null, never throws', () => {
    expect(parseFlares(null, now)).toBeNull();
    expect(parseFlares({}, now)).toBeNull();
    expect(parseFlares([{}, []], now)).toBeNull();
    expect(parseFlares(['nonsense'], now)).toBeNull();
  });
});

describe('parseKp', () => {
  it('takes the LAST record and reads the UTC time_tag (which has no Z)', () => {
    const k = parseKp(kpFixture, now);
    expect(k!.kp).toBeCloseTo(2.67);
    expect(k!.estimatedAt).toEqual(new Date(Date.UTC(2026, 8, 2, 9, 18)));
  });

  it('falls back to the integer kp_index when estimated is missing', () => {
    const k = parseKp([{ time_tag: '2026-09-02T09:18:00', kp_index: 4 }], now);
    expect(k!.kp).toBe(4);
  });

  it('garbage → null; a future-dated stamp is skipped', () => {
    expect(parseKp(null, now)).toBeNull();
    expect(parseKp([], now)).toBeNull();
    expect(parseKp([{}], now)).toBeNull();
    expect(parseKp([{ time_tag: '2026-09-02T09:18:00', kp_index: 99 }], now)).toBeNull();
    const k = parseKp([{ time_tag: '2027-09-02T09:18:00', kp_index: 2 }], now);
    expect(k).toBeNull();
  });
});

describe('categories', () => {
  it('flare letter buckets', () => {
    expect(flareCategory('A1.0')).toBe('quiet');
    expect(flareCategory('B6.5')).toBe('quiet');
    expect(flareCategory('C1.9')).toBe('moderate');
    expect(flareCategory('M5.0')).toBe('strong');
    expect(flareCategory('X2.3')).toBe('extreme');
    expect(flareCategory(null)).toBe('quiet');
    expect(flareCategory('??')).toBe('quiet');
  });

  it('Kp buckets with the boundary values', () => {
    expect(kpCategory(null)).toBe('calm');
    expect(kpCategory(3)).toBe('calm');
    expect(kpCategory(4)).toBe('unsettled');
    expect(kpCategory(5)).toBe('storm');
    expect(kpCategory(9)).toBe('storm');
  });
});

describe('cache round-trip', () => {
  const sw: SpaceWeather = {
    flare: {
      ongoingClass: null,
      lastMaxClass: 'C1.9',
      lastMaxTime: new Date(Date.UTC(2026, 8, 1, 23, 38)),
    },
    kp: { kp: 2.67, estimatedAt: new Date(Date.UTC(2026, 8, 2, 9, 18)) },
    fetchedAt: 1_787_000_000_000,
  };

  it('serialize → deserialize restores the same data', () => {
    const back = deserializeSpaceWeather(JSON.parse(serializeSpaceWeather(sw)));
    expect(back).not.toBeNull();
    expect(back!.flare!.lastMaxClass).toBe('C1.9');
    expect(back!.flare!.lastMaxTime).toEqual(sw.flare!.lastMaxTime);
    expect(back!.kp!.kp).toBeCloseTo(2.67);
    expect(back!.kp!.estimatedAt).toEqual(sw.kp!.estimatedAt);
    expect(back!.fetchedAt).toBe(sw.fetchedAt);
  });

  it('null parts and garbage are tolerated', () => {
    expect(deserializeSpaceWeather({ flare: null, kp: null, fetchedAt: 5 })).toBeNull();
    expect(deserializeSpaceWeather(null)).toBeNull();
    expect(deserializeSpaceWeather('junk')).toBeNull();
    expect(deserializeSpaceWeather({ fetchedAt: 5 })).toBeNull();
  });
});