import { describe, it, expect } from 'vitest';
import { buildComfort, comfortLevel } from './comfort';
import { makeResponse, genTimes } from '../test/fixtures';

describe('comfortLevel — apparent temperature bands', () => {
  it('band boundaries', () => {
    expect(comfortLevel(-5)).toBe('cold');
    expect(comfortLevel(0)).toBe('cold');
    expect(comfortLevel(0.5)).toBe('chilly');
    expect(comfortLevel(10)).toBe('chilly');
    expect(comfortLevel(11)).toBe('mild');
    expect(comfortLevel(22)).toBe('mild');
    expect(comfortLevel(23)).toBe('warm');
    expect(comfortLevel(30)).toBe('warm');
    expect(comfortLevel(31)).toBe('hot');
  });
});

describe('buildComfort — event-hour lookup', () => {
  // Fixture: start 2024-06-15T20:00, Warsaw (naive-local strings).
  const resp = makeResponse(24 * 3, 3, {
    sunrise: ['2024-06-16T04:20', '2024-06-17T04:19', null],
    sunset: ['2024-06-16T21:10', '2024-06-17T21:09', '2024-06-18T21:08'],
    healthOverrides: { 8: { apparent_temperature: -3, wind_speed_10m: 38 } },
  });

  it('reads the hour bucket of the event (21:10 → 21:00)', () => {
    const c = buildComfort(resp.hourly, '2024-06-16T21:10');
    expect(c).toBeDefined();
    expect(c?.feelsC).toBe(19); // baseline
    expect(c?.windKmh).toBe(9);
    expect(c?.level).toBe('mild');
  });

  it('reads overridden health values (04:20 → 04:00, cold + wind)', () => {
    // startIso 2024-06-15T20:00 → index 8 is 2024-06-16T04:00.
    const c = buildComfort(resp.hourly, '2024-06-16T04:20');
    expect(c?.feelsC).toBe(-3);
    expect(c?.windKmh).toBe(38);
    expect(c?.level).toBe('cold');
  });

  it('undefined for a polar event (null) and an hour outside the data', () => {
    expect(buildComfort(resp.hourly, null)).toBeUndefined();
    expect(buildComfort(resp.hourly, '2030-01-01T12:00')).toBeUndefined();
  });

  it('undefined without apparent_temperature data (older response shape)', () => {
    const { apparent_temperature: _drop, ...rest } = resp.hourly;
    const bare = { ...rest } as typeof resp.hourly;
    expect(buildComfort(bare, '2024-06-16T21:10')).toBeUndefined();
  });

  it('null feels-like at the event hour → undefined', () => {
    const r2 = makeResponse(24, 2, { healthOverrides: { 0: { apparent_temperature: null } } });
    const key = genTimes(24, '2024-06-15T20:00')[0]!;
    expect(buildComfort(r2.hourly, `${key.slice(0, 13)}:30`)).toBeUndefined();
  });
});