import { describe, it, expect } from 'vitest';
import {
  SUPERMOON_MAX_KM,
  formatMoonTime,
  moonDayFor,
  monthMoonCalendar,
  monthMoonEvents,
  phaseIcon,
  phaseName,
} from './moon';
import type { Location } from '../types';

const warsaw: Location = { name: 'Warsaw', latitude: 52.2, longitude: 21.0 };
const svalbard: Location = { name: 'Longyearbyen', latitude: 78.22, longitude: 15.65 };
const usEast: Location = { name: 'Cleveland', latitude: 41.5, longitude: -81.7 };

describe('phaseIcon / phaseName', () => {
  it('maps phase angle quarters to icons', () => {
    expect(phaseIcon(0)).toBe('🌑');
    // The icon boundary is the midpoint (22.5°), not the exact quarter angle.
    expect(phaseIcon(22.4)).toBe('🌑');
    expect(phaseIcon(22.5)).toBe('🌒');
    expect(phaseIcon(180)).toBe('🌕');
    expect(phaseIcon(337.5)).toBe('🌑');
    expect(phaseIcon(359.9)).toBe('🌑');
    // Out-of-range angles wrap.
    expect(phaseIcon(405)).toBe(phaseIcon(45));
    expect(phaseIcon(-45)).toBe(phaseIcon(315));
  });

  it('names match icons', () => {
    expect(phaseName(0)).toBe('new');
    expect(phaseName(90)).toBe('firstQuarter');
    expect(phaseName(180)).toBe('full');
    expect(phaseName(270)).toBe('thirdQuarter');
  });
});

describe('formatMoonTime', () => {
  it('formats an instant in the local timezone', () => {
    const d = new Date(2026, 0, 3, 14, 5); // local — by construction
    expect(formatMoonTime(d)).toBe('14:05');
  });

  it('null → dash', () => {
    expect(formatMoonTime(null)).toBe('—');
  });
});

describe('monthMoonCalendar', () => {
  it('returns 42 cells starting on the Monday on/before the 1st', () => {
    const days = monthMoonCalendar(2026, 2, warsaw); // March 2026 starts on Sunday
    expect(days).toHaveLength(42);
    const first = new Date(2026, 2, 1);
    expect(first.getDay()).toBe(0); // Sunday — 1 leading cell expected
    expect(days[0]!.date).toBe('2026-02-23'); // the Monday before
    expect(days[0]!.inMonth).toBe(false);
    expect(days[6]!.date).toBe('2026-03-01');
    expect(days[6]!.inMonth).toBe(true);
  });

  it('marks exactly one full-moon and one new-moon day in March 2026', () => {
    // Full moon 2026-03-03 11:33 UTC, new moon 2026-03-19 01:23 UTC — both far
    // from local midnight, so the local-day bucket is timezone-stable.
    const days = monthMoonCalendar(2026, 2, warsaw);
    const full = days.filter((d) => d.isFullMoon && d.inMonth);
    const neu = days.filter((d) => d.isNewMoon && d.inMonth);
    expect(full).toHaveLength(1);
    expect(full[0]!.date).toBe('2026-03-03');
    expect(full[0]!.phaseIcon).toBe('🌕');
    expect(neu).toHaveLength(1);
    expect(neu[0]!.date).toBe('2026-03-19');
  });

  it('phases are sampled daily: illumination peaks near the full moon', () => {
    const days = monthMoonCalendar(2026, 2, warsaw);
    const mar3 = days.find((d) => d.date === '2026-03-03')!;
    const mar18 = days.find((d) => d.date === '2026-03-18')!;
    expect(mar3.illumination).toBeGreaterThan(0.95);
    expect(mar3.phaseName).toBe('full');
    expect(mar18.illumination).toBeLessThan(0.05);
  });

  it('without a location rise/set stay null but phases are complete', () => {
    const days = monthMoonCalendar(2026, 2, null);
    expect(days.every((d) => d.moonrise === null && d.moonset === null)).toBe(true);
    expect(days.filter((d) => d.isFullMoon && d.inMonth)).toHaveLength(1);
    expect(days.every((d) => d.phaseIcon.length === 2)).toBe(true);
  });

  it('with a location most days get rise/set, polar gaps tolerated', () => {
    const days = monthMoonCalendar(2026, 0, warsaw); // January 2026
    const withAny = days.filter((d) => d.moonrise !== null || d.moonset !== null);
    expect(withAny.length).toBeGreaterThan(20);

    // Svalbard in winter — long polar windows; must not throw and may be sparse.
    const polar = monthMoonCalendar(2025, 11, svalbard); // December 2025
    expect(polar).toHaveLength(42);
  });
});

