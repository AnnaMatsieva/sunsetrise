/**
 * Formatting for naive-local ISO strings WITHOUT converting to Date via the local timezone.
 * Open-Meteo's naive-local strings must not go through new Date(str).getTime() —
 * the browser would apply its own timezone and shift the time. So we parse the
 * strings manually; the weekday uses a UTC Date.UTC(...) construction.
 *
 * Month/weekday names are English-only.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2024-06-15T21:18" → "21:18". null → "—". Time is not localized. */
export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return iso.slice(11, 16);
}

/** "2024-06-15" → "Sat 15 Jun". */
export function formatDay(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${day} ${MONTHS[month]}`;
}

/** A real Date → "14:03" in UTC clock — for NOAA timestamps shown worldwide. */
export function formatUtcClock(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** 0..1 → "0..100". null → "—". The number is not localized. */
export function formatPercent(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '—';
  return String(Math.round(score * 100));
}

const COMPASS_16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** Wind direction in degrees (0=N, 90=E) → a 16-point compass name. null → "—". */
export function compassPoint(deg: number | null): string {
  if (deg === null || Number.isNaN(deg)) return '—';
  return COMPASS_16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}