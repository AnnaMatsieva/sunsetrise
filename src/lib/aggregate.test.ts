import { describe, it, expect } from 'vitest';
import { weightedAverageWithNulls, blendWithPeak, maxIgnoringNulls } from './aggregate';

describe('weightedAverageWithNulls', () => {
  it('plain weighted average', () => {
    expect(weightedAverageWithNulls([0.5, 1, 0], [0.5, 0.3, 0.2])).toBeCloseTo(0.55, 6);
  });

  it('gaps are ignored, weights are renormalized', () => {
    // only the first is valid (0.5, weight 0.5) → 0.5
    expect(weightedAverageWithNulls([0.5, null, null], [0.5, 0.3, 0.2])).toBeCloseTo(0.5, 6);
    // two valid entries
    expect(weightedAverageWithNulls([0.4, null, 0.8], [1, 1, 1])).toBeCloseTo(0.6, 6);
  });

  it('all null → null', () => {
    expect(weightedAverageWithNulls([null, null], [1, 1])).toBeNull();
  });

  it('empty array or mismatched lengths → null', () => {
    expect(weightedAverageWithNulls([], [])).toBeNull();
    expect(weightedAverageWithNulls([0.5], [0.5, 0.5])).toBeNull();
  });

  it('NaN is ignored like null', () => {
    expect(weightedAverageWithNulls([Number.NaN, 0.8], [1, 1])).toBeCloseTo(0.8, 6);
  });
});

describe('maxIgnoringNulls', () => {
  it('maximum without nulls', () => {
    expect(maxIgnoringNulls([0.2, 0.9, 0.5])).toBe(0.9);
  });
  it('all null → null', () => {
    expect(maxIgnoringNulls([null, null])).toBeNull();
  });
  it('with gaps', () => {
    expect(maxIgnoringNulls([null, 0.3, null, 0.7])).toBe(0.7);
  });
});

describe('blendWithPeak', () => {
  it('0.8*avg + 0.2*peak', () => {
    // avg computed externally; values for peak
    expect(blendWithPeak(0.5, [0.5, 0.9], 0.2)).toBeCloseTo(0.5 * 0.8 + 0.9 * 0.2, 6); // 0.58
  });
  it('avg=null → null', () => {
    expect(blendWithPeak(null, [0.9])).toBeNull();
  });
  it('peak missing (all null) → just avg', () => {
    expect(blendWithPeak(0.5, [null, null])).toBeCloseTo(0.5, 6);
  });
  it('custom peakWeight', () => {
    expect(blendWithPeak(0.5, [1], 0.5)).toBeCloseTo(0.5 * 0.5 + 1 * 0.5, 6); // 0.75
  });
});