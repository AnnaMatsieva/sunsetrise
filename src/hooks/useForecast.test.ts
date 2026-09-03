import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useForecast } from './useForecast';
import type { Location } from '../types';
import { makeResponse } from '../test/fixtures';

const good = makeResponse(192, 7, { startIso: '2024-06-15T00:00' });
const warsaw: Location = { name: 'Warsaw', latitude: 52.2, longitude: 21.0, country: 'Poland' };
const paris: Location = { name: 'Paris', latitude: 48.85, longitude: 2.35, country: 'France' };

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe('useForecast', () => {
  it('loading → success with data', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(good), { status: 200 }),
    );
    const { result } = renderHook(() => useForecast(warsaw));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toHaveLength(7);
    expect(result.current.error).toBeNull();
  });

  it('network error → status error with a message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('boom'));
    const { result } = renderHook(() => useForecast(warsaw));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('null location → idle, no request', () => {
    const { result } = renderHook(() => useForecast(null));
    expect(result.current.status).toBe('idle');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('cache by coordinates: re-requesting the same location does not hit fetch', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(good), { status: 200 }),
    );
    const { result, rerender } = renderHook(({ loc }) => useForecast(loc), {
      initialProps: { loc: warsaw },
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    const callsAfterFirst = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Switching to Paris — a new request.
    rerender({ loc: paris });
    await waitFor(() => expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsAfterFirst));

    // Back to Warsaw — served from the cache; fetch must not be called again.
    const callsBeforeReturn = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    rerender({ loc: warsaw });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBeforeReturn);
  });
});