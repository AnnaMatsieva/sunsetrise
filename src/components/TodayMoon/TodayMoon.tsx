import type { JSX } from 'react';
import type { TodayMoonInfo } from '../../lib/moon';
import { formatMoonTime } from '../../lib/moon';
import { formatPercent } from '../../lib/format';
import { STRINGS, tmpl } from '../../i18n/strings';
import styles from './TodayMoon.module.css';

const t = STRINGS.moon;
const tt = STRINGS.today;

export interface TodayMoonProps {
  day: TodayMoonInfo;
}

/** Full-width "Today" card for the moon page — phase, illumination, rise/set. */
export function TodayMoon({ day }: TodayMoonProps): JSX.Element {
  const phase = t.phase[day.phaseName];
  const eventDay = day.isFullMoon
    ? day.supermoon
      ? t.supermoon
      : t.fullMoonDay
    : day.isNewMoon
      ? t.newMoonDay
      : null;

  return (
    <section className={styles.card} aria-label={tt.ariaMoon}>
      <span className={styles.icon} aria-hidden="true">
        {day.phaseIcon}
      </span>
      <div className={styles.col}>
        <div className={styles.head}>
          <span className={styles.tag}>{tt.label}</span>
          <span className={styles.phase}>{phase}</span>
          <span className={styles.illum}>
            {tmpl(tt.illumText, { illum: formatPercent(day.illumination) })}
          </span>
        </div>
        <div className={styles.rs}>
          <span title={t.rise}>↑ {formatMoonTime(day.moonrise)}</span>
          <span title={t.set}>↓ {formatMoonTime(day.moonset)}</span>
        </div>
      </div>
      {eventDay && (
        <span className={styles.event} data-event={day.isFullMoon ? 'full' : 'new'}>
          {eventDay}
        </span>
      )}
    </section>
  );
}