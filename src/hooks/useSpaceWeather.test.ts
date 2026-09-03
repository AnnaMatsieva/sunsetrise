import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpaceWeather } from './useSpaceWeather';

const flaresFixture = [
  {
    time_tag: '2026-09-02T09:14:00Z',
    begin_time: '2026-09-01T23:17:00Z',
    begin_class: 'B6.5',
    max_time: '2026-09-01T23:38:00Z',
    max_class: 'C1.9',
    end_time: '2026-09-01T23:58:00Z',
    current_class: 'A0.0',
  },
];
const kpFixture = [{ time_tag: '2026-09-02T09:18:00', kp_index: 3, estimated_kp: 2.67 }];

const okFetch = vi.fn(async (url: string) =>
  url.includes('xray-flares')
    ? new Response(JSON.stringify(flaresFixture), { status: 200 })
    : new Response(JSON.stringify(kpFixture), { status: 200 }),
);

describe('useSpaceWeather', () => {
  beforeEach(() => {
    localStorage.clear();
    okFetch.mockClear(); // a module-level spy — drop the previous test's calls
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disabled → idle, no fetch', async () => {
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(false));
    expect(result.current.status).toBe('idle');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('enabled → loading then success, and the result is cached', async () => {
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(true));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data?.flare?.lastMaxClass).toBe('C1.9');
    expect(localStorage.getItem('sunsetrise-space-weather-v1')).not.toBeNull();
  });

  it('a fresh cache → instant success, no fetch', async () => {
    const sw = {
      flare: {
        ongoingClass: null,
        lastMaxClass: 'C1.9',
        lastMaxTime: new Date(Date.UTC(2026, 8, 1, 23, 38)).toISOString(),
      },
      kp: { kp: 2.67, estimatedAt: new Date(Date.UTC(2026, 8, 2, 9, 18)).toISOString() },
      fetchedAt: Date.now(),
    };
    localStorage.setItem('sunsetrise-space-weather-v1', JSON.stringify(sw));
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(true));
    expect(result.current.status).toBe('success');
    expect(result.current.data?.flare?.lastMaxClass).toBe('C1.9');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('a stale cache → refetches', async () => {
    const sw = {
      flare: { ongoingClass: null, lastMaxClass: 'C1.9', lastMaxTime: null },
      kp: { kp: 2, estimatedAt: null },
      fetchedAt: Date.now() - 11 * 60_000, // TTL is 10 min
    };
    localStorage.setItem('sunsetrise-space-weather-v1', JSON.stringify(sw));
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(true));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('a corrupt cache → refetches instead of crashing', async () => {
    localStorage.setItem('sunsetrise-space-weather-v1', '{broken');
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(true));
    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('fetch failure → error status, error message set', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    const { result } = renderHook(() => useSpaceWeather(true));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
    // Failures are not cached — the next mount will try again.
    expect(localStorage.getItem('sunsetrise-space-weather-v1')).toBeNull();
  });

  it('refetch clears the cache and hits the network again', async () => {
    const sw = {
      flare: { ongoingClass: null, lastMaxClass: 'C1.9', lastMaxTime: null },
      kp: { kp: 2, estimatedAt: null },
      fetchedAt: Date.now(),
    };
    localStorage.setItem('sunsetrise-space-weather-v1', JSON.stringify(sw));
    vi.stubGlobal('fetch', okFetch);
    const { result } = renderHook(() => useSpaceWeather(true));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});