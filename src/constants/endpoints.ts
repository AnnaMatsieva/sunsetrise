/** Base Open-Meteo URLs (no keys, open CORS). */
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
/** Reverse geocoding (coordinates → city), free client endpoint, no key. */
export const REVERSE_GEOCODING_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

/** NOAA Space Weather Prediction Center — open JSON services, no key, CORS '*'. */
export const SWPC_FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json';
export const SWPC_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';

/** Open-Meteo Air Quality API — CAMS data, no key, open CORS. */
export const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Hourly air-quality variables. Pollen is Europe-only: elsewhere it comes back null (no error). */
export const AQ_HOURLY_VARS = [
  'european_aqi',
  'pm2_5',
  'pm10',
  'dust',
  'aerosol_optical_depth',
  'alder_pollen',
  'birch_pollen',
  'grass_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'ragweed_pollen',
] as const;

/** AQ forecast horizon (pollen itself only reaches 4 days). */
export const AQ_FORECAST_DAYS = 5;

/** Hourly variables needed by the scorer. */
export const HOURLY_VARS = [
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
  /** Health extras: UV danger, event-hour comfort. */
  'uv_index',
  'apparent_temperature',
  'wind_speed_10m',
] as const;

/** Daily variables. Weather extras feed the "Today" card (leniently validated). */
export const DAILY_VARS = [
  'sunrise',
  'sunset',
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

export const DEFAULT_FORECAST_DAYS = 7;
/** +1 day into the past so the pressure trend is computed for hour zero of the forecast. */
export const PAST_DAYS = 1;

/** Window around the event in hours (H±WINDOW → H-3..H+3). */
export const EVENT_WINDOW = 3;
/** Minimum valid buckets in the window, otherwise the score is null. */
export const MIN_VALID_BUCKETS = 2;

/**
 * Forecast days from this horizon onward (counting from today) are considered
 * less reliable — Open-Meteo is most accurate 1–3 days ahead; uncertainty grows beyond that.
 * Such cards get a dim "less confident" label so we don't overpromise.
 */
export const LOW_CONFIDENCE_DAYS_AHEAD = 5;