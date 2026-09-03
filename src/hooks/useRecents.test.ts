import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecents, locationKey } from './useRecents';
import type { Location } from '../types';

const warsaw: Location = { name: 'Warsaw', latitude: 52.2, longitude: 21.0, country: 'Poland' };
const paris: Location = { name: 'Paris', latitude: 48.85, longitude: 2.35, country: 'France' };
const warsawDup: Location = { name: 'Warsaw PL', latitude: 52.2001, longitude: 21.0002 };

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  localStorage.clear();
});

describe('locationKey', () => {
  it('rounds to 3 decimals — close coordinates produce the same key', () => {
    expect(locationKey(warsaw)).toBe(locationKey(warsawDup));
    expect(locationKey(warsaw)).not.toBe(locationKey(paris));
  });
});

describe('useRecents', () => {
  it('is empty by default', () => {
    const { result } = renderHook(() => useRecents());
    expect(result.current.recents).toEqual([]);
  });

  it('add puts the location at the front', () => {
    const { result } = renderHook(() => useRecents());
    act(() => result.current.add(paris));
    act(() => result.current.add(warsaw));
    expect(result.current.recents).toEqual([warsaw, paris]);
  });

  it('dedup by coordinates moves the existing one to the front', () => {
    const { result } = renderHook(() => useRecents());
    act(() => result.current.add(warsaw));
    act(() => result.current.add(paris));
    act(() => result.current.add(warsawDup)); // same key as warsaw
    expect(result.current.recents).toEqual([warsawDup, paris]);
    expect(result.current.recents).toHaveLength(2);
  });

  it('caps at MAX = 8', () => {
    const { result } = renderHook(() => useRecents());
    for (let i = 0; i < 12; i++) {
      const loc: Location = { name: `C${i}`, latitude: i, longitude: i };
      act(() => result.current.add(loc));
    }
    expect(result.current.recents).toHaveLength(8);
    // The most recently added is first.
    expect(result.current.recents[0]?.name).toBe('C11');
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useRecents());
    act(() => result.current.add(warsaw));
    const stored = JSON.parse(localStorage.getItem('sunsetrise-recents') ?? '[]');
    expect(stored).toEqual([warsaw]);
  });

  it('restores from localStorage on mount', () => {
    localStorage.setItem('sunsetrise-recents', JSON.stringify([paris, warsaw]));
    const { result } = renderHook(() => useRecents());
    expect(result.current.recents).toEqual([paris, warsaw]);
  });

  it('ignores garbage in localStorage', () => {
    localStorage.setItem('sunsetrise-recents', '{not an array}');
    const { result } = renderHook(() => useRecents());
    expect(result.current.recents).toEqual([]);
  });

  it('remove deletes by coordinates', () => {
    const { result } = renderHook(() => useRecents());
    act(() => result.current.add(warsaw));
    act(() => result.current.add(paris));
    act(() => result.current.remove(warsaw));
    expect(result.current.recents).toEqual([paris]);
  });

  it('clear wipes the list', () => {
    const { result } = renderHook(() => useRecents());
    act(() => result.current.add(warsaw));
    act(() => result.current.clear());
    expect(result.current.recents).toEqual([]);
  });
});