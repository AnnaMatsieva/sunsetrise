// Shared application types. Strict, so the types prevent whole classes of bugs
// (especially noUncheckedIndexedAccess — access to hourly arrays requires a null-check).

/** Event quality category (badge/legend/color). */
export type QualityCategory = 'Poor' | 'Fair' | 'Good' | 'Great';

/** Event kind — sunrise or sunset. */
export type EventKind = 'sunrise' | 'sunset';

/** Geocoding result — a single found location. */
export interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
}

/** A user-selected location. */
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/**
 * Hourly fields needed by the scorer, at a single point in time.
 * All fields are nullable: Open-Meteo may return null for any of them.
 */
export interface HourlyInput {
  cloud_cover_low: number | null;
  cloud_cover_mid: number | null;
  cloud_cover_high: number | null;
  cloud_cover: number | null;
  relative_humidity_2m: number | null;
  dew_point_2m: number | null;
  temperature_2m: number | null;
  visibility: number | null;
  precipitation: number | null;
  surface_pressure: number | null;
  weather_code: number | null;
}

/** Hourly arrays of the forecast response (key → array of values). */
export interface HourlyData {
  time: string[];
  cloud_cover_low: (number | null)[];
  cloud_cover_mid: (number | null)[];
  cloud_cover_high: (number | null)[];
  cloud_cover: (number | null)[];
  relative_humidity_2m: (number | null)[];
  dew_point_2m: (number | null)[];
  temperature_2m: (number | null)[];
  visibility: (number | null)[];
  precipitation: (number | null)[];
  surface_pressure: (number | null)[];
  weather_code: (number | null)[];
  /** Health extras (not part of the sunset score): optional, leniently copied. */
  uv_index?: (number | null)[];
  apparent_temperature?: (number | null)[];
  wind_speed_10m?: (number | null)[];
}

/** Daily arrays: times and sunrise/sunset events (null in polar conditions),
 *  plus the daily weather aggregates feeding the "Today" card. All weather
 *  fields are optional — older/cached responses without them stay valid. */
export interface DailyData {
  time: string[];
  sunrise: (string | null)[];
  sunset: (string | null)[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  wind_gusts_10m_max?: (number | null)[];
  wind_direction_10m_dominant?: (number | null)[];
  uv_index_max?: (number | null)[];
}

/** Day weather summary for the "Today" card. "Now" values exist for today only. */
export interface DayWeather {
  /** Hourly temperature/humidity at the current hour — today only, else null. */
  tempNow: number | null;
  humidityNow: number | null;
  tMin: number | null;
  tMax: number | null;
  windMaxKmh: number | null;
  gustsKmh: number | null;
  /** Dominant wind direction, degrees from north, 0 = N, 90 = E. */
  windDirDeg: number | null;
  /** Chance of precipitation, %. */
  precipProb: number | null;
  precipSumMm: number | null;
  /** Mean cloud cover over tonight's hours (21:00–03:00), 0..1. */
  cloudNight: number | null;
  /** WMO weather interpretation code. */
  code: number | null;
  /** UV index at the current hour — today only, else null. */
  uvNow: number | null;
  /** Maximum UV index of the day. */
  uvMax: number | null;
  /** Part of the day when UV ≥ 3 (naive-local "HH:00" times), null when never. */
  uvWindow: { from: string; to: string } | null;
}

/** Full Open-Meteo forecast response. */
export interface ForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  hourly: HourlyData;
  daily: DailyData;
}

/** Score of a single event (sunrise or sunset) on a single day. */
export interface EventScore {
  kind: EventKind;
  /** 0..1 or null if the event doesn't happen (polar night/midnight sun) or data is missing. */
  score: number | null;
  category: QualityCategory | null;
  /** Event ISO time (naive-local) or null. */
  eventTime: string | null;
  /** Hourly scores of the H-3..H+3 window (may be null at the edges/for gaps). */
  hourScores: (number | null)[];
  /** Hourly `"YYYY-MM-DDTHH"` keys of the window, for the chart. */
  hourKeys: string[];
  /** Standing-outside comfort at the event hour (apparent temp + wind). */
  comfort?: ComfortInfo;
}

/** How it feels to stand outside at a given hour (apparent temperature + wind). */
export interface ComfortInfo {
  /** Apparent ("feels like") temperature at the event hour, °C. */
  feelsC: number | null;
  /** Wind at the event hour, km/h. */
  windKmh: number | null;
  level: 'cold' | 'chilly' | 'mild' | 'warm' | 'hot';
}

/** Score of a single day: sunrise + sunset. */
export interface DayScore {
  date: string; // YYYY-MM-DD
  sunrise: EventScore;
  sunset: EventScore;
  /** The day's best event (by score); null if both are null. */
  best: EventScore | null;
  /** Day weather summary — attached for today's day when the response has daily weather. */
  weather?: DayWeather;
}

/** Forecast loading status. */
export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ForecastState {
  status: LoadStatus;
  data: DayScore[] | null;
  error: string | null;
}

/** Pollen type keys of the Open-Meteo Air Quality API. */
export type PollenKey =
  | 'alder'
  | 'birch'
  | 'grass'
  | 'mugwort'
  | 'olive'
  | 'ragweed';

/** One pollen measurement with a low/moderate/high level (null → no data). */
export interface PollenInfo {
  key: PollenKey;
  /** Concentration at the current hour, grains/m³. */
  value: number | null;
  level: 'low' | 'moderate' | 'high' | null;
}

/** Shaped air-quality snapshot for the "Air & health" card. */
export interface DayAir {
  /** European AQI at the current hour (0..20+ scale). */
  aqi: number | null;
  /** Fine particulate matter at the current hour, µg/m³. */
  pm25: number | null;
  /** Coarse particulate matter at the current hour, µg/m³. */
  pm10: number | null;
  /** Dust (e.g. Saharan) at the current hour, µg/m³. */
  dust: number | null;
  /** Smoke flag from aerosol optical depth (null → unknown). */
  smoke: boolean | null;
  /** Empty outside Europe / outside season — the pollen block is hidden. */
  pollens: PollenInfo[];
  anyPollenHigh: boolean;
  /** The worst AQI of the 5 forecast days (and its date) — null when no data. */
  peakAqi: { date: string; aqi: number } | null;
}

/** Hourly arrays of the Air Quality response. All fields except `time` are lenient. */
export interface AirQualityHourly {
  time: string[];
  european_aqi?: (number | null)[];
  pm2_5?: (number | null)[];
  pm10?: (number | null)[];
  dust?: (number | null)[];
  aerosol_optical_depth?: (number | null)[];
  alder_pollen?: (number | null)[];
  birch_pollen?: (number | null)[];
  grass_pollen?: (number | null)[];
  mugwort_pollen?: (number | null)[];
  olive_pollen?: (number | null)[];
  ragweed_pollen?: (number | null)[];
}

/** Open-Meteo Air Quality response (leniently validated). */
export interface AirQualityResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  hourly: AirQualityHourly;
}