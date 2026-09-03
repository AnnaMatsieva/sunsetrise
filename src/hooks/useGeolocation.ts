import { useCallback, useState } from 'react';
import { STRINGS } from '../i18n/strings';

const t = STRINGS;

export type GeolocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'error';

export interface GeolocationState {
  status: GeolocationStatus;
  /** {lat, lon} on success. */
  position: { latitude: number; longitude: number } | null;
  error: string | null;
  /** Request the current coordinates. */
  request: () => void;
}

/** Wrapper over navigator.geolocation with clear statuses and readable errors. */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError(t.error.geolocationUnsupported);
      return;
    }
    setStatus('pending');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError(t.error.geolocationDenied);
        } else {
          setStatus('error');
          setError(t.error.geolocationFail);
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  return { status, position, error, request };
}