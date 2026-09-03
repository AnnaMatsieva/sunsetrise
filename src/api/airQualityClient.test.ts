import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAirQuality, validateAirQuality } from './airQualityClient';
import { AirQualityError } from './errors';

function goodResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    latitude: 52.2,
    longitude: 21.0,
    timezone: 'Europe/Warsaw',
    utc_offset_seconds: 7200,
    hourly: {
      time: ['2026-09-03T00:00', '2026-09-03T01:00'],
      european_aqi: [39, 41],
      pm2_5: [7.4, 8],
      pm10: [11.6, 12],
      dust: [0, 0],
      aerosol_optical_depth: [0.2, 0.3],
      birch_pollen: [null, null],
      ...overrides,
    },
  };
}

describe('fetchAirQuality', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('success: returns the response; the URL contains the needed params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(goodResponse()), { status: 200 }));
    const data = await fetchAirQuality(52.2, 21.0);
    expect(data.hourly.european_aqi).toEqual([39, 41]);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).toContain('air-quality-api.open-meteo.com');
    expect(url).toContain('european_aqi');
    expect(url).toContain('pm2_5');
    expect(url).toContain('birch_pollen');
    expect(url).toContain('forecast_days=5');
    expect(url).toContain('timezone=auto');
    expect(url).not.toContain('domains=');
  });

  it('4xx → AirQualityError with status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 400 }));
    await expect(fetchAirQuality(40.7, -74)).rejects.toMatchObject({
      name: 'AirQualityError',
      status: 400,
    });
  });

  it('TypeError → AirQualityError without status', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('network down'));
    await expect(fetchAirQuality(52.2, 21.0)).rejects.toBeInstanceOf(AirQualityError);
  });

  it('the caller abort propagates unwrapped', async () => {
    const ac = new AbortController();
    ac.abort();
    vi.mocked(fetch).mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    await expect(fetchAirQuality(52.2, 21.0, ac.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('garbage JSON → AirQualityError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not json', { status: 200 }));
    await expect(fetchAirQuality(52.2, 21.0)).rejects.toBeInstanceOf(AirQualityError);
  });

  it('missing hourly.time → AirQualityError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ latitude: 1, hourly: {} }), { status: 200 }),
    );
    await expect(fetchAirQuality(52.2, 21.0)).rejects.toBeInstanceOf(AirQualityError);
  });
});

describe('validateAirQuality — lenient fields', () => {
  it('a valid (number|null)[] matching time is kept; wrong shapes are omitted', () => {
    const v = validateAirQuality(
      goodResponse({
        pm2_5: [1, 2, 3], // length mismatch → dropped
        dust: ['x', 0], // wrong type → dropped
        pm10: [5, 6],
      }),
    );
    expect(v.hourly.pm2_5).toBeUndefined();
    expect(v.hourly.dust).toBeUndefined();
    expect(v.hourly.pm10).toEqual([5, 6]);
    expect(v.hourly.european_aqi).toEqual([39, 41]);
  });

  it('defaults for missing scalars, so the shape stays usable', () => {
    const v = validateAirQuality({ hourly: { time: ['2026-09-03T00:00'] } });
    expect(v.utc_offset_seconds).toBe(0);
    expect(v.timezone).toBe('GMT');
    expect(v.hourly.european_aqi).toBeUndefined();
  });
});