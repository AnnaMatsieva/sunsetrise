import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

type ChangeFn = (e: MediaQueryListEvent) => void;

/** Constructible MediaQueryList: remembers listeners and can fire change. */
function mockMatchMedia(initial: boolean, media = '(prefers-color-scheme: dark)') {
  const handlers = new Set<ChangeFn>();
  const mql = {
    matches: initial,
    media,
    onchange: null as MediaQueryListEvent | null,
    addEventListener: (_t: string, h: ChangeFn) => handlers.add(h),
    removeEventListener: (_t: string, h: ChangeFn) => handlers.delete(h),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    setMatches(m: boolean) {
      mql.matches = m;
      const event = { matches: m, media } as MediaQueryListEvent;
      handlers.forEach((h) => h(event));
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery', () => {
  it('returns the initial match', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    expect(result.current).toBe(true);
  });

  it('is false when there is no match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    expect(result.current).toBe(false);
  });

  it('updates when the match changes', () => {
    const ctrl = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    expect(result.current).toBe(false);
    act(() => ctrl.setMatches(true));
    expect(result.current).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const ctrl = mockMatchMedia(false);
    const { result, unmount } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));
    unmount();
    // After unmounting, a change must not crash the test / must not update the result.
    act(() => ctrl.setMatches(true));
    expect(result.current).toBe(false);
  });
});