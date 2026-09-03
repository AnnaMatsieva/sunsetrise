import type { DayScore, DayWeather, EventScore, ForecastResponse, HourlyData } from '../types';
import { computeEventScore } from './scoring';
import { buildComfort } from './comfort';
import { sunDangerWindow } from './uv';
import { todayStr } from './date';

/** Picks the best event of the day (a null score ranks worse than any). */
function pickBest(a: EventScore, b: EventScore): EventScore | null {
  const sa = a.score;
  const sb = b.score;
  if (sa === null && sb === null) return null;
  if (sa === null) return b;
  if (sb === null) return a;
  return sa >= sb ? a : b;
}

/**
 * Mean cloud cover over tonight's observing hours (21:00–03:00 local): today's
 * late evening plus the early hours of tomorrow. null when the hourly cloud
 * data does not cover the window.
 */
function nightCloudCover(hourly: HourlyData, today: string, tomorrow: string): number | null {
  const hours = [
    ...[21, 22, 23].map((h) => `${today}T${String(h).padStart(2, '0')}:00`),
    ...[0, 1, 2, 3].map((h) => `${tomorrow}T${String(h).padStart(2, '0')}:00`),
  ];
  const values = hours
    .map((k) => hourly.time.indexOf(k))
    .map((i) => (i >= 0 ? hourly.cloud_cover[i] ?? null : null))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length / 100;
}

/** Tomorrow's "YYYY-MM-DD" for the night window that follows `today`. */
function tomorrowStr(today: string): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + 1);
  return todayStr(dt);
}

/**
 * Day weather for a forecast day. Daily aggregates come straight from the
 * response. The "now" temperature/humidity and tonight's cloud cover are only
 * meaningful for the user's today — for the following days they stay null
 * (there is no "current hour" in a forecast day, and each day's night window
 * would need its own hourly slice).
 * `now` is injectable so tests stay deterministic.
 */
export function buildDayWeather(
  resp: ForecastResponse,
  dayIndex: number,
  now: Date = new Date(),
): DayWeather | undefined {
  const { daily, hourly } = resp;
  if (daily.temperature_2m_max === undefined && daily.weather_code === undefined) return undefined;

  let tempNow: number | null = null;
  let humidityNow: number | null = null;
  let uvNow: number | null = null;
  let cloudNight: number | null = null;
  const isToday = (daily.time[dayIndex] ?? '') === todayStr(now);
  if (isToday) {
    // "Now" values: the hourly bucket of the current hour. If the hour is
    // missing (location in a different timezone), they stay null.
    const today = todayStr(now);
    const key = `${today}T${String(now.getHours()).padStart(2, '0')}:00`;
    const nowIdx = hourly.time.indexOf(key);
    tempNow = nowIdx >= 0 ? hourly.temperature_2m[nowIdx] ?? null : null;
    humidityNow = nowIdx >= 0 ? hourly.relative_humidity_2m[nowIdx] ?? null : null;
    uvNow = nowIdx >= 0 ? hourly.uv_index?.[nowIdx] ?? null : null;
    cloudNight = nightCloudCover(hourly, today, tomorrowStr(today));
  }

  // Daily max UV: the mean of the daylight hours is not what matters for
  // "how dangerous is the sun today" — the peak is.
  let uvMax: number | null = null;
  if (hourly.uv_index) {
    const dayKey = daily.time[dayIndex] ?? '';
    for (let i = 0; i < hourly.time.length; i++) {
      if ((hourly.time[i] ?? '').slice(0, 10) !== dayKey) continue;
      const v = hourly.uv_index[i] ?? null;
      if (v !== null && (uvMax === null || v > uvMax)) uvMax = v;
    }
  }

  return {
    tempNow,
    humidityNow,
    tMin: daily.temperature_2m_min?.[dayIndex] ?? null,
    tMax: daily.temperature_2m_max?.[dayIndex] ?? null,
    windMaxKmh: daily.wind_speed_10m_max?.[dayIndex] ?? null,
    gustsKmh: daily.wind_gusts_10m_max?.[dayIndex] ?? null,
    windDirDeg: daily.wind_direction_10m_dominant?.[dayIndex] ?? null,
    precipProb: daily.precipitation_probability_max?.[dayIndex] ?? null,
    precipSumMm: daily.precipitation_sum?.[dayIndex] ?? null,
    cloudNight,
    code: daily.weather_code?.[dayIndex] ?? null,
    uvNow,
    uvMax,
    uvWindow: sunDangerWindow(hourly.time, hourly.uv_index, daily.time[dayIndex] ?? ''),
  };
}

/** Turns an Open-Meteo response into an array of per-day scores. */
export function buildForecastScores(resp: ForecastResponse, now: Date = new Date()): DayScore[] {
  const { daily, hourly } = resp;
  const days: DayScore[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i] ?? '';
    const sunriseIso = daily.sunrise[i] ?? null;
    const sunsetIso = daily.sunset[i] ?? null;
    const sunrise = computeEventScore('sunrise', hourly, sunriseIso);
    const sunset = computeEventScore('sunset', hourly, sunsetIso);
    // Comfort attaches to both events (undefined for polar events / no data).
    const comfortRise = buildComfort(hourly, sunrise.eventTime);
    if (comfortRise) sunrise.comfort = comfortRise;
    const comfortSet = buildComfort(hourly, sunset.eventTime);
    if (comfortSet) sunset.comfort = comfortSet;
    // Weather attaches to every day; the "now"/tonight values are today-only.
    const weather = buildDayWeather(resp, i, now);
    const day: DayScore = { date, sunrise, sunset, best: pickBest(sunrise, sunset) };
    if (weather) day.weather = weather;
    days.push(day);
  }
  return days;
}

/** Index of the best day in the period by its best event (null days are skipped). */
export function bestDayIndex(days: DayScore[]): number | null {
  let bestIdx: number | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < days.length; i++) {
    const s = days[i]?.best?.score;
    if (s === null || s === undefined) continue;
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx;
}