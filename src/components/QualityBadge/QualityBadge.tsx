import type { QualityCategory } from '../../types';
import { STRINGS, tmpl } from '../../i18n/strings';
import { formatPercent } from '../../lib/format';
import styles from './QualityBadge.module.css';

const t = STRINGS;

export interface QualityBadgeProps {
  category: QualityCategory | null;
  score: number | null;
  /** Size: 'sm' for cards, 'md' by default. */
  size?: 'sm' | 'md';
}

export function QualityBadge({ category, score, size = 'md' }: QualityBadgeProps): JSX.Element {
  if (category === null || score === null) {
    return (
      <span className={`${styles.badge} ${styles.muted} ${styles[size]}`} aria-label={t.badge.ariaNoData}>
        <span className={styles.num}>—</span>
        <span className={styles.lbl}>{t.badge.noData}</span>
      </span>
    );
  }

  const cat = t.categories[category];
  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      data-cat={category.toLowerCase()}
      aria-label={tmpl(t.badge.aria, { label: cat.label, score: formatPercent(score) })}
    >
      <span className={styles.num}>{formatPercent(score)}</span>
      <span className={styles.lbl}>{cat.short}</span>
    </span>
  );
}