import { describe, it, expect } from 'vitest';
import { hourKey, findEventHourIndex, windowIndex, windowOffsets } from './windowing';

describe('hourKey', () => {
  it('truncates to the hour', () => {
    expect(hourKey('2024-06-15T21:00')).toBe('2024-06-15T21');
    expect(hourKey('2024-06-15T21:18')).toBe('2024-06-15T21');
    expect(hourKey('2024-06-15T21:18:45')).toBe('2024-06-15T21');
    expect(hourKey('2024-06-15T00:05')).toBe('2024-06-15T00');
  });
});

describe('findEventHourIndex', () => {
  const times = ['2024-06-15T20:00', '2024-06-15T21:00', '2024-06-15T22:00'];

  it('finds the bucket containing the event (rounded down)', () => {
    expect(findEventHourIndex(times, '2024-06-15T21:18')).toBe(1);
    expect(findEventHourIndex(times, '2024-06-15T20:59')).toBe(0);
    expect(findEventHourIndex(times, '2024-06-15T22:00')).toBe(2);
  });
  it('null for a null event (polar night)', () => {
    expect(findEventHourIndex(times, null)).toBeNull();
  });
  it('null when the event is outside the array', () => {
    expect(findEventHourIndex(times, '2024-06-15T23:00')).toBeNull();
  });
  it('matches by string key, not by getTime (regression against a foreign tz)', () => {
    // An event at midnight is the typical failure point if parsed as a Date.
    const midnight = ['2024-06-15T00:00', '2024-06-15T01:00'];
    expect(findEventHourIndex(midnight, '2024-06-15T00:05')).toBe(0);
  });
});

describe('windowIndex', () => {
  it('valid offsets within the array', () => {
    expect(windowIndex(5, -3, 10)).toBe(2);
    expect(windowIndex(5, 0, 10)).toBe(5);
    expect(windowIndex(5, 3, 10)).toBe(8);
  });
  it('null outside the array bounds', () => {
    expect(windowIndex(1, -3, 10)).toBeNull();
    expect(windowIndex(8, 3, 10)).toBeNull();
    expect(windowIndex(0, -1, 10)).toBeNull();
    expect(windowIndex(9, 1, 10)).toBeNull();
  });
});

describe('windowOffsets', () => {
  it('symmetric range from -window to +window', () => {
    expect(windowOffsets(3)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(windowOffsets(0)).toEqual([0]);
  });
});