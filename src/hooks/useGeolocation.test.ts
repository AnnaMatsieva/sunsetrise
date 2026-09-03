import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

type SuccessCb = (pos: GeolocationPosition) => void;
type ErrCb = (err: GeolocationPositionError) => void;

interface GeoHandle {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  resolve: (pos: GeolocationPosition) => void;
  reject: (err: GeolocationPositionError) => void;
}

/** Installs a fake navigator.geolocation and returns control handles. */
function install(): GeoHandle {
  let success: SuccessCb | undefined;
  let errCb: ErrCb | undefined;
  const getCurrentPosition = vi.fn((s: SuccessCb, e: ErrCb) => {
    success = s;
    errCb = e;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis.navigator as any).geolocation = { getCurrentPosition };
  return {
    getCurrentPosition,
    resolve: (pos) => act(() => success?.(pos)),
    reject: (err) => act(() => errCb?.(err)),
  };
}

function geoErr(code: number): GeolocationPositionError {
  return {
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    message: '',
  } as unknown as GeolocationPositionError;
}

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis.navigator as any).geolocation;
});

describe('useGeolocation', () => {
  it('no geolocation support → status error', () => {
    // jsdom does not implement geolocation by default → 'geolocation' in navigator === false.
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/not supported/);
  });

  it('success → granted and a position', () => {
    const geo = install();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    expect(result.current.status).toBe('pending');
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    geo.resolve({ coords: { latitude: 52.2, longitude: 21.0 } } as GeolocationPosition);
    expect(result.current.status).toBe('granted');
    expect(result.current.position).toEqual({ latitude: 52.2, longitude: 21.0 });
    expect(result.current.error).toBeNull();
  });

  it('permission denied (PERMISSION_DENIED) → denied', () => {
    const geo = install();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    geo.reject(geoErr(1));
    expect(result.current.status).toBe('denied');
    expect(result.current.error).toMatch(/denied/i);
  });

  it('another geolocation error → status error', () => {
    const geo = install();
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    geo.reject(geoErr(2));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/Could not determine/);
  });
});