import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reverseGeocode, clearReverseGeocodeCache } from './reverseGeocode';

beforeEach(() => {
  clearReverseGeocodeCache();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

const cityPayload = {
  city: 'Warsaw',
  locality: 'Warsaw',
  principalSubdivision: 'Masovian Voivodeship',
  countryName: 'Poland',
};

function mockJson(data: unknown, status = 200): void {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Response(JSON.stringify(data), { status }),
  );
}

describe('reverseGeocode', () => {
  it('success: maps city/country/admin1', async () => {
    mockJson(cityPayload);
    const res = await reverseGeocode(52.23, 21.01);
    expect(res).toEqual({ name: 'Warsaw', country: 'Poland', admin1: 'Masovian Voivodeship' });
  });

  it('falls back to locality when city is empty', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ locality: 'Little Village', countryName: 'United States' }), {
        status: 200,
      }),
    );
    const res = await reverseGeocode(41.85, -87.7);
    expect(res).toEqual({ name: 'Little Village', country: 'United States' });
  });

  it('no usable name → null', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ city: '', locality: '  ' }), { status: 200 }),
    );
    expect(await reverseGeocode(0, 0)).toBeNull();
  });

  it('HTTP error → null', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('nope', { status: 500 }),
    );
    expect(await reverseGeocode(52.23, 21.01)).toBeNull();
  });

  it('network failure → null (never throws)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('offline'));
    expect(await reverseGeocode(52.23, 21.01)).toBeNull();
  });

  it('the same rounded coordinates hit the cache — one request', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(new Response(JSON.stringify(cityPayload), { status: 200 }));
    await reverseGeocode(52.2301, 21.0102);
    await reverseGeocode(52.2302, 21.0101); // same 3-decimal cell
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an aborted external signal → null', async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await reverseGeocode(52.23, 21.01, controller.signal)).toBeNull();
  });
});