describe('monthMoonEvents', () => {
  it('finds the total lunar eclipse of 2026-03-03', () => {
    const ev = monthMoonEvents(2026, 2, warsaw);
    const lunar = ev.lunarEclipses.filter((e) => e.timeUtc.toISOString().startsWith('2026-03-03'));
    expect(lunar).toHaveLength(1);
    expect(lunar[0]!.kind).toBe('total');
    expect(lunar[0]!.obscuration).toBeGreaterThan(0);
    // The eclipse peak IS the full moon of that month.
    expect(ev.fullMoons.some((f) => f.timeUtc.toISOString().startsWith('2026-03-03'))).toBe(true);
  });

  it('finds the total solar eclipse of 2026-08-12 and knows Warsaw cannot see it', () => {
    const ev = monthMoonEvents(2026, 7, warsaw);
    const solar = ev.solarEclipses.filter((e) => e.timeUtc.toISOString().startsWith('2026-08-12'));
    expect(solar).toHaveLength(1);
    expect(solar[0]!.kind).toBe('total');
    expect(solar[0]!.visibleHere).toBe(false);
  });

  it('solar eclipse visibility: without a location it is null, from the US path it is true', () => {
    const none = monthMoonEvents(2026, 7, null);
    const aug = none.solarEclipses.find((e) => e.timeUtc.toISOString().startsWith('2026-08-12'));
    expect(aug?.visibleHere).toBeNull();

    // The April 8, 2024 total solar eclipse crossed the US east coast.
    const usa = monthMoonEvents(2024, 3, usEast);
    const visible = usa.solarEclipses.find((e) => e.timeUtc.toISOString().startsWith('2024-04-08'));
    expect(visible?.visibleHere).toBe(true);
  });

  it('flags the October 2024 supermoon and not a distant full moon', () => {
    const oct = monthMoonEvents(2024, 9, warsaw); // full moon 2024-10-17, ~357 000 km
    const supermoon = oct.supermoons.find((s) => s.timeUtc.toISOString().startsWith('2024-10-17'));
    expect(supermoon).toBeDefined();
    expect(supermoon!.distKm).toBeLessThan(SUPERMOON_MAX_KM);

    const may = monthMoonEvents(2025, 4, warsaw); // full moon 2025-05-12 near apogee
    expect(may.supermoons).toHaveLength(0);
    expect(may.fullMoons.some((f) => f.timeUtc.toISOString().startsWith('2025-05-12'))).toBe(true);
  });

  it('a month without events returns empty lists without throwing', () => {
    const ev = monthMoonEvents(2027, 3, warsaw); // April 2027
    expect(ev.lunarEclipses).toHaveLength(0);
    expect(ev.solarEclipses).toHaveLength(0);
    expect(ev.fullMoons.length).toBeGreaterThanOrEqual(1);
    expect(ev.newMoons.length).toBeGreaterThanOrEqual(1);
  });
});

describe('moonDayFor', () => {
  it('agrees with the calendar cell for the same day', () => {
    const single = moonDayFor(new Date(2026, 2, 3), warsaw); // full-moon + eclipse day
    const cell = monthMoonCalendar(2026, 2, warsaw).find((d) => d.date === '2026-03-03')!;
    expect(single.isFullMoon).toBe(true);
    expect(single.phaseName).toBe('full');
    // Two independent searches converge to the same instant, but not bitwise —
    // the root-finder's iterations may differ by a few milliseconds.
    expect(Math.abs((single.moonrise?.getTime() ?? 0) - (cell.moonrise?.getTime() ?? 0))).toBeLessThan(1000);
    expect(Math.abs((single.moonset?.getTime() ?? 0) - (cell.moonset?.getTime() ?? 0))).toBeLessThan(1000);
  });

  it('without a location the phases stay, the times are null', () => {
    const single = moonDayFor(new Date(2026, 2, 3), null);
    expect(single.phaseName).toBe('full');
    expect(single.isFullMoon).toBe(true);
    expect(single.moonrise).toBeNull();
    expect(single.moonset).toBeNull();
  });

  it('flags the October 17, 2024 supermoon', () => {
    const single = moonDayFor(new Date(2024, 9, 17), warsaw);
    expect(single.isFullMoon).toBe(true);
    expect(single.supermoon).toBe(true);
    // A far-from-perigee full moon must NOT be flagged.
    const ordinary = moonDayFor(new Date(2025, 4, 12), warsaw); // near apogee
    expect(ordinary.isFullMoon).toBe(true);
    expect(ordinary.supermoon).toBe(false);
  });

  it('a day without a quarter event has no flags and no supermoon', () => {
    const single = moonDayFor(new Date(2026, 2, 10), warsaw);
    expect(single.isFullMoon).toBe(false);
    expect(single.isNewMoon).toBe(false);
    expect(single.supermoon).toBe(false);
  });
});