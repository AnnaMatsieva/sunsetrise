import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SkyTonight } from './SkyTonight';
import type { Location } from '../../types';

const warsaw: Location = { name: 'Warsaw', latitude: 52.23, longitude: 21.01 };

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
const kpFixture = [{ time_tag: '2026-09-02T09:18:00', kp_index: 2, estimated_kp: 2.0 }];
const stormKpFixture = [
  { time_tag: '2026-09-02T09:18:00', kp_index: 5, estimated_kp: 5.33 },
];

/** fetch router: SWPC endpoints serve fixtures, everything else → 404. */
function makeFetch(kp = kpFixture): ReturnType<typeof vi.fn> {
  return vi.fn(async (url: string) => {
    if (url.includes('xray-flares')) {
      return new Response(JSON.stringify(flaresFixture), { status: 200 });
    }
    if (url.includes('planetary_k_index')) {
      return new Response(JSON.stringify(kp), { status: 200 });
    }
    return new Response('', { status: 404 });
  });
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Row texts are split across spans — match against the <li> textContent. */
const rowWith = (re: RegExp): boolean =>
  screen.getAllByRole('listitem').some((li) => re.test(li.textContent ?? ''));
const expectRow = (re: RegExp): void => expect(rowWith(re)).toBe(true);
const expectNoRow = (re: RegExp): void => expect(rowWith(re)).toBe(false);

describe('SkyTonight', () => {
  it('shows the solar flare and Kp rows when SWPC answers', async () => {
    vi.stubGlobal('fetch', makeFetch());
    render(<SkyTonight location={warsaw} />);
    await waitFor(() => expect(rowWith(/Solar activity/)).toBe(true));
    expectRow(/Geomagnetic activity/);
    expectRow(/C1\.9/);
    expectRow(/Kp 2\.0/);
    // The fixture flare ended → not ongoing; the category is moderate (C).
    expectRow(/— moderate/);
    expectNoRow(/aurora/);
  });

  it('a storm-level Kp adds the aurora hint', async () => {
    vi.stubGlobal('fetch', makeFetch(stormKpFixture));
    render(<SkyTonight location={warsaw} />);
    await waitFor(() => expect(rowWith(/storm/)).toBe(true));
    expectRow(/aurora possible/);
  });

  it('SWPC failure → the space-weather rows are simply absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    render(<SkyTonight location={warsaw} />);
    await waitFor(() => expect(rowWith(/Stars tonight/)).toBe(true));
    expectNoRow(/Solar activity/);
    expectNoRow(/Geomagnetic activity/);
  });

  it('no location → no fetch at all', () => {
    const fetchMock = makeFetch();
    vi.stubGlobal('fetch', fetchMock);
    render(<SkyTonight location={null} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the stars row carries the Bortle estimate for the location', () => {
    vi.stubGlobal('fetch', makeFetch());
    // With cloud data the stars row shows the full breakdown incl. Bortle.
    render(<SkyTonight location={warsaw} cloudTonight={0.2} />);
    // Warsaw is a city — the estimate lands in the suburban/city bucket.
    expect(screen.getAllByRole('listitem').some((li) => /Bortle \d+ \(est\.\)/.test(li.textContent ?? ''))).toBe(true);
  });

  it('planet rows explain the magnitude bracket in plain words', () => {
    vi.stubGlobal('fetch', makeFetch());
    render(<SkyTonight location={warsaw} />);
    // Saturn (Sep 2026, mag ≈ 0.5) lands in the "bright" bracket.
    expect(rowWith(/mag -?\d\.\d \(bright — visible even in a city\)/)).toBe(true);
  });

  it('without a location the stars row has no Bortle suffix', () => {
    vi.stubGlobal('fetch', makeFetch());
    render(<SkyTonight location={null} />);
    expectNoRow(/Bortle/);
  });
});