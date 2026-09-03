/**
 * Local date (no time) for "did the day pass or not" comparisons.
 *
 * Open-Meteo returns daily.time as "YYYY-MM-DD" in the location's local tz (timezone=auto),
 * while we need to compare against "today" in the browser's tz — the user confirms the
 * beauty of their past day by their own calendar. The comparison is string-based:
 * "YYYY-MM-DD" matches chronology lexicographically, so Date objects are unnecessary.
 */

/** The browser's local today date as "YYYY-MM-DD". */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** true if the date (YYYY-MM-DD) is strictly earlier than today (defaults to today). */
export function isPastDay(date: string, today: string = todayStr()): boolean {
  return date < today;
}

/**
 * How many days from today to date (date − today). Negative for past days.
 * Compared via Date.UTC so it does not depend on the browser's timezone.
 */
export function daysAhead(date: string, today: string = todayStr()): number {
  const toMs = (s: string): number => {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7)) - 1;
    const d = Number(s.slice(8, 10));
    return Date.UTC(y, m, d);
  };
  return Math.round((toMs(date) - toMs(today)) / 86_400_000);
}