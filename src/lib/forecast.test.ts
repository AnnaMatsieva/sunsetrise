import { describe, it, expect } from 'vitest';
import type { DayScore } from '../types';
import { buildForecastScores, bestDayIndex } from './forecast';
import { makeResponse } from '../test/fixtures';

describe('buildForecastScores', () => {
  it('returns one day per daily.time entry', () => {
    const resp = makeResponse(192, 7, { startIso: '2024-06-15T00:00' });
    const days = buildForecastScores(resp);
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2024-06-15');
  });

  it('scores are in [0,1] for normal days', () => {
    const resp = makeResponse(192, 7, { startIso: '2024-06-15T00:00' });
    const days = buildForecastScores(resp);
    for (const d of days) {
      expect(d.sunrise.score === null || (d.sunrise.score >= 0 && d.sunrise.score <= 1)).toBe(true);
      expect(d.sunset.score === null || (d.sunset.score >= 0 && d.sunset.score <= 1)).toBe(true);
    }
  });

  it('polar event (null) → score null, best takes the other event', () => {
    const sunrise = ['2024-06-15T05:10', '2024-06-16T05:11', null, '2024-06-18T05:13'];
    const sunset = ['2024-06-15T21:10', '2024-06-16T21:11', '2024-06-17T21:12', '2024-06-18T21:13'];
    const resp = makeResponse(96, 4, { startIso: '2024-06-15T00:00', sunrise, sunset });
    const days = buildForecastScores(resp);
    expect(days[2]?.sunrise.score).toBeNull();
    expect(days[2]?.sunset.score).not.toBeNull();
    expect(days[2]?.best?.kind).toBe('sunset');
  });

  it('both events null → best null', () => {
    const sunrise = [null];
    const sunset = [null];
    const resp = makeResponse(24, 1, { startIso: '2024-06-15T00:00', sunrise, sunset });
    const days = buildForecastScores(resp);
    expect(days[0]?.best).toBeNull();
  });

  it('weather attaches to forecast days too — but "now" values are today-only', () => {
    const resp = makeResponse(48, 2, {
      startIso: '2024-06-15T00:00',
      sunrise: ['2024-06-15T05:10', '2024-06-16T05:11'],
      sunset: ['2024-06-15T21:10', '2024-06-16T21:11'],
    });
    resp.daily = {
      ...resp.daily,
      temperature_2m_max: [23.4, 24.1],
      temperature_2m_min: [12.1, 13.2],
      precipitation_probability_max: [20, 5],
      precipitation_sum: [0.2, 0],
      weather_code: [1, 2],
      wind_speed_10m_max: [14, 9],
      wind_gusts_10m_max: [33, 20],
      wind_direction_10m_dominant: [315, 180],
    };
    const now = new Date(2024, 5, 15, 14); // Jun 15, 14:00 local
    const days = buildForecastScores(resp, now);
    expect(days[0]?.weather).toBeDefined();
    expect(days[0]?.weather?.tempNow).toBe(20); // the 14:00 hourly bucket
    expect(days[0]?.weather?.tMax).toBeCloseTo(23.4);
    expect(days[0]?.weather?.windDirDeg).toBe(315);
    expect(days[1]?.weather).toBeDefined();
    expect(days[1]?.weather?.tMax).toBeCloseTo(24.1);
    expect(days[1]?.weather?.precipProb).toBe(5);
    // "Now"/tonight values have no meaning for a forecast day.
    expect(days[1]?.weather?.tempNow).toBeNull();
    expect(days[1]?.weather?.humidityNow).toBeNull();
    expect(days[1]?.weather?.cloudNight).toBeNull();
  });

  it('a response without daily weather produces no weather', () => {
    const resp = makeResponse(24, 1, { startIso: '2024-06-15T00:00' });
    const days = buildForecastScores(resp, new Date(2024, 5, 15, 12));
    expect(days[0]?.weather).toBeUndefined();
  });

  it('uvNow is today-only; uvMax is the day peak for every day', () => {
    const resp = makeResponse(48, 2, { startIso: '2024-06-15T00:00' });
    resp.daily = { ...resp.daily, temperature_2m_max: [23, 24], weather_code: [1, 2] };
    const uvi = resp.hourly.uv_index!;
    for (let i = 0; i < 48; i++) uvi[i] = 4;
    uvi[resp.hourly.time.indexOf('2024-06-15T14:00')] = 7; // today's peak
    uvi[resp.hourly.time.indexOf('2024-06-16T14:00')] = 6; // tomorrow's peak
    const days = buildForecastScores(resp, new Date(2024, 5, 15, 14));
    expect(days[0]?.weather?.uvNow).toBe(7); // the current-hour bucket
    expect(days[0]?.weather?.uvMax).toBe(7);
    expect(days[1]?.weather?.uvMax).toBe(6);
    expect(days[1]?.weather?.uvNow).toBeNull(); // forecast day has no "now"
  });

  it('comfort attaches to events whose hour bucket exists', () => {
    const resp = makeResponse(48, 2, { startIso: '2024-06-15T00:00' });
    const feels = resp.hourly.apparent_temperature!;
    const wind = resp.hourly.wind_speed_10m!;
    feels[resp.hourly.time.indexOf('2024-06-15T21:00')] = -4;
    wind[resp.hourly.time.indexOf('2024-06-15T21:00')] = 44;
    const days = buildForecastScores(resp);
    expect(days[0]?.sunset.comfort).toMatchObject({ feelsC: -4, windKmh: 44, level: 'cold' });
    // Sunrise on 05:1x has its own bucket with baseline values.
    expect(days[0]?.sunrise.comfort?.level).toBe('mild');
  });

  it('cloudNight averages tonight hours (21:00 today – 03:00 tomorrow)', () => {
    // 48h from Jun 15 00:00 covers both window parts; set every hour's clouds.
    const resp = makeResponse(48, 2, { startIso: '2024-06-15T00:00' });
    // Weather (and thus cloudNight) attaches only when daily extras exist.
    resp.daily = {
      ...resp.daily,
      temperature_2m_max: [23, 24],
      temperature_2m_min: [12, 13],
      weather_code: [1, 2],
    };
    for (let i = 0; i < 48; i++) resp.hourly.cloud_cover[i] = 40;
    // Override the window hours: 21,22,23 of Jun 15 and 0..3 of Jun 16.
    const idx = (h: number) => resp.hourly.time.indexOf(`2024-06-${h < 4 ? '16' : '15'}T${String(h).padStart(2, '0')}:00`);
    for (const h of [21, 22, 23]) resp.hourly.cloud_cover[idx(h)] = 10;
    for (const h of [0, 1, 2, 3]) resp.hourly.cloud_cover[idx(h)] = 60;
    const days = buildForecastScores(resp, new Date(2024, 5, 15, 12));
    // (10+10+10+60+60+60+60) / 7 / 100 ≈ 0.386
    expect(days[0]?.weather?.cloudNight).toBeCloseTo(38.57 / 100, 2);
  });
});

describe('bestDayIndex', () => {
  const mk = (score: number | null): DayScore => ({
    date: '2024-06-15',
    sunrise: { kind: 'sunrise', score: null, category: null, eventTime: null, hourScores: [], hourKeys: [] },
    sunset: { kind: 'sunset', score, category: null, eventTime: null, hourScores: [], hourKeys: [] },
    best: score === null ? null : { kind: 'sunset', score, category: null, eventTime: null, hourScores: [], hourKeys: [] },
  });

  it('returns the index of the day with the maximum best.score', () => {
    const days = [mk(0.3), mk(0.8), mk(0.5)];
    expect(bestDayIndex(days)).toBe(1);
  });

  it('skips null days', () => {
    const days = [mk(null), mk(null), mk(0.4), mk(null)];
    expect(bestDayIndex(days)).toBe(2);
  });

  it('all null → null', () => {
    expect(bestDayIndex([mk(null), mk(null)])).toBeNull();
  });

  it('empty array → null', () => {
    expect(bestDayIndex([])).toBeNull();
  });
});