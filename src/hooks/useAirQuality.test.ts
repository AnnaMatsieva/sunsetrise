import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAirQuality } from './useAirQuality';
import type { Location } from '../types';

const WARSAW: Location = { name: 'Warsaw', latitude: 52.23, longitude: 21.01 };

function aqPayload(): Record<string, unknown> {
  // Time is derived from the system clock so the current hour always exists
  // (buildDayAir looks up the location-local wall-clock hour) — three days
  // of hourly buckets around today.
  const p = (x: number): string => String(x).padStart(2, '0');
  const days = [-1, 0, 1].map((off) => {
    const d = new Date();
    d.setDate(d.getDate() + off);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const time = days.flatMap((day) => Array.from({ length: 24 }, (_, h) => `${day}T${p(h)}:00`));
  const n = time.length;
  return {
    latitude: 52.2,
    longitude: 21.0,
    timezone: 'Europe/Warsaw',
    utc_offset_seconds: 7200,
    hourly: {
      time,
      european_aqi: Array.from({ length: n }, () => 39),
      pm2_5: Array.from({ length: n }, () => 7.4),
      pm10: Array.from({ length: n }, () => 11.6),
      dust: Array.from({ length: n }, () => 0),
      aerosol_optical_depth: Array.from({ length: n }, () => 0.2),
    },
  };
}

describe('useAirQuality', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('loads and shapes the data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(aqPayload()), { status: 200 }));
    const { result } = renderHook(() => useAirQuality(WARSAW));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data?.aqi).not.toBeNull();
    expect(result.current.data?.pollens).toEqual([]);
  });

  it('caches per coordinate — returning to the same location does not refetch', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(aqPayload()), { status: 200 }));
    const PARIS: Location = { name: 'Paris', latitude: 48.86, longitude: 2.35 };
    const { result, rerender } = renderHook(({ loc }) => useAirQuality(loc), {
      initialProps: { loc: WARSAW },
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    const callsAfterFirst = vi.mocked(fetch).mock.calls.length;

    // Switching to Paris — a new request.
    rerender({ loc: PARIS });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsAfterFirst));

    // Back to Warsaw — served from the cache; fetch must not be called again.
    const callsBeforeReturn = vi.mocked(fetch).mock.calls.length;
    rerender({ loc: WARSAW });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBeforeReturn);
  });

  it('enabled=false never fetches', async () => {
    const { result } = renderHook(() => useAirQuality(WARSAW, false));
    expect(result.current.status).toBe('idle');
    await new Promise((r) => setTimeout(r, 20));
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('error is quarantined: data stays null, the message is surfaced', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('down'));
    const { result } = renderHook(() => useAirQuality(WARSAW));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('refetch clears the cache and fetches again', async () => {
    // A factory, not mockResolvedValue: a Response body can only be read once.
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify(aqPayload()), { status: 200 }));
    const { result } = renderHook(() => useAirQuality(WARSAW));
    await waitFor(() => expect(result.current.status).toBe('success'));
    const calls = vi.mocked(fetch).mock.calls.length;
    result.current.refetch();
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBe(calls + 1));
    expect(result.current.status).toBe('success');
  });
});