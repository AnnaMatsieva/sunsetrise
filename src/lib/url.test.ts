import { describe, it, expect } from 'vitest';
import { locationFromSearchParams, buildLocationSearch, pageHref } from './url';
import type { Location } from '../types';

const warsaw: Location = {
  name: 'Warsaw',
  latitude: 52.2,
  longitude: 21.0,
  country: 'Poland',
};

describe('locationFromSearchParams', () => {
  it('parses lat/lon/country', () => {
    expect(locationFromSearchParams('?lat=52.2&lon=21&city=Warsaw&country=Poland')).toEqual(warsaw);
  });

  it('decodes an encoded name with a space and a comma', () => {
    const loc = locationFromSearchParams('?lat=40.7&lon=-74.0&city=New%20York%2C%20NY');
    expect(loc?.name).toBe('New York, NY');
    expect(loc?.latitude).toBe(40.7);
  });

  it('falls back to coordinates as the name when city is missing', () => {
    const loc = locationFromSearchParams('?lat=52.2&lon=21');
    expect(loc?.name).toBe('52.20, 21.00');
  });

  it('null when lat/lon are missing', () => {
    expect(locationFromSearchParams('?city=Warsaw')).toBeNull();
  });

  it('null on invalid coordinates', () => {
    expect(locationFromSearchParams('?lat=abc&lon=21')).toBeNull();
    expect(locationFromSearchParams('?lat=999&lon=21')).toBeNull();
    expect(locationFromSearchParams('?lat=52&lon=999')).toBeNull();
  });

  it('empty string → null', () => {
    expect(locationFromSearchParams('')).toBeNull();
  });
});

describe('buildLocationSearch', () => {
  it('builds ?lat=&lon=&city=&country=', () => {
    const qs = buildLocationSearch(warsaw);
    const back = locationFromSearchParams(qs);
    expect(back).toEqual(warsaw);
  });

  it('encodes special characters in the name', () => {
    const qs = buildLocationSearch({ name: 'St. John’s', latitude: 10, longitude: 20 });
    expect(qs).toContain('city=St.+John%E2%80%99s');
  });

  it('does not add the country parameter when absent', () => {
    const qs = buildLocationSearch({ name: 'X', latitude: 1, longitude: 2 });
    expect(qs).not.toContain('country=');
  });

  it('round-trip: build → parse = original location', () => {
    const locs: Location[] = [
      warsaw,
      { name: 'My location', latitude: -33.86, longitude: 151.21 },
      { name: 'Q', latitude: 0, longitude: 0 },
    ];
    for (const loc of locs) {
      expect(locationFromSearchParams(buildLocationSearch(loc))).toEqual(loc);
    }
  });
});

describe('pageHref', () => {
  it('sun page with a location → ./?lat..', () => {
    expect(pageHref('sun', warsaw)).toBe('./?lat=52.2&lon=21&city=Warsaw&country=Poland');
  });

  it('moon page with a location → ./moon.html?lat..', () => {
    expect(pageHref('moon', warsaw)).toBe('./moon.html?lat=52.2&lon=21&city=Warsaw&country=Poland');
  });

  it('no location → bare document-relative hrefs', () => {
    expect(pageHref('sun', null)).toBe('./');
    expect(pageHref('moon', null)).toBe('./moon.html');
  });

  it('never emits a root-relative path (GitHub Pages subpath)', () => {
    for (const page of ['sun', 'moon'] as const) {
      for (const loc of [null, warsaw]) {
        const href = pageHref(page, loc);
        expect(href.startsWith('/')).toBe(false);
      }
    }
  });
});