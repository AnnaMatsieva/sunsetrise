/**
 * Sunset/sunrise beauty scoring model — the core of the app.
 *
 * Principles (based on the published SunsetWx model, formula is closed-source):
 *  - cirrus (high) and altocumulus (mid) act as a "screen" catching the low sun's light;
 *    high is required for "Great", mid produces a "burning sky" in temperate latitudes;
 *  - low clouds (low) hurt — they block the sun and stay gray;
 *  - ~100% overcast due to LOW clouds plus precipitation → Poor;
 *    but solid cirrus (cirrostratus) is NOT penalized — that is a beautiful afterglow;
 *  - moderate humidity aids refraction, extremes hurt;
 *  - rising pressure after a front (clear sky + residual high clouds) is a plus.
 *
 * A per-hour score is a 0..1 composite; per event — a blend of the window's weighted
 * average (80%) and peak (20%). The window is asymmetric: for sunset the weight is
 * shifted toward the hours AFTER (afterglow), for sunrise — the hours BEFORE (pre-dawn glow).
 */

import type { EventKind, EventScore, HourlyData, HourlyInput } from '../types';
import { EVENT_WINDOW, MIN_VALID_BUCKETS } from '../constants/endpoints';
import { weatherCodeInfo } from '../constants/weatherCodes';
import { clamp01, smoothstep, trapezoid } from './smooth';
import { findEventHourIndex, windowIndex, windowOffsets, hourKey } from './windowing';
import { pressureTendency } from './pressure';
import { weightedAverageWithNulls, blendWithPeak } from './aggregate';
import { scoreToCategory } from './categorize';

/** H-3..H+3 window weights for sunset (afterglow — peak at +1, post-sunset 0.65). */
export const SUNSET_WEIGHTS = [0.05, 0.1, 0.2, 0.25, 0.25, 0.1, 0.05] as const;
/** Window weights for sunrise (pre-glow — peak at -1, pre-dawn 0.60). */
export const SUNRISE_WEIGHTS = [0.1, 0.25, 0.25, 0.2, 0.1, 0.05, 0.05] as const;

const PEAK_WEIGHT = 0.2;

function at(arr: (number | null)[], i: number): number | null {
  return arr[i] ?? null;
}

/**
 * Per-hour score 0..1 (or null when there is no data).
 * Core fields (the three cloud_cover values + humidity) are required — otherwise the hour is null.
 * Missing visibility and pressure tendency are treated as a neutral 0.5.
 */
export function computeHourScore(input: HourlyInput, dP: number | null): number | null {
  const {
    cloud_cover_low,
    cloud_cover_mid,
    cloud_cover_high,
    cloud_cover,
    relative_humidity_2m,
    visibility,
    precipitation,
    weather_code,
  } = input;

  // Required fields; a missing one → the hour is not scored (null beats a fake 0).
  if (
    cloud_cover_low === null ||
    cloud_cover_mid === null ||
    cloud_cover_high === null ||
    relative_humidity_2m === null
  ) {
    return null;
  }

  const high = trapezoid(cloud_cover_high, 5, 20, 80, 120);
  const mid = trapezoid(cloud_cover_mid, 15, 35, 55, 90);
  const low = 1 - smoothstep(20, 70, cloud_cover_low);
  const hum = trapezoid(relative_humidity_2m, 25, 45, 70, 90);
  const vis = visibility === null ? 0.5 : smoothstep(3000, 15000, visibility);
  const pres = dP === null ? 0.5 : trapezoid(dP, -4, 0, 3, 6);

  const composite =
    0.3 * high + 0.25 * mid + 0.2 * low + 0.1 * hum + 0.08 * vis + 0.07 * pres;

  // Precipitation + WMO code.
  const precip = precipitation ?? 0;
  const codePenalty = weatherCodeInfo(weather_code).penalty;
  const precipPenalty = clamp01(Math.min(0.95, codePenalty + Math.min(precip, 5) * 0.1));

  // "Gray sock": overcast is penalized only when it is due to LOW clouds.
  // Solid cirrus (lowRatio ~0) is not penalized.
  let overcastLow = 0;
  if (cloud_cover !== null && cloud_cover > 95) {
    const lowRatio = cloud_cover_low / Math.max(cloud_cover, 1);
    overcastLow = 0.7 * smoothstep(0.5, 0.8, lowRatio);
  }

  return clamp01(composite * (1 - precipPenalty) * (1 - overcastLow));
}

/**
 * Score of an event (sunrise/sunset) on a single day across the whole hourly array.
 * eventIso === null (polar night/white nights) → score null without invoking the scorer.
 */
export function computeEventScore(
  kind: EventKind,
  hourly: HourlyData,
  eventIso: string | null,
): EventScore {
  const len = hourly.time.length;
  const center = findEventHourIndex(hourly.time, eventIso);
  const offsets = windowOffsets(EVENT_WINDOW);
  const weights: readonly number[] = kind === 'sunset' ? SUNSET_WEIGHTS : SUNRISE_WEIGHTS;

  const hourScores: (number | null)[] = [];
  const hourKeys: string[] = [];

  if (center === null) {
    return {
      kind,
      score: null,
      category: null,
      eventTime: eventIso,
      hourScores,
      hourKeys,
    };
  }

  for (let k = 0; k < offsets.length; k++) {
    const offset = offsets[k]!;
    const idx = windowIndex(center, offset, len);
    if (idx === null) {
      hourScores.push(null);
      hourKeys.push('');
      continue;
    }
    const input: HourlyInput = {
      cloud_cover_low: at(hourly.cloud_cover_low, idx),
      cloud_cover_mid: at(hourly.cloud_cover_mid, idx),
      cloud_cover_high: at(hourly.cloud_cover_high, idx),
      cloud_cover: at(hourly.cloud_cover, idx),
      relative_humidity_2m: at(hourly.relative_humidity_2m, idx),
      dew_point_2m: at(hourly.dew_point_2m, idx),
      temperature_2m: at(hourly.temperature_2m, idx),
      visibility: at(hourly.visibility, idx),
      precipitation: at(hourly.precipitation, idx),
      surface_pressure: at(hourly.surface_pressure, idx),
      weather_code: at(hourly.weather_code, idx),
    };
    const dP = pressureTendency(hourly.surface_pressure, idx, 3);
    hourScores.push(computeHourScore(input, dP));
    hourKeys.push(hourKey(hourly.time[idx] ?? ''));
  }

  // Fewer than 2 valid buckets → not enough data.
  const validCount = hourScores.filter((s): s is number => s !== null).length;
  if (validCount < MIN_VALID_BUCKETS) {
    return { kind, score: null, category: null, eventTime: eventIso, hourScores, hourKeys };
  }

  const avg = weightedAverageWithNulls(hourScores, weights);
  const score = blendWithPeak(avg, hourScores, PEAK_WEIGHT);

  return {
    kind,
    score: score === null ? null : clamp01(score),
    category: scoreToCategory(score),
    eventTime: eventIso,
    hourScores,
    hourKeys,
  };
}