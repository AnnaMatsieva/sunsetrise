import { describe, it, expect } from 'vitest';
import { bortleFor, lightFactor, FLUX_TO_BORTLE } from './lightpollution';
import type { CityLight } from '../constants/cityLight';

/** Two synthetic cities, far apart: a big metro and a mid-size city. */
const METRO: CityLight = { lat: 50.0, lon: 20.0, pop: 2_000_000 };
const TOWN: CityLight = { lat: 52.0, lon: 20.0, pop: 200_000 };
const cities: ReadonlyArray<CityLight> = [METRO, TOWN];

describe('bortleFor', () => {
  it('the heart of a big metro is sky glow (Bortle 8–9)', () => {
    const b = bortleFor(50.0, 20.0, cities);
    expect(b).toBeGreaterThanOrEqual(8);
  });

  it('~100 km out from the metro reads suburban', () => {
    const b = bortleFor(51.0, 20.5, cities); // ≈ 111 km north
    expect(b).toBeGreaterThanOrEqual(4);
    expect(b).toBeLessThanOrEqual(5);
  });

  it('far from every mapped city → null (dark rural, no penalty)', () => {
    const b = bortleFor(0.0, 0.0, cities); // ~5000 km away
    expect(b).toBeNull();
  });

  it('closer means a higher (brighter) class', () => {
    const far = bortleFor(51.5, 20.0, cities);
    const near = bortleFor(51.0, 20.0, cities);
    expect(near!).toBeGreaterThan(far!);
  });

  it('an empty table → null for any point', () => {
    expect(bortleFor(52.0, 21.0, [])).toBeNull();
  });

  it('the real embedded table covers Warsaw as a city sky', () => {
    // Sanity check against the actual dataset, not just synthetic cities.
    const b = bortleFor(52.23, 21.01);
    expect(b).not.toBeNull();
    expect(b!).toBeGreaterThanOrEqual(6);
  });

  it('FLUX_TO_BORTLE thresholds ascend and end at Bortle 9 above the table', () => {
    for (let i = 1; i < FLUX_TO_BORTLE.length; i++) {
      expect(FLUX_TO_BORTLE[i]!.max).toBeGreaterThan(FLUX_TO_BORTLE[i - 1]!.max);
    }
    const last = FLUX_TO_BORTLE[FLUX_TO_BORTLE.length - 1]!;
    expect(last.bortle).toBe(8);
  });
});

describe('lightFactor', () => {
  it('dark and unknown skies cost nothing', () => {
    expect(lightFactor(null)).toBe(1);
    expect(lightFactor(1)).toBe(1);
    expect(lightFactor(2)).toBe(1);
  });

  it('bright city skies eat most of the score', () => {
    expect(lightFactor(9)).toBeLessThanOrEqual(0.1);
    expect(lightFactor(7)).toBeLessThan(lightFactor(4)!);
    expect(lightFactor(4)).toBeLessThan(lightFactor(2)!);
  });

  it('factors stay in (0, 1]', () => {
    for (let b = 1; b <= 9; b++) {
      const f = lightFactor(b);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});