import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeocoding } from './useGeocoding';
import { searchCities } from '../api/geocodingClient';
import { AppError, GeocodingError } from '../api/errors';
import type { GeoResult } from '../types';

vi.mock('../api/geocodingClient', () => ({
  searchCities: vi.fn(),
}));

const results: GeoResult[] = [
  { id: 1, name: 'Warsaw', latitude: 52.2, longitude: 21.0, country: 'Poland' },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useGeocoding', () => {
  it('short query → idle, no API call', () => {
    const { result } = renderHook(() => useGeocoding('W'));
    expect(result.current.status).toBe('idle');
    expect(result.current.results).toEqual([]);
    expect(searchCities).not.toHaveBeenCalled();
  });

  it('empty/whitespace query → idle', () => {
    const { result } = renderHook(() => useGeocoding('   '));
    expect(result.current.status).toBe('idle');
    expect(searchCities).not.toHaveBeenCalled();
  });

  it('query of ≥2 chars → debounce → success', async () => {
    vi.mocked(searchCities).mockResolvedValue(results);
    const { result } = renderHook(() => useGeocoding('Warsaw'));
    expect(result.current.status).toBe('loading');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.status).toBe('success');
    expect(result.current.results).toEqual(results);
    expect(result.current.error).toBeNull();
  });

  it('API error → status error with a message', async () => {
    vi.mocked(searchCities).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useGeocoding('Warsaw'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).not.toBeNull();
    expect(result.current.results).toEqual([]);
  });

  it('an AppError passes its own message through', async () => {
    // A plain AppError (no HTTP status) — the hook returns its message as is.
    vi.mocked(searchCities).mockRejectedValue(new AppError('service unavailable'));
    const { result } = renderHook(() => useGeocoding('Warsaw'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.error).toBe('service unavailable');
  });

  it('GeocodingError with a status → HTTP template', async () => {
    vi.mocked(searchCities).mockRejectedValue(new GeocodingError('upstream', 500));
    const { result } = renderHook(() => useGeocoding('Warsaw'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.error).toBe('The geocoding service returned error 500.');
  });

  it('changing the query aborts the old request without an error (AbortError regression)', async () => {
    // Emulate a real fetch: the promise hangs until the signal is aborted.
    vi.mocked(searchCities).mockImplementation(
      (_q, signal) =>
        new Promise((_res, rej) => {
          signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
        }),
    );
    const { result, rerender } = renderHook(({ q }) => useGeocoding(q), {
      initialProps: { q: 'Warsaw' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(searchCities).toHaveBeenCalledTimes(1);

    // Changing the query — cleanup calls ac.abort(); the old promise rejects
    // with AbortError. The hook must swallow it silently (isAbortError), without an error status.
    rerender({ q: 'Paris' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.status).not.toBe('error');
    expect(result.current.error).toBeNull();
  });
});