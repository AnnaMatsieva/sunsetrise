import { describe, it, expect } from 'vitest';
import { clamp01, smoothstep, invertSmoothstep, trapezoid, bell } from './smooth';

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
  it('NaN → 0', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('smoothstep', () => {
  it('0 below a, 1 above b', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it('midpoint ~0.5', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });
  it('monotonically non-decreasing', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = smoothstep(2, 8, i * 0.5);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('NaN → 0', () => {
    expect(smoothstep(0, 1, Number.NaN)).toBe(0);
  });
  it('a===b behaves like a threshold', () => {
    expect(smoothstep(5, 5, 4)).toBe(0);
    expect(smoothstep(5, 5, 5)).toBe(1);
    expect(smoothstep(5, 5, 6)).toBe(1);
  });
});

describe('invertSmoothstep', () => {
  it('1 below a, 0 above b', () => {
    expect(invertSmoothstep(0, 1, -1)).toBe(1);
    expect(invertSmoothstep(0, 1, 1)).toBe(0);
    expect(invertSmoothstep(0, 1, 2)).toBe(0);
    expect(invertSmoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });
});

describe('trapezoid', () => {
  const fn = (x: number) => trapezoid(x, 5, 20, 80, 120);
  it('0 at the edges, 1 on the plateau', () => {
    expect(fn(0)).toBe(0);
    expect(fn(5)).toBe(0);
    expect(fn(20)).toBe(1);
    expect(fn(50)).toBe(1);
    expect(fn(80)).toBe(1);
    expect(fn(120)).toBe(0);
    expect(fn(130)).toBe(0);
  });
  it('monotonically increasing on the 5→20 rise', () => {
    expect(fn(10)).toBeGreaterThan(fn(7));
    expect(fn(15)).toBeGreaterThan(fn(12));
  });
  it('plateau is exactly 1 in [20,80]', () => {
    expect(fn(20)).toBe(1);
    expect(fn(45)).toBe(1);
    expect(fn(80)).toBe(1);
  });
  it('fall 80→120, at 100 ~0.5', () => {
    expect(fn(100)).toBeCloseTo(0.5, 6);
    expect(fn(90)).toBeGreaterThan(fn(100));
    expect(fn(100)).toBeGreaterThan(fn(110));
  });
  it('NaN → 0', () => {
    expect(fn(Number.NaN)).toBe(0);
  });
});

describe('bell', () => {
  const fn = (x: number) => bell(x, 50, 15, 10);
  it('peak 1 at the center', () => {
    expect(fn(50)).toBe(1);
    expect(fn(40)).toBe(1);
    expect(fn(60)).toBe(1);
  });
  it('0 beyond the shoulders', () => {
    expect(fn(20)).toBe(0); // center - plateauHalf - shoulder = 50-15-10 = 25 → x=20<25 → 0
    expect(fn(80)).toBe(0); // 50+15+10 = 75 → x=80>75 → 0
  });
  it('symmetric around the center', () => {
    expect(fn(30)).toBeCloseTo(fn(70), 6);
  });
});