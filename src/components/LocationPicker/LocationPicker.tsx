import { useEffect, useState } from 'react';
import type { GeoResult, Location } from '../../types';
import { useGeocoding } from '../../hooks/useGeocoding';
import { useGeolocation } from '../../hooks/useGeolocation';
import { reverseGeocode } from '../../api/reverseGeocode';
import { STRINGS, tmpl } from '../../i18n/strings';
import { SearchBar } from '../SearchBar/SearchBar';
import styles from './LocationPicker.module.css';

const t = STRINGS;

export interface LocationPickerProps {
  current: Location | null;
  onSelectLocation: (location: Location) => void;
  /** Recent cities for quick selection. */
  recents?: Location[];
  /** Removes a city from the recents list (the chip × buttons). */
  onRemoveRecent?: (location: Location) => void;
}

function toLocation(r: GeoResult): Location {
  const out: Location = { name: r.name, latitude: r.latitude, longitude: r.longitude };
  if (r.country !== undefined) out.country = r.country;
  if (r.admin1 !== undefined) out.admin1 = r.admin1;
  return out;
}

export function LocationPicker({ current, onSelectLocation, recents = [], onRemoveRecent }: LocationPickerProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState(false);
  // Non-null while the current location came from geolocation — drives the
  // "✓ Location found: {city}" confirmation. Cleared by any manual selection.
  const [geoName, setGeoName] = useState<string | null>(null);
  const geo = useGeocoding(query);
  const { status: geoStatus, position: geoPosition, error: geoError, request: requestGeo } =
    useGeolocation();

  // Geolocation granted → resolve the coordinates to a city name (reverse
  // geocoding), then use them as the location. Falls back to "My location"
  // when the name lookup fails.
  useEffect(() => {
    if (geoPosition === null) return;
    let cancelled = false;
    setResolving(true);
    reverseGeocode(geoPosition.latitude, geoPosition.longitude)
      .then((res) => {
        if (cancelled) return;
        const loc: Location = {
          name: res?.name ?? t.location.myLocationName,
          latitude: geoPosition.latitude,
          longitude: geoPosition.longitude,
        };
        if (res?.country !== undefined) loc.country = res.country;
        if (res?.admin1 !== undefined) loc.admin1 = res.admin1;
        setGeoName(loc.name);
        onSelectLocation(loc);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [geoPosition, onSelectLocation]);

  const selectManually = (loc: Location) => {
    onSelectLocation(loc);
    setGeoName(null); // the location is no longer geolocation-derived
  };

  const handleSelect = (r: GeoResult) => {
    selectManually(toLocation(r));
    setQuery('');
  };

  const chip = current ? `${current.name}${current.country ? ', ' + current.country : ''}` : '';

  return (
    <div className={styles.picker}>
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        results={geo.results}
        status={geo.status}
        error={geo.error}
        onSelect={handleSelect}
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.geoBtn} ${geoStatus === 'granted' ? styles.geoBtnGranted : ''}`}
          onClick={requestGeo}
          disabled={geoStatus === 'pending' || resolving}
        >
          {geoStatus === 'pending' || resolving ? t.location.locating : t.location.myLocation}
        </button>
        {/* Explicit confirmation right next to the button — visible on any viewport
            (role="status" announces it to screen readers too). With a resolved
            city it names it: "✓ Location found: Warsaw". */}
        {geoName !== null && (
          <span className={styles.geoOk} role="status">
            ✓{' '}
            {geoName === t.location.myLocationName
              ? t.location.located
              : tmpl(t.location.locatedWith, { city: geoName })}
          </span>
        )}
        {chip && (
          <span className={styles.chip}>
            <span aria-hidden="true">📍</span> {chip}
          </span>
        )}
      </div>
      {recents.length > 0 && (
        <div className={styles.recents} aria-label={t.location.recentsLabel}>
          {recents.map((r) => (
            <span
              key={`${r.latitude.toFixed(3)}_${r.longitude.toFixed(3)}`}
              className={styles.recentChip}
            >
              <button
                type="button"
                className={styles.recent}
                onClick={() => selectManually(r)}
              >
                {r.name}
                {r.country ? `, ${r.country}` : ''}
              </button>
              {onRemoveRecent && (
                <button
                  type="button"
                  className={styles.recentRemove}
                  aria-label={tmpl(t.location.removeRecent, { city: r.name })}
                  onClick={() => onRemoveRecent(r)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {geoError && <p className={styles.geoError}>{geoError}</p>}
    </div>
  );
}