import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { makeResponse } from './test/fixtures';

const forecastResp = makeResponse(192, 7, { startIso: '2024-06-15T00:00' });

/** Minimal air-quality payload: today's 24 hourly buckets, current hour included. */
function aqResp(): Record<string, unknown> {
  const p = (x: number): string => String(x).padStart(2, '0');
  const d = new Date();
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const time = Array.from({ length: 24 }, (_, h) => `${day}T${p(h)}:00`);
  return {
    latitude: 52.2,
    longitude: 21.0,
    utc_offset_seconds: 7200,
    hourly: {
      time,
      european_aqi: time.map(() => 39),
      pm2_5: time.map(() => 7.4),
      pm10: time.map(() => 11.6),
      dust: time.map(() => 0),
      aerosol_optical_depth: time.map(() => 0.2),
    },
  };
}

/** fetch router: geocoding, forecast or air quality, by URL. */
function makeFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes('geocoding')) {
      return new Response(
        JSON.stringify({
          results: [
            { id: 1, name: 'Warsaw', latitude: 52.2, longitude: 21.0, country: 'Poland' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes('air-quality')) {
      return new Response(JSON.stringify(aqResp()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('forecast')) {
      return new Response(JSON.stringify(forecastResp), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('', { status: 404 });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', makeFetch());
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('shows header, hero and legend before a location is chosen', () => {
    render(<App />);
    expect(screen.getByText('Sunsetrise')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter a city/)).toBeInTheDocument();
    expect(screen.getByText('Quality scale')).toBeInTheDocument();
    // No forecast is requested until a location is chosen.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('theme toggle changes data-theme and persists the choice in localStorage', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /dark theme|light theme/ });
    fireEvent.click(btn);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('sunsetrise-theme')).toBe('dark');
  });

  it('city search → 7-day forecast and hourly chart', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Enter a city/);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Warsaw' } });

    // Debounce of 300 ms → an option with the found city appears.
    const opt = await screen.findByText('Warsaw');
    fireEvent.mouseDown(opt.closest('button')!);

    // Forecast loaded — the best-day banner is there.
    await waitFor(() => expect(screen.getByText(/Best moment of the week/)).toBeInTheDocument());

    // Best day is auto-selected → the hourly chart is rendered (sr-only caption).
    await waitFor(() => expect(screen.getByText(/Hourly score for/)).toBeInTheDocument());
  });
});