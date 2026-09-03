import type { ForecastResponse, HourlyInput } from '../types';

const BASELINE: HourlyInput = {
  cloud_cover_low: 10,
  cloud_cover_mid: 45,
  cloud_cover_high: 50,
  cloud_cover: 55,
  relative_humidity_2m: 60,
  dew_point_2m: 12,
  temperature_2m: 20,
  visibility: 20000,
  precipitation: 0,
  surface_pressure: 1015,
  weather_code: 1,
};

/** Health extras are not part of the scorer input — they get their own baseline. */
const HEALTH_BASELINE = { uv_index: 5, apparent_temperature: 19, wind_speed_10m: 9 };
/** Health values overridable per hour, nulls allowed (degradation tests). */
export type HealthInput = {
  uv_index?: number | null;
  apparent_temperature?: number | null;
  wind_speed_10m?: number | null;
};

function pad(x: number): string {
  return String(x).padStart(2, '0');
}

/** Generates naive-local ISO hour strings, rolling over midnight. */
export function genTimes(n: number, startIso: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(startIso);
  if (!m) throw new Error('bad startIso');
  let y = Number(m[1]);
  let mo = Number(m[2]) - 1;
  let da = Number(m[3]);
  let h = Number(m[4]);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(`${y}-${pad(mo + 1)}-${pad(da)}T${pad(h)}:00`);
    h++;
    if (h === 24) {
      h = 0;
      const dt = new Date(Date.UTC(y, mo, da));
      dt.setUTCDate(dt.getUTCDate() + 1);
      y = dt.getUTCFullYear();
      mo = dt.getUTCMonth();
      da = dt.getUTCDate();
    }
  }
  return out;
}

const FIELDS: ReadonlyArray<keyof HourlyInput> = [
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

/**
 * Builds a valid ForecastResponse with the given number of hours and days.
 * overrides[hourIndex] — field overrides for a specific hour.
 * sunrise/sunset — arrays indexed by day; null → polar event.
 */
export function makeResponse(
  hours: number,
  days: number,
  opts: {
    startIso?: string;
    overrides?: Record<number, Partial<HourlyInput>>;
    /** Hour overrides for the health extras (uv_index, apparent_temperature, wind_speed_10m). */
    healthOverrides?: Record<number, HealthInput>;
    sunrise?: (string | null)[];
    sunset?: (string | null)[];
    /** Optional daily uv_index_max array (length = days). */
    uvIndexMax?: (number | null)[];
  } = {},
): ForecastResponse {
  const startIso = opts.startIso ?? '2024-06-15T20:00';
  const time = genTimes(hours, startIso);
  const make = (f: keyof HourlyInput): (number | null)[] =>
    time.map((_, i) => {
      const ov = opts.overrides?.[i];
      if (ov && ov[f] !== undefined) return (ov[f] ?? null) as number | null;
      return (BASELINE[f] ?? null) as number | null;
    });
  const makeHealth = (f: keyof typeof HEALTH_BASELINE): (number | null)[] =>
    time.map((_, i) => {
      const ov = opts.healthOverrides?.[i];
      if (ov && ov[f] !== undefined) return (ov[f] ?? null) as number | null;
      return HEALTH_BASELINE[f] ?? null;
    });

  const dailyTimes: string[] = [];
  const dt = new Date(Date.UTC(2024, 5, 15));
  for (let d = 0; d < days; d++) {
    dailyTimes.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`);
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  const sunrise = opts.sunrise ?? dailyTimes.map((_, i) => `${dailyTimes[i]}T05:1${i % 10}`);
  const sunset = opts.sunset ?? dailyTimes.map((_, i) => `${dailyTimes[i]}T21:1${i % 10}`);

  return {
    latitude: 52.2,
    longitude: 21.0,
    timezone: 'Europe/Warsaw',
    utc_offset_seconds: 7200,
    hourly: {
      time,
      cloud_cover_low: make('cloud_cover_low'),
      cloud_cover_mid: make('cloud_cover_mid'),
      cloud_cover_high: make('cloud_cover_high'),
      cloud_cover: make('cloud_cover'),
      relative_humidity_2m: make('relative_humidity_2m'),
      dew_point_2m: make('dew_point_2m'),
      temperature_2m: make('temperature_2m'),
      visibility: make('visibility'),
      precipitation: make('precipitation'),
      surface_pressure: make('surface_pressure'),
      weather_code: make('weather_code'),
      uv_index: makeHealth('uv_index'),
      apparent_temperature: makeHealth('apparent_temperature'),
      wind_speed_10m: makeHealth('wind_speed_10m'),
    },
    daily: {
      time: dailyTimes,
      sunrise,
      sunset,
      // Optional daily extras must stay absent unless explicitly requested,
      // so existing fixtures keep their old shape.
      ...(opts.uvIndexMax ? { uv_index_max: opts.uvIndexMax } : {}),
    },
  };
}

void FIELDS;