import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildForecastScores } from './forecast';
import { validateForecast } from '../api/forecastClient';

/**
 * Regression test on a real Open-Meteo response for Warsaw (2026-08-20, past_days=1).
 * Guards against the main source of bugs — timezone mismatch: if the sunset window
 * landed on the wrong hour, a beautiful sunset with cirrus clouds would be scored
 * "Poor" (as actually happened to a user on an outdated build).
 *
 * The fixture is a live api.open-meteo.com response (timezone=auto → Europe/Warsaw, UTC+2).
 */
function loadFixture(): unknown {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', 'api', '__fixtures__', 'warsaw-2026-08-20.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('regression: real Warsaw forecast for 2026-08-20', () => {
  const days = buildForecastScores(validateForecast(loadFixture()));

  it('eight days (1 past + 7 forecast)', () => {
    expect(days).toHaveLength(8);
    expect(days[0]?.date).toBe('2026-08-20');
  });

  it('event time is taken directly from daily.sunrise/sunset (no shift)', () => {
    expect(days[0]?.sunrise.eventTime).toBe('2026-08-20T05:27');
    expect(days[0]?.sunset.eventTime).toBe('2026-08-20T19:50');
  });

  it('sunset with cirrus in the golden hour — Good, not Poor', () => {
    const sunset = days[0]?.sunset;
    expect(sunset).toBeDefined();
    expect(sunset?.score).not.toBeNull();
    // Cirrus (high 68–82%) right at sunset + clear sky before → the model should love this.
    expect(sunset?.score).toBeGreaterThanOrEqual(0.5);
    expect(sunset?.category).not.toBe('Poor');
  });

  it('the central sunset bucket falls on the 19:00 hour (event 19:50)', () => {
    const sunset = days[0]?.sunset;
    // hourKeys[3] — the event bucket (offset 0), should be 2026-08-20T19.
    expect(sunset?.hourKeys[3]).toBe('2026-08-20T19');
  });
});