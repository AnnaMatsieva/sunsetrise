import type { JSX } from 'react';
import styles from './MoonEventBadge.module.css';

export type BadgeTone = 'accent' | 'great' | 'neutral';

export interface MoonEventBadgeProps {
  tone: BadgeTone;
  children: string;
}

/** A small pill for a special moon event; tone maps to design tokens. */
export function MoonEventBadge({ tone, children }: MoonEventBadgeProps): JSX.Element {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}