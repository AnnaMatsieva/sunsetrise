/** Base application error class with a human-readable message for the UI. */
export class AppError extends Error {
  constructor(
    message: string,
    /** HTTP status, when applicable. */
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Recognizes AbortError. We check by name, not via instanceof Error:
 * fetch throws DOMException('…','AbortError'), which in some environments
 * (jsdom) does NOT inherit from Error — an instanceof check would miss it.
 */
export function isAbortError(e: unknown): boolean {
  if (e === null || e === undefined) return false;
  const name = (e as { name?: unknown }).name;
  return name === 'AbortError';
}

/** The network is unavailable / the request never arrived. */
export class NetworkError extends AppError {
  constructor(message = 'Could not reach the weather service. Check your internet connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** The service returned an error (4xx/5xx) or data of an unexpected shape. */
export class ForecastError extends AppError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = 'ForecastError';
  }
}

/** Geocoding failed. */
export class GeocodingError extends AppError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = 'GeocodingError';
  }
}

/** NOAA SWPC (space weather) failed. A bonus data source — the UI hides the rows. */
export class SpaceWeatherError extends AppError {
  constructor(message = 'Could not reach the space weather service.', status?: number) {
    super(message, status);
    this.name = 'SpaceWeatherError';
  }
}

/** The air-quality service failed. The UI hides the whole card, the page stays. */
export class AirQualityError extends AppError {
  constructor(message = 'Could not reach the air quality service.', status?: number) {
    super(message, status);
    this.name = 'AirQualityError';
  }
}