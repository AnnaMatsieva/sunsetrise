import type { ComfortInfo, HourlyData } from '../types';

/**
 * Standing-outside comfort at a sunrise/sunset event hour: apparent
 * temperature ("feels like") plus wind, read from the forecast's hourly
 * arrays. Both sunrise and sunset happen at dawn/dusk when it is coldest
 * relative to the day — the daily max/min tell nothing about what it feels
 * like standing outside for half an hour at the event itself.
 *
 * The event ISO is naive-local ("2026-08-20T19:50") — it must never go
 * through new Date(); the hour key is derived by slicing.
 */

/** Event ISO → the hour bucket key it falls into ("2026-08-20T19:50" → "…T19:00"). */
function eventHourKey(eventIso: string): string {
  return `${eventIso.slice(0, 13)}:00`;
}

/** Comfort message level by apparent temperature, °C. */
export function comfortLevel(feelsC: number): ComfortInfo['level'] {
  if (feelsC <= 0) return 'cold';
  if (feelsC <= 10) return 'chilly';
  if (feelsC <= 22) return 'mild';
  if (feelsC <= 30) return 'warm';
  return 'hot';
}

/**
 * Comfort at the event hour, or undefined when there is nothing to say
 * (polar event, or the response has no apparent-temperature data).
 */
export function buildComfort(
  hourly: HourlyData,
  eventIso: string | null,
): ComfortInfo | undefined {
  if (!eventIso || !hourly.apparent_temperature) return undefined;
  const idx = hourly.time.indexOf(eventHourKey(eventIso));
  if (idx < 0) return undefined;
  const feelsC = hourly.apparent_temperature[idx] ?? null;
  if (feelsC === null) return undefined;
  const windKmh = hourly.wind_speed_10m?.[idx] ?? null;
  return { feelsC, windKmh, level: comfortLevel(feelsC) };
}