import { describe, it, expect } from 'vitest';
import { pressureTendency } from './pressure';

describe('pressureTendency', () => {
  const arr: (number | null)[] = [1010, 1011, 1012, 1013, null, 1015, 1016];

  it('difference with lookback=3 on valid data', () => {
    expect(pressureTendency(arr, 3, 3)).toBe(3); // 1013 - 1010
    expect(pressureTendency(arr, 5, 3)).toBe(3); // 1015 - 1012
    expect(pressureTendency(arr, 6, 3)).toBe(3); // 1016 - 1013
  });

  it('null when there is not enough history (i-lookback < 0)', () => {
    expect(pressureTendency(arr, 0, 3)).toBeNull();
    expect(pressureTendency(arr, 2, 3)).toBeNull();
  });

  it('null when the current value is missing', () => {
    expect(pressureTendency(arr, 4, 3)).toBeNull(); // cur = null
  });

  it('negative tendency (falling pressure)', () => {
    const falling: (number | null)[] = [1020, 1018, 1016, 1010];
    expect(pressureTendency(falling, 3, 3)).toBe(-10); // 1010 - 1020
  });

  it('lookback=1', () => {
    expect(pressureTendency(arr, 3, 1)).toBe(1); // 1013 - 1012
  });

  it('empty array', () => {
    expect(pressureTendency([], 0, 3)).toBeNull();
  });
});