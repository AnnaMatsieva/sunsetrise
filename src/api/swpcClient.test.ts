import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSpaceWeather, fetchFlares, fetchKp } from './swpcClient';
import { SpaceWeatherError } from './errors';

const FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json';
const KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('swpcClient', () => {
  let mock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    mock = vi.fn();
    vi.stubGlobal('fetch', mock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches both endpoints and parses them', async () => {
    mock.mockImplementation(async (url: string) =>
      url.includes('xray-flares')
        ? jsonResponse(flaresFixture)
        : jsonResponse(kpFixture),
    );
    const sw = await fetchSpaceWeather();
    expect(sw.flare!.lastMaxClass).toBe('C1.9');
    expect(sw.kp!.kp).toBeCloseTo(2.67);
    const urls = mock.mock.calls.map((c) => c[0] as string);
    expect(urls).toContain(FLARES_URL);
    expect(urls).toContain(KP_URL);
  });

  it('one endpoint failing → partial data, no throw', async () => {
    mock.mockImplementation(async (url: string) =>
      url.includes('xray-flares') ? jsonResponse(flaresFixture) : jsonResponse({}, 500),
    );
    const sw = await fetchSpaceWeather();
    expect(sw.flare!.lastMaxClass).toBe('C1.9');
    expect(sw.kp).toBeNull();
  });

  it('both endpoints failing → SpaceWeatherError', async () => {
    mock.mockResolvedValue(jsonResponse({}, 500));
    await expect(fetchSpaceWeather()).rejects.toBeInstanceOf(SpaceWeatherError);
  });

  it('a network TypeError → SpaceWeatherError (not NetworkError)', async () => {
    mock.mockRejectedValue(new TypeError('boom'));
    await expect(fetchSpaceWeather()).rejects.toBeInstanceOf(SpaceWeatherError);
  });

  it('an outer abort propagates as-is', async () => {
    // A fetch that honors its signal: rejects with AbortError on abort.
    mock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          const sig = init?.signal as AbortSignal | undefined;
          const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
          if (sig?.aborted) onAbort();
          else sig?.addEventListener('abort', onAbort);
        }),
    );
    const controller = new AbortController();
    const result = fetchSpaceWeather(controller.signal).catch((e) => e);
    controller.abort();
    expect(await result).toMatchObject({ name: 'AbortError' });
  });

  it('garbage JSON shapes → null fields, no throw', async () => {
    // A Response body reads once — hand out a fresh one per call.
    mock.mockImplementation(async () => jsonResponse('not what you think'));
    await expect(fetchFlares()).resolves.toBeNull();
    await expect(fetchKp()).resolves.toBeNull();
  });

  it('HTTP 500 → SpaceWeatherError with the status', async () => {
    mock.mockResolvedValue(jsonResponse({}, 503));
    const err = await fetchFlares().catch((e) => e);
    expect(err).toBeInstanceOf(SpaceWeatherError);
    expect(err.status).toBe(503);
  });

  it('the caller’s signal is forwarded to fetch', async () => {
    mock.mockResolvedValue(jsonResponse(flaresFixture));
    const controller = new AbortController();
    await fetchFlares(controller.signal);
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });
});