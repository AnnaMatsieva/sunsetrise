/**
 * Time alignment — the main source of bugs.
 *
 * With timezone=auto Open-Meteo returns hourly.time[] and daily.sunrise/sunset as
 * naive-local ISO strings WITHOUT a timezone offset (e.g. "2024-06-15T21:00").
 * So matching is done by the string key "YYYY-MM-DDTHH", NOT via
 * new Date().getTime(): a browser in a foreign tz would shift all indices and
 * the window would land on the wrong part of the day.
 */

import { EVENT_WINDOW } from '../constants/endpoints';

/** Hour key from an ISO string: "2024-06-15T21:18" → "2024-06-15T21". */
export function hourKey(iso: string): string {
  return iso.slice(0, 13);
}

/**
 * Index of the hour in hourly.time[] containing the event (rounded down to the hour).
 * Returns null if the event is null (polar night/white nights) or not found.
 */
export function findEventHourIndex(times: string[], eventIso: string | null): number | null {
  if (eventIso === null) return null;
  const key = hourKey(eventIso);
  for (let i = 0; i < times.length; i++) {
    if (hourKey(times[i] ?? '') === key) return i;
  }
  return null;
}

/**
 * Absolute hour index by offset from the center; null if it falls outside the array.
 * Offsets are flat indices over the whole array (no wraparound across the day boundary),
 * which is correct at midnight boundaries and at the end of the 7-day array.
 */
export function windowIndex(center: number, offset: number, len: number): number | null {
  const idx = center + offset;
  if (idx < 0 || idx >= len) return null;
  return idx;
}

/** List of window offsets: [-EVENT_WINDOW .. +EVENT_WINDOW]. */
export function windowOffsets(window: number = EVENT_WINDOW): number[] {
  const out: number[] = [];
  for (let o = -window; o <= window; o++) out.push(o || 0);
  return out;
}