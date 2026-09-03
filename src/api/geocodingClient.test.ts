import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCities } from './geocodingClient';

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

const sample = {
  results: [
    { id: 1, name: 'Warsaw', latitude: 52.23, longitude: 21.01, country: 'Poland', admin1: 'Mazovia', country_code: 'PL' },
    { id: 2, name: 'Warsaw', latitude: 35.75, longitude: -90.7, country: 'United States', admin1: 'Arkansas', country_code: 'US' },
  ],
};

describe('searchCities', () => {
  it('a too-short query (<2) → [] with no request', async () => {
    const res = await searchCities('a');
    expect(res).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('success: maps the results', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    );
    const res = await searchCities('Warsaw');
    expect(res).toHaveLength(2);
    expect(res[0]?.name).toBe('Warsaw');
    expect(res[0]?.country).toBe('Poland');
    expect(res[1]?.country).toBe('United States');
  });

  it('no results → []', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const res = await searchCities('zxqw');
    expect(res).toEqual([]);
  });

  it('network failure → NetworkError', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('boom'));
    await expect(searchCities('Warsaw')).rejects.toMatchObject({ name: 'NetworkError' });
  });

  it('AbortError is rethrown', async () => {
    const err = new DOMException('aborted', 'AbortError');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    await expect(searchCities('Warsaw')).rejects.toBe(err);
  });

  it('the URL contains language=en and the query', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(sample), { status: 200 }),
    );
    await searchCities('Warsaw');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).toContain('language=en');
    expect(url).toContain('name=Warsaw');
  });
});