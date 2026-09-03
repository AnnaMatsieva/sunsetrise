import type { JSX } from 'react';
import { STRINGS } from '../../i18n/strings';
import styles from './HzBadge.module.css';

const t = STRINGS.air;

export interface HzBadgeProps {
  /** Hazard level 1 (fine) … 6 (extreme) of the shared --hz-* scale. */
  level: 1 | 2 | 3 | 4 | 5 | 6 | null;
  /** Badge label, e.g. the band name ("Good", "Poor"). */
  label: string | null;
  /** Size: 'sm' for rows, 'md' by default. */
  size?: 'sm' | 'md';
}

/** Hazard pill for the health blocks (air quality, UV) — data-hz drives the token colors. */
export function HzBadge({ level, label, size = 'md' }: HzBadgeProps): JSX.Element {
  if (level === null) {
    return (
      <span className={`${styles.badge} ${styles.muted} ${styles[size]}`} aria-label={STRINGS.badge.noData}>
        —
      </span>
    );
  }
  return (
    <span
      className={styles.badge}
      data-hz={level}
      aria-label={`${t.band[level] ?? ''} (${level}/6)`}
    >
      {label ?? t.band[level] ?? ''}
    </span>
  );
}