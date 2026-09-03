import type { DayScore } from '../../types';
import { bestDayIndex } from '../../lib/forecast';
import { formatDay } from '../../lib/format';
import { STRINGS, tmpl } from '../../i18n/strings';
import { DayCard } from '../DayCard/DayCard';
import { ErrorState } from '../ErrorState/ErrorState';
import styles from './ForecastList.module.css';

const t = STRINGS.forecast;

export interface ForecastListProps {
  days: DayScore[] | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  selectedIndex: number | null;
  onSelectDay: (index: number) => void;
  /** Retry handler for a failed request. */
  onRetry?: () => void;
  /** true for far-horizon days → dimmed "less confident" label. */
  isLowConfidence?: (day: DayScore) => boolean;
  /** Browser-local "YYYY-MM-DD" of today — that card gets the accent outline. */
  today?: string;
}

export function ForecastList({
  days,
  status,
  error,
  selectedIndex,
  onSelectDay,
  onRetry,
  isLowConfidence,
  today,
}: ForecastListProps): JSX.Element | null {
  if (status === 'idle') return null;
  if (status === 'error')
    return <ErrorState message={error ?? t.fallbackError} {...(onRetry ? { onRetry } : {})} />;
  if (status === 'loading' || days === null) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label={t.loading}>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  const bestIdx = bestDayIndex(days);

  return (
    <div>
      {bestIdx !== null && days[bestIdx] && (
        <p className={styles.banner}>
          {tmpl(t.banner, {
            date: formatDay(days[bestIdx]!.date),
            kind: days[bestIdx]!.best?.kind === 'sunrise' ? t.bestSunrise : t.bestSunset,
          })}
        </p>
      )}
      <div className={styles.grid}>
        {days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            isBest={i === bestIdx}
            isToday={day.date === today}
            selected={i === selectedIndex}
            onSelect={() => onSelectDay(i)}
            lowConfidence={isLowConfidence?.(day) ?? false}
          />
        ))}
      </div>
    </div>
  );
}