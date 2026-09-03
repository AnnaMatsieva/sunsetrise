import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MoonApp } from './MoonApp';

/** fetch router: reverse geocoding / forward geocoding, by URL. The moon page
 *  never calls the weather API — everything is computed offline. */
function makeFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes('reverse-geocode')) {
      return new Response(
        JSON.stringify({ city: 'Warsaw', countryName: 'Poland' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes('geocoding')) {
      return new Response(
        JSON.stringify({
          results: [{ id: 1, name: 'Krakow', latitude: 50.06, longitude: 19.94, country: 'Poland' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
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

function setSearch(search: string): void {
  window.history.replaceState(null, '', `${window.location.pathname}${search}`);
}

describe('MoonApp — location sync', () => {
  it('renders the calendar without a location (phases work everywhere)', () => {
    setSearch('');
    render(<MoonApp />);
    expect(screen.getByText(/Moon calendar/)).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
    expect(screen.getByText(/Choose a location to see moonrise/)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('picks up the location from URL params and rewrites recents', () => {
    setSearch('?lat=52.2&lon=21&city=Warsaw&country=Poland');
    render(<MoonApp />);
    // The city shows in the picker chip and in the recents list.
    expect(screen.getAllByText(/Warsaw/).length).toBeGreaterThan(0);
    // The URL keeps the shareable query and the location lands in recents.
    expect(window.location.search).toContain('lat=52.2');
    const recents = JSON.parse(localStorage.getItem('sunsetrise-recents') ?? '[]');
    expect(recents[0]).toMatchObject({ name: 'Warsaw' });
  });

  it('without params restores the most recent city from localStorage', () => {
    localStorage.setItem(
      'sunsetrise-recents',
      JSON.stringify([{ name: 'Gdansk', latitude: 54.35, longitude: 18.65 }]),
    );
    setSearch('');
    render(<MoonApp />);
    expect(screen.getAllByText(/Gdansk/).length).toBeGreaterThan(0);
    expect(window.location.search).toContain('lat=54.35');
  });

  it('nav links carry the current location and are document-relative', () => {
    setSearch('?lat=52.2&lon=21&city=Warsaw&country=Poland');
    render(<MoonApp />);
    const toSun = screen.getByRole('link', { name: 'Forecast' });
    const toMoon = screen.getByRole('link', { name: 'Moon' });
    expect(toSun).toHaveAttribute('href', './?lat=52.2&lon=21&city=Warsaw&country=Poland');
    expect(toMoon).toHaveAttribute('href', './moon.html?lat=52.2&lon=21&city=Warsaw&country=Poland');
    expect(toMoon).toHaveAttribute('aria-current', 'page');
  });

  it('picking a city on the moon page updates the URL for the other page', async () => {
    setSearch('');
    render(<MoonApp />);
    const input = screen.getByPlaceholderText(/Enter a city/);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Krakow' } });
    const opt = await screen.findByText('Krakow');
    fireEvent.mouseDown(opt.closest('button')!);

    await waitFor(() => expect(window.location.search).toContain('city=Krakow'));
    const recents = JSON.parse(localStorage.getItem('sunsetrise-recents') ?? '[]');
    expect(recents[0]).toMatchObject({ name: 'Krakow', latitude: 50.06 });
  });
});