import { describe, it, expect } from 'vitest';
import type { AirQualityResponse, PollenKey } from '../types';
import { buildDayAir, eaqiHzLevel, pollenLevel, smokeFrom, POLLEN_THRESHOLDS } from './air';

/** Builds an AQ response from naive-local hours starting 2026-09-03T00:00. */
function resp(
  hours: number,
  hourly: Record<string, (number | null)[]>,
  utcOffset = 7200,
): AirQualityResponse {
  const time: string[] = [];
  for (let i = 0; i < hours; i++) {
    const h = i % 24;
    const day = 3 + Math.floor(i / 24);
    time.push(`2026-09-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`);
  }
  return {
    latitude: 52.2,
    longitude: 21.0,
    timezone: 'Europe/Warsaw',
    utc_offset_seconds: utcOffset,
    hourly: { time, ...hourly },
  };
}

describe('eaqiHzLevel — EEA bands, inclusive upper bounds', () => {
  it('band boundaries', () => {
    expect(eaqiHzLevel(0)).toBe(1);
    expect(eaqiHzLevel(20)).toBe(1);
    expect(eaqiHzLevel(21)).toBe(2);
    expect(eaqiHzLevel(40)).toBe(2);
    expect(eaqiHzLevel(60)).toBe(3);
    expect(eaqiHzLevel(80)).toBe(4);
    expect(eaqiHzLevel(100)).toBe(5);
    expect(eaqiHzLevel(101)).toBe(6);
  });

  it('null/invalid → null', () => {
    expect(eaqiHzLevel(null)).toBeNull();
    expect(eaqiHzLevel(-1)).toBeNull();
    expect(eaqiHzLevel(NaN)).toBeNull();
  });
});

describe('pollenLevel', () => {
  it('thresholds per type', () => {
    expect(pollenLevel('birch', 99)).toBe('moderate');
    expect(pollenLevel('birch', 100)).toBe('high');
    expect(pollenLevel('ragweed', 20)).toBe('high');
    expect(pollenLevel('ragweed', 5)).toBe('moderate');
    expect(pollenLevel('grass', 9)).toBe('low');
  });

  it('null/negative → null', () => {
    expect(pollenLevel('birch', null)).toBeNull();
    expect(pollenLevel('birch', -3)).toBeNull();
  });

  it('all six types have thresholds', () => {
    for (const k of Object.keys(POLLEN_THRESHOLDS) as PollenKey[]) {
      expect(POLLEN_THRESHOLDS[k].moderate).toBeGreaterThan(0);
    }
  });
});

describe('smokeFrom', () => {
  it('AOD ≥ 0.5 means smoke unless dust dominates', () => {
    expect(smokeFrom(0.2, 0)).toBe(false);
    expect(smokeFrom(0.5, 10)).toBe(true);
    expect(smokeFrom(0.8, 60)).toBe(false); // dust, not smoke
  });

  it('unknown AOD → null', () => {
    expect(smokeFrom(null, 10)).toBeNull();
  });
});

describe('buildDayAir — now via the response own offset', () => {
  const NOW = new Date('2026-09-03T12:00:00Z');

  it('picks the location-local hour (UTC+2 → 14:00)', () => {
    const air = buildDayAir(
      resp(48, {
        european_aqi: Array.from({ length: 48 }, (_, i) => (i === 14 ? 73 : 20)),
        pm2_5: Array.from({ length: 48 }, (_, i) => (i === 14 ? 31 : 5)),
        pm10: Array.from({ length: 48 }, () => 12),
        dust: Array.from({ length: 48 }, () => 0),
        aerosol_optical_depth: Array.from({ length: 48 }, (_, i) => (i === 14 ? 0.7 : 0.1)),
      }),
      NOW,
    );
    expect(air.aqi).toBe(73);
    expect(air.pm25).toBe(31);
    expect(air.smoke).toBe(true);
  });

  it('UTC−4 (New York): 12:00Z → 08:00 local', () => {
    const aqi = Array.from({ length: 48 }, (_, i) => (i === 8 ? 55 : 10));
    const air = buildDayAir(resp(48, { european_aqi: aqi }, -14400), NOW);
    expect(air.aqi).toBe(55);
  });

  it('hour missing from the arrays → nulls, empty pollen list', () => {
    const air = buildDayAir(resp(4, { european_aqi: [1, 2, 3, 4] }), NOW);
    expect(air.aqi).toBeNull();
    expect(air.smoke).toBeNull();
    expect(air.pollens).toEqual([]);
    expect(air.peakAqi).toEqual({ date: '2026-09-03', aqi: 4 });
  });

  it('pollen values become rows with levels; nulls are skipped', () => {
    const birch = Array.from({ length: 48 }, (_, i) => (i === 14 ? 120 : null));
    const grass = Array.from({ length: 48 }, (_, i) => (i === 14 ? 3 : null));
    const air = buildDayAir(resp(48, { birch_pollen: birch, grass_pollen: grass }), NOW);
    expect(air.pollens).toHaveLength(2);
    expect(air.pollens[0]).toMatchObject({ key: 'birch', value: 120, level: 'high' });
    expect(air.pollens[1]).toMatchObject({ key: 'grass', value: 3, level: 'low' });
    expect(air.anyPollenHigh).toBe(true);
  });

  it('peakAqi tracks the worst hour across days', () => {
    const aqi = Array.from({ length: 96 }, (_, i) => (i === 60 ? 99 : 30));
    const air = buildDayAir(resp(96, { european_aqi: aqi }), NOW);
    expect(air.peakAqi).toEqual({ date: '2026-09-05', aqi: 99 });
  });
});