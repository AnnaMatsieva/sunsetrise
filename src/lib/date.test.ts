import { describe, it, expect } from 'vitest';
import { todayStr, isPastDay, daysAhead } from './date';

describe('todayStr', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(todayStr(new Date(2024, 5, 15, 10, 30))).toBe('2024-06-15');
  });

  it('zero-pads month and day', () => {
    expect(todayStr(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
  });
});

describe('isPastDay', () => {
  it('yesterday — past', () => {
    expect(isPastDay('2024-06-14', '2024-06-15')).toBe(true);
  });

  it('today — not past', () => {
    expect(isPastDay('2024-06-15', '2024-06-15')).toBe(false);
  });

  it('tomorrow — not past', () => {
    expect(isPastDay('2024-06-16', '2024-06-15')).toBe(false);
  });
});

describe('daysAhead', () => {
  it('today → 0', () => {
    expect(daysAhead('2024-06-15', '2024-06-15')).toBe(0);
  });

  it('past day → negative', () => {
    expect(daysAhead('2024-06-13', '2024-06-15')).toBe(-2);
  });

  it('future day → positive', () => {
    expect(daysAhead('2024-06-20', '2024-06-15')).toBe(5);
  });

  it('correct across a month boundary and in a leap year', () => {
    expect(daysAhead('2024-03-01', '2024-02-28')).toBe(2); // 2024 is a leap year
  });
});