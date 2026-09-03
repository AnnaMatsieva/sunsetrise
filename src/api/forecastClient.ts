import type { DailyData, ForecastResponse, HourlyData } from '../types';
import {
  FORECAST_URL,
  HOURLY_VARS,
  DAILY_VARS,
  PAST_DAYS,
  DEFAULT_FORECAST_DAYS,
} from '../constants/endpoints';
import { ForecastError, NetworkError, isAbortError } from './errors';

const HOURLY_FIELDS: ReadonlyArray<keyof HourlyData> = [
  'time',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'cloud_cover',
  'relative_humidity_2m',
  'dew_point_2m',
  'temperature_2m',
  'visibility',
  'precipitation',
  'surface_pressure',
  'weather_code',
];

/** Optional hourly health fields (UV, comfort) copied leniently, like daily extras. */
const HOURLY_EXTRA_FIELDS = [
  'uv_index',
  'apparent_temperature',
  'wind_speed_10m',
] as const;

/** Copies one optional hourly field if valid, else omits it (see copyDaily). */
function copyHourlyExtra(
  hourly: Record<string, unknown>,
  time: unknown[],
  field: string,
): (number | null)[] | undefined {
  const v = hourly[field];
  if (!isArrayOfNumOrNull(v) || v.length !== time.length) return undefined;
  return v;
}

function isArrayOfNumOrNull(v: unknown): v is (number | null)[] {
  return Array.isArray(v) && v.every((x) => x === null || typeof x === 'number');
}

/** Light validation of the response shape — so we don't render zeros from a garbage/truncated response. */
export function validateForecast(data: unknown): ForecastResponse {
  if (!data || typeof data !== 'object') {
    throw new ForecastError('The weather service returned a malformed response.');
  }
  const d = data as Record<string, unknown>;
  const hourly = d['hourly'] as Record<string, unknown> | undefined;
  const daily = d['daily'] as Record<string, unknown> | undefined;
  if (!hourly || !daily) {
    throw new ForecastError('The response is missing hourly or daily data.');
  }
  const time = hourly['time'];
  if (!Array.isArray(time) || time.length === 0) {
    throw new ForecastError('The response is missing the hourly time array.');
  }
  for (const f of HOURLY_FIELDS) {
    if (f === 'time') continue;
    if (!isArrayOfNumOrNull(hourly[f])) {
      throw new ForecastError(`The hourly.${f} field has an invalid format.`);
    }
    if ((hourly[f] as unknown[]).length !== time.length) {
      throw new ForecastError(`The length of hourly.${f} does not match time.`);
    }
  }
  if (!Array.isArray(daily['time']) || !Array.isArray(daily['sunrise']) || !Array.isArray(daily['sunset'])) {
    throw new ForecastError('The daily data is incomplete.');
  }

  return {
    latitude: d['latitude'] as number,
    longitude: d['longitude'] as number,
    timezone: d['timezone'] as string,
    utc_offset_seconds: d['utc_offset_seconds'] as number,
    hourly: {
      time: hourly['time'] as string[],
      cloud_cover_low: hourly['cloud_cover_low'] as (number | null)[],
      cloud_cover_mid: hourly['cloud_cover_mid'] as (number | null)[],
      cloud_cover_high: hourly['cloud_cover_high'] as (number | null)[],
      cloud_cover: hourly['cloud_cover'] as (number | null)[],
      relative_humidity_2m: hourly['relative_humidity_2m'] as (number | null)[],
      dew_point_2m: hourly['dew_point_2m'] as (number | null)[],
      temperature_2m: hourly['temperature_2m'] as (number | null)[],
      visibility: hourly['visibility'] as (number | null)[],
      precipitation: hourly['precipitation'] as (number | null)[],
      surface_pressure: hourly['surface_pressure'] as (number | null)[],
      weather_code: hourly['weather_code'] as (number | null)[],
      // Health extras are optional: an older/cached response without them
      // stays valid, and a malformed one degrades to an omitted field.
      ...copyHourlyExtras(hourly, time),
    },
    daily: {
      time: daily['time'] as string[],
      sunrise: daily['sunrise'] as (string | null)[],
      sunset: daily['sunset'] as (string | null)[],
      // Daily weather extras are optional: an older/cached response without
      // them stays valid, and a malformed one degrades to nulls, not an error.
      ...copyDailyExtras(daily),
    },
  };
}

/** Optional daily weather fields copied into the response when valid. */
const DAILY_WEATHER_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'weather_code',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
  'uv_index_max',
] as const;

function copyDailyExtras(daily: Record<string, unknown>): Partial<DailyData> {
  const out: Record<string, unknown> = {};
  for (const f of DAILY_WEATHER_FIELDS) {
    const v = copyDaily(daily, f);
    if (v) out[f] = v;
  }
  return out;
}

function copyHourlyExtras(
  hourly: Record<string, unknown>,
  time: unknown[],
): Partial<HourlyData> {
  const out: Record<string, unknown> = {};
  for (const f of HOURLY_EXTRA_FIELDS) {
    const v = copyHourlyExtra(hourly, time, f);
    if (v) out[f] = v;
  }
  return out;
}

/**
 * Copies one optional daily field if it is a valid (number|null)[] matching
 * daily.time; returns undefined when absent/garbled so the field is omitted
 * rather than rendered as garbage.
 */
function copyDaily(
  daily: Record<string, unknown>,
  field: string,
): (number | null)[] | undefined {
  const v = daily[field];
  if (!isArrayOfNumOrNull(v) || v.length !== (daily['time'] as unknown[]).length) return undefined;
  return v;
}

/** Fetches the forecast for DEFAULT_FORECAST_DAYS + PAST_DAYS days. Throws AppError. */
export async function fetchForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(DEFAULT_FORECAST_DAYS),
  });
  const url = `${FORECAST_URL}?${params.toString()}`;

  let res: Response;
  const init: RequestInit = {};
  if (signal) init.signal = signal;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new NetworkError();
  }

  if (!res.ok) {
    throw new ForecastError(`The weather service returned error ${res.status}.`, res.status);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ForecastError('Could not parse the weather service response.');
  }
  return validateForecast(data);
}