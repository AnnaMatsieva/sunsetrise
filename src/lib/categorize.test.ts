import { describe, it, expect } from 'vitest';
import { scoreToCategory } from './categorize';

describe('scoreToCategory', () => {
  it('boundaries belong to the upper category', () => {
    expect(scoreToCategory(0)).toBe('Poor');
    expect(scoreToCategory(0.24999)).toBe('Poor');
    expect(scoreToCategory(0.25)).toBe('Fair');
    expect(scoreToCategory(0.49999)).toBe('Fair');
    expect(scoreToCategory(0.5)).toBe('Good');
    expect(scoreToCategory(0.74999)).toBe('Good');
    expect(scoreToCategory(0.75)).toBe('Great');
  });
  it('one → Great', () => {
    expect(scoreToCategory(1)).toBe('Great');
  });
  it('null → null', () => {
    expect(scoreToCategory(null)).toBeNull();
  });
  it('NaN → null', () => {
    expect(scoreToCategory(Number.NaN)).toBeNull();
  });
});