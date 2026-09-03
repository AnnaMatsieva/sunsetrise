import { describe, it, expect } from 'vitest';
import { uvCategory, uvHzLevel, sunburnMinutes, sunDangerWindow } from './uv';

describe('uvCategory — WHO bands', () => {
  it('band boundaries are inclusive upper bounds', () => {
    expect(uvCategory(0)).toBe('low');
    expect(uvCategory(2)).toBe('low');
    expect(uvCategory(2.5)).toBe('moderate');
    expect(uvCategory(5)).toBe('moderate');
    expect(uvCategory(6)).toBe('high');
    expect(uvCategory(7)).toBe('high');
    expect(uvCategory(8)).toBe('very high');
    expect(uvCategory(10)).toBe('very high');
    expect(uvCategory(11)).toBe('extreme');
    expect(uvCategory(14)).toBe('extreme');
  });

  it('null/invalid input → null', () => {
    expect(uvCategory(null)).toBeNull();
    expect(uvCategory(undefined)).toBeNull();
    expect(uvCategory(-1)).toBeNull();
    expect(uvCategory(NaN)).toBeNull();
  });
});

describe('uvHzLevel — badge levels', () => {
  it('maps bands to the shared hazard scale', () => {
    expect(uvHzLevel(0)).toBe(1);
    expect(uvHzLevel(3)).toBe(2);
    expect(uvHzLevel(6)).toBe(4);
    expect(uvHzLevel(9)).toBe(5);
    expect(uvHzLevel(12)).toBe(6);
  });

  it('null/invalid input → null', () => {
    expect(uvHzLevel(null)).toBeNull();
    expect(uvHzLevel(-3)).toBeNull();
  });
});

describe('sunburnMinutes — MED rule of thumb', () => {
  it('≈11 min for fair skin at UV 6, rounded to 5', () => {
    expect(sunburnMinutes(6)).toBe(10); // 200/18 ≈ 11.1 → 10
    expect(sunburnMinutes(6, 2)).toBe(10);
  });

  it('scales with skin type', () => {
    // Type I burns ~2/3 as fast; type VI ~4× slower.
    expect(sunburnMinutes(6, 1)).toBe(5); // 7.4 → 5
    expect(sunburnMinutes(6, 6)).toBe(45); // 44.4 → 45
  });

  it('null below UV 3 and for zero/invalid UV', () => {
    expect(sunburnMinutes(2)).toBeNull();
    expect(sunburnMinutes(0)).toBeNull();
    expect(sunburnMinutes(null)).toBeNull();
    expect(sunburnMinutes(NaN)).toBeNull();
  });
});

describe('sunDangerWindow — when UV reaches the moderate band', () => {
  const time = [
    '2026-09-03T08:00', '2026-09-03T09:00', '2026-09-03T10:00',
    '2026-09-03T11:00', '2026-09-03T12:00', '2026-09-03T13:00',
    '2026-09-03T14:00', '2026-09-03T15:00', '2026-09-03T16:00',
    '2026-09-04T10:00',
  ];
  const uv = [1, 2.5, 3, 6, 7, 5, 2, null, 4, 9];

  it('first and last hour with UV ≥ 3', () => {
    // Index 8 (16:00) is 4 ≥ 3 — the null at 15:00 does not end the window.
    expect(sunDangerWindow(time, uv, '2026-09-03')).toEqual({ from: '10:00', to: '16:00' });
  });

  it('a day that never reaches UV 3 → null', () => {
    expect(sunDangerWindow(time, [1, 2, 2.9, 2, 1, 2, 1, 2, 2, 9] as (number | null)[], '2026-09-03')).toBeNull();
  });

  it('missing uv array and unknown days → null', () => {
    expect(sunDangerWindow(time, undefined, '2026-09-03')).toBeNull();
    expect(sunDangerWindow(time, uv, '2026-01-01')).toBeNull();
  });

  it('nulls at the edges do not break the window', () => {
    expect(sunDangerWindow(time, [null, 2, 3, null, 4, null, 2, null, null, 1], '2026-09-03')).toEqual({
      from: '10:00',
      to: '12:00',
    });
  });
});