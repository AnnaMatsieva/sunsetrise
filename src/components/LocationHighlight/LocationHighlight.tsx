import type { Location } from '../../types';
import { STRINGS } from '../../i18n/strings';
import styles from './LocationHighlight.module.css';

const t = STRINGS;

export interface LocationHighlightProps {
  location: Location;
}

/** The current location in a large display type, top-right of the hero. */
export function LocationHighlight({ location }: LocationHighlightProps): JSX.Element {
  return (
    <p className={styles.highlight} aria-label={t.location.currentLabel}>
      <span className={styles.pin} aria-hidden="true">
        📍
      </span>
      {location.name}
      {location.country !== undefined ? `, ${location.country}` : ''}
    </p>
  );
}