import { describe, it, expect } from 'vitest';
import { Body } from 'astronomy-engine';
import {
  meteorShowerStatus,
  moonIllumination,
  planetVisibility,
  stargazingScore,
  skyMapPoints,
  eveningWhen,
  moonConjunctions,
  moonriseInfo,
} from './sky';
import type { Location } from '../types';

const warsaw: Location = { name: 'Warsaw', latitude: 52.2, longitude: 21.0 };

const byName = (now: Date, name: string) =>
  meteorShowerStatus(now).find((s) => s.shower.name === name)!;

describe('meteorShowerStatus', () => {
  it('Perseids are active at the peak (Aug 12–13) with a near-peak rate', () => {
    const st = byName(new Date(2026, 7, 12, 12), 'Perseids');
    expect(st.active).toBe(true);
    expect(Math.abs(st.daysToPeak)).toBeLessThanOrEqual(1);
    expect(st.zhrNow).toBeGreaterThan(90);
  });

  it('between showers it reports the next upcoming peak', () => {
    // Sep 2, 2026: Perseids ended Aug 24; the next peak is the Orionids, Oct 21.
    const st = byName(new Date(2026, 8, 2), 'Orionids');
    expect(st.active).toBe(false);
    expect(st.daysToPeak).toBe(49);
    expect(st.shower.zhr).toBe(20);
  });

  it('the Quadrantids range wraps the new year', () => {
    // Dec 30, 2025 → the active Quadrantids instance belongs to Dec 2025–Jan 2026.
    const st = byName(new Date(2025, 11, 30), 'Quadrantids');
    expect(st.active).toBe(true);
    expect(st.peak.getFullYear()).toBe(2026);
  });

  it('rate fades after the peak but stays above 1 until the range ends', () => {
    const st = byName(new Date(2026, 7, 20), 'Perseids'); // past the peak, in range
    expect(st.active).toBe(true);
    expect(st.zhrNow).toBeGreaterThanOrEqual(1);
    expect(st.zhrNow).toBeLessThan(100);
  });
});

describe('planetVisibility', () => {
  it('returns magnitude, altitude and rise/set for a real location', () => {
    const v = planetVisibility(Body.Saturn, warsaw, new Date(2026, 8, 2, 12));
    expect(v).not.toBeNull();
    expect(typeof v!.mag).toBe('number');
    expect(v!.altDeg).toBeGreaterThanOrEqual(-90);
    expect(v!.altDeg).toBeLessThanOrEqual(90);
    expect(v!.rise === null || v!.rise instanceof Date).toBe(true);
    expect(v!.set === null || v!.set instanceof Date).toBe(true);
  });

  it('the Sun as a sanity check: below the horizon at 22:00 from Warsaw', () => {
    // planetVisibility always evaluates "tonight at 22:00" — the Sun must be down.
    const v = planetVisibility(Body.Sun, warsaw, new Date(2024, 5, 21, 10));
    expect(v!.altDeg).toBeLessThan(0);
  });

  it('azimuth lands in the compass range', () => {
    const v = planetVisibility(Body.Saturn, warsaw, new Date(2026, 8, 2, 12));
    expect(v!.azDeg).toBeGreaterThanOrEqual(0);
    expect(v!.azDeg).toBeLessThanOrEqual(360);
  });
});

describe('eveningWhen', () => {
  it('before 22:00 it resolves to tonight at 22:00; after — to now', () => {
    expect(eveningWhen(new Date(2026, 8, 2, 12)).getHours()).toBe(22);
    const late = new Date(2026, 8, 2, 23, 30);
    expect(eveningWhen(late)).toBe(late);
  });
});

describe('skyMapPoints', () => {
  it('up points sit above the horizon; rim points rise within 24 h', () => {
    const points = skyMapPoints(warsaw, new Date(2026, 8, 2, 12));
    for (const p of points) {
      expect(p.altDeg).toBeGreaterThanOrEqual(0);
      expect(p.altDeg).toBeLessThanOrEqual(90);
      expect(p.azDeg).toBeGreaterThanOrEqual(0);
      expect(p.azDeg).toBeLessThanOrEqual(360);
      if (p.altDeg === 0) {
        expect(p.rise).toBeInstanceOf(Date);
        expect(p.rise!.getTime()).toBeGreaterThan(new Date(2026, 8, 2, 22).getTime());
      } else {
        expect(p.rise).toBeNull();
      }
    }
  });

  it('Jupiter in Sep 2026 is below the horizon at 22:00 but rises later', () => {
    const points = skyMapPoints(warsaw, new Date(2026, 8, 2, 12));
    const jupiter = points.find((p) => p.name === 'Jupiter');
    expect(jupiter).toBeDefined();
    expect(jupiter!.altDeg).toBe(0);
    expect(jupiter!.rise).toBeInstanceOf(Date);
  });

  it('the active Perseids radiant shows up on the map in mid-August', () => {
    const points = skyMapPoints(warsaw, new Date(2026, 7, 12, 12));
    // Both Delta Aquariids and Perseids are active on Aug 12 — find ours by name.
    const radiant = points.find((p) => p.kind === 'shower' && p.name === 'Perseids');
    expect(radiant).toBeDefined();
    expect(radiant!.altDeg).toBeGreaterThan(0); // Dec +58 from lat 52 — circumpolar
    expect(radiant!.rise).toBeNull();
  });

  it('planets carry a magnitude, everything else does not', () => {
    const points = skyMapPoints(warsaw, new Date(2026, 8, 2, 12));
    for (const p of points) {
      if (p.kind === 'planet') expect(typeof p.mag).toBe('number');
      else expect(p.mag).toBeNull();
    }
  });

  it('an invalid location → an empty map, never a throw', () => {
    const bad: Location = { name: 'Nowhere', latitude: 999, longitude: 21 };
    expect(skyMapPoints(bad, new Date(2026, 8, 2, 12))).toEqual([]);
  });

  it('carries bright reference stars above the horizon', () => {
    const points = skyMapPoints(warsaw, new Date(2026, 8, 2, 12));
    const stars = points.filter((p) => p.kind === 'star');
    // Vega (Dec +39) and Capella (+46) are circumpolar from lat 52 — always up.
    for (const name of ['Vega', 'Capella']) {
      expect(stars.find((s) => s.name === name)).toBeDefined();
    }
    for (const s of stars) {
      expect(s.altDeg).toBeGreaterThan(0);
      expect(s.rise).toBeNull();
    }
  });
});

describe('moonConjunctions', () => {
  it('returns sane entries with separations under 4°', () => {
    const list = moonConjunctions(warsaw, new Date(2026, 8, 2, 12));
    for (const c of list) {
      expect(c.sepDeg).toBeGreaterThan(0);
      expect(c.sepDeg).toBeLessThan(4);
      expect(c.altDeg).toBeGreaterThan(0);
      expect(c.planet).toMatch(/Saturn|Jupiter/);
      expect(c.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('an invalid location → an empty list, never a throw', () => {
    const bad: Location = { name: 'Nowhere', latitude: 999, longitude: 21 };
    expect(moonConjunctions(bad, new Date(2026, 8, 2, 12))).toEqual([]);
  });
});

describe('moonriseInfo', () => {
  it('the excess-over-24h delay lands in the known 30–70 min band', () => {
    const info = moonriseInfo(warsaw, new Date(2026, 8, 2, 12));
    expect(info.delayMin).not.toBeNull();
    expect(info.delayMin!).toBeGreaterThanOrEqual(20);
    expect(info.delayMin!).toBeLessThanOrEqual(80);
    if (info.riseDistanceKm !== null) {
      expect(info.riseDistanceKm).toBeGreaterThan(350_000);
      expect(info.riseDistanceKm).toBeLessThan(410_000);
    }
    expect(typeof info.giant).toBe('boolean');
  });

  it('an invalid location → all null, never a throw', () => {
    const bad: Location = { name: 'Nowhere', latitude: 999, longitude: 21 };
    expect(moonriseInfo(bad, new Date(2026, 8, 2, 12))).toEqual({
      delayMin: null,
      riseDistanceKm: null,
      giant: false,
    });
  });
});

describe('moonIllumination', () => {
  it('is near 1 at a known full moon and below 0.1 at a new moon', () => {
    // Full moon 2026-03-03 11:33 UTC; new moon 2026-03-19 01:23 UTC.
    expect(moonIllumination(new Date(Date.UTC(2026, 2, 3, 11, 33)))).toBeGreaterThan(0.95);
    expect(moonIllumination(new Date(Date.UTC(2026, 2, 19, 1, 23)))).toBeLessThan(0.05);
  });
});

describe('stargazingScore', () => {
  it('a clear moonless night scores 100 (Great)', () => {
    const s = stargazingScore(0, 0);
    expect(s.score).toBe(100);
    expect(s.category).toBe('Great');
  });

  it('clouds eat the score linearly', () => {
    expect(stargazingScore(1, 0).score).toBe(0);
    expect(stargazingScore(1, 0).category).toBe('Poor');
    expect(stargazingScore(0.5, 0).score).toBe(50);
  });

  it('a bright moon costs up to 60% even under clear skies', () => {
    const s = stargazingScore(0, 1);
    expect(s.score).toBe(40);
    expect(s.category).toBe('Fair');
  });

  it('no cloud data → unknown, not zero', () => {
    const s = stargazingScore(null, 0);
    expect(s.score).toBeNull();
    expect(s.category).toBeNull();
  });

  it('lands in the middle categories for mixed conditions', () => {
    expect(stargazingScore(0.3, 0.3).category).toBe('Good');
  });

  it('light pollution scales the whole score down', () => {
    const s = stargazingScore(0, 0, 0.5);
    expect(s.score).toBe(50);
    const city = stargazingScore(0.2, 0, 0.08); // ≈ Bortle 9
    expect(city.score).toBeLessThan(10);
  });

  it('null cloud data stays null even with light pollution', () => {
    expect(stargazingScore(null, 0, 0.08).score).toBeNull();
  });
});