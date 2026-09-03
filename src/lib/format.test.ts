import { describe, it, expect } from 'vitest';
import { formatTime, formatDay, formatPercent } from './format';

describe('formatTime', () => {
  it('extracts HH:MM from a naive-local ISO string', () => {
    expect(formatTime('2024-06-15T21:18')).toBe('21:18');
    expect(formatTime('2024-06-15T00:05')).toBe('00:05');
  });
  it('null → "—"', () => {
    expect(formatTime(null)).toBe('—');
  });
});

describe('formatDay', () => {
  it('format "Sat 15 Jun" — correct weekday', () => {
    // 2024-06-15 is a Saturday (in UTC)
    expect(formatDay('2024-06-15')).toBe('Sat 15 Jun');
    // 2024-06-17 is a Monday
    expect(formatDay('2024-06-17')).toBe('Mon 17 Jun');
  });
  it('an invalid date is returned as-is', () => {
    expect(formatDay('garbage')).toBe('garbage');
  });
});

describe('formatPercent', () => {
  it('0..1 → 0..100', () => {
    expect(formatPercent(0.5)).toBe('50');
    expect(formatPercent(0.832)).toBe('83');
    expect(formatPercent(1)).toBe('100');
    expect(formatPercent(0)).toBe('0');
  });
  it('null → "—"', () => {
    expect(formatPercent(null)).toBe('—');
  });
});