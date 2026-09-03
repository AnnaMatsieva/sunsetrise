import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchForecast } from './forecastClient';
import { makeResponse } from '../test/fixtures';
import { NetworkError, ForecastError } from './errors';

const good = makeResponse(8, 7);

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function setFetch(res: Response | Promise<Response>): void {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(res);
}

describe('fetchForecast', () => {
  it('success: returns the validated response, the URL contains the needed params', async () => {
    setFetch(new Response(JSON.stringify(good), { status: 200 }));
    const data = await fetchForecast(52.2, 21.0);
    expect(data.hourly.time.length).toBe(8);
    expect(data.daily.sunrise.length).toBe(7);

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('latitude=52.2');
    expect(calledUrl).toContain('cloud_cover_low');
    expect(calledUrl).toContain('cloud_cover_mid');
    expect(calledUrl).toContain('cloud_cover_high');
    expect(calledUrl).toContain('visibility');
    expect(calledUrl).toContain('surface_pressure');
    expect(calledUrl).toContain('past_days=1');
    expect(calledUrl).toContain('timezone=auto');
  });

  it('4xx → ForecastError with a status', async () => {
    setFetch(new Response('bad', { status: 400 }));
    await expect(fetchForecast(0, 0)).rejects.toMatchObject({ name: 'ForecastError' });
  });

  it('5xx → ForecastError', async () => {
    setFetch(new Response('err', { status: 503 }));
    await expect(fetchForecast(0, 0)).rejects.toBeInstanceOf(ForecastError);
  });

  it('network failure → NetworkError (not AbortError)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError('boom'));
    await expect(fetchForecast(0, 0)).rejects.toBeInstanceOf(NetworkError);
  });

  it('AbortError is rethrown, not wrapped', async () => {
    const abortErr = new DOMException('aborted', 'AbortError');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(abortErr);
    await expect(fetchForecast(0, 0)).rejects.toBe(abortErr);
  });

  it('garbage JSON → ForecastError', async () => {
    setFetch(new Response('not json', { status: 200 }));
    await expect(fetchForecast(0, 0)).rejects.toBeInstanceOf(ForecastError);
  });

  it('missing hourly → ForecastError', async () => {
    setFetch(new Response(JSON.stringify({ daily: { time: [], sunrise: [], sunset: [] } }), { status: 200 }));
    await expect(fetchForecast(0, 0)).rejects.toBeInstanceOf(ForecastError);
  });

  it('array length mismatch → ForecastError', async () => {
    const bad = makeResponse(8, 7);
    bad.hourly.cloud_cover_low = bad.hourly.cloud_cover_low.slice(0, 3);
    setFetch(new Response(JSON.stringify(bad), { status: 200 }));
    await expect(fetchForecast(0, 0)).rejects.toBeInstanceOf(ForecastError);
  });

  it('passes the signal to fetch', async () => {
    setFetch(new Response(JSON.stringify(good), { status: 200 }));
    const ac = new AbortController();
    await fetchForecast(1, 2, ac.signal);
    const opts = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(opts.signal).toBe(ac.signal);
  });
});