/** WMO weather interpretation code → English label + penalty for the score. */
export interface WeatherCodeInfo {
  label: string;
  /** 0..1 — how much the code "kills" the sunset/sunrise color. */
  penalty: number;
}

// Penalties match the table in the plan: clear codes 0, fog/precipitation/thunderstorm — higher.
const TABLE: Record<number, WeatherCodeInfo> = {
  0: { label: 'Clear sky', penalty: 0.0 },
  1: { label: 'Mainly clear', penalty: 0.0 },
  2: { label: 'Partly cloudy', penalty: 0.0 },
  3: { label: 'Overcast', penalty: 0.0 },
  45: { label: 'Fog', penalty: 0.6 },
  48: { label: 'Fog (rime)', penalty: 0.6 },
  51: { label: 'Light drizzle', penalty: 0.45 },
  53: { label: 'Drizzle', penalty: 0.5 },
  55: { label: 'Heavy drizzle', penalty: 0.6 },
  56: { label: 'Freezing drizzle', penalty: 0.55 },
  57: { label: 'Heavy freezing drizzle', penalty: 0.65 },
  61: { label: 'Slight rain', penalty: 0.45 },
  63: { label: 'Rain', penalty: 0.6 },
  65: { label: 'Heavy rain', penalty: 0.75 },
  66: { label: 'Freezing rain', penalty: 0.65 },
  67: { label: 'Heavy freezing rain', penalty: 0.75 },
  71: { label: 'Slight snowfall', penalty: 0.45 },
  73: { label: 'Snowfall', penalty: 0.55 },
  75: { label: 'Heavy snowfall', penalty: 0.7 },
  77: { label: 'Snow grains', penalty: 0.5 },
  80: { label: 'Rain shower', penalty: 0.5 },
  81: { label: 'Heavy rain shower', penalty: 0.65 },
  82: { label: 'Violent rain shower', penalty: 0.8 },
  85: { label: 'Snow shower', penalty: 0.65 },
  86: { label: 'Heavy snow shower', penalty: 0.8 },
  95: { label: 'Thunderstorm', penalty: 0.85 },
  96: { label: 'Thunderstorm with hail', penalty: 0.9 },
  99: { label: 'Heavy thunderstorm with hail', penalty: 0.95 },
};

const UNKNOWN: WeatherCodeInfo = { label: '—', penalty: 0.0 };

export function weatherCodeInfo(code: number | null): WeatherCodeInfo {
  if (code === null) return UNKNOWN;
  return TABLE[code] ?? UNKNOWN;
}

/** Handy list of codes by descending penalty — for the legend/debugging. */
export const WEATHER_CODES_DESC: ReadonlyArray<{ code: number; info: WeatherCodeInfo }> = (
  Object.entries(TABLE) as Array<[string, WeatherCodeInfo]>
)
  .map(([code, info]) => ({ code: Number(code), info }))
  .sort((a, b) => b.info.penalty - a.info.penalty);