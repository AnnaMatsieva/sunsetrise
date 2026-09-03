import { useEffect, useState } from 'react';
import type { DayScore, EventKind, EventScore } from '../../types';
import { formatTime } from '../../lib/format';
import { uvCategory, sunburnMinutes } from '../../lib/uv';
import { QualityBadge } from '../QualityBadge/QualityBadge';
import { HourlyChart } from '../HourlyChart/HourlyChart';
import { STRINGS, tmpl } from '../../i18n/strings';
import styles from './DayDetail.module.css';

const t = STRINGS;

export interface DayDetailProps {
  day: DayScore;
  /** Dark theme (for the chart). */
  dark: boolean;
}

/** Muted line under the tabs: how it feels standing outside + how dangerous the sun is. */
function HealthLine({ day, event }: { day: DayScore; event: EventScore }): JSX.Element | null {
  const parts: string[] = [];
  const c = event.comfort;
  if (c && c.feelsC !== null) {
    const tc = t.comfort;
    // Wind is only worth mentioning from ~30 km/h (strong wind from 50).
    const wind =
      c.windKmh !== null && c.windKmh >= 30
        ? ` · ${tmpl(c.windKmh >= 50 ? tc.strongWind : tc.wind, { value: Math.round(c.windKmh) })}`
        : '';
    parts.push(`${tmpl(tc.feels, { feels: Math.round(c.feelsC) })} — ${tc.level[c.level] ?? ''}${wind}`);
  }
  const uvMax = day.weather?.uvMax ?? null;
  const uvCat = uvCategory(uvMax);
  if (uvMax !== null && uvCat !== null) {
    const tu = t.uv;
    const burn = sunburnMinutes(uvMax);
    const window = day.weather?.uvWindow ?? null;
    parts.push(
      tmpl(tu.dayMax, { uv: Math.round(uvMax), category: tu.category[uvCat] ?? '' }) +
        (burn !== null ? `; ${tmpl(tu.sunburn, { min: burn })}` : '') +
        (window ? `; ${tmpl(tu.dangerWindow, { from: window.from, to: window.to })}` : ''),
    );
  }
  if (parts.length === 0) return null;
  return (
    <p className={styles.health} aria-label={t.comfort.ariaLabel}>
      {parts.join(' · ')}
    </p>
  );
}

/**
 * Details of the selected day: a sunrise/sunset switcher plus the hourly chart
 * of the selected event. Opens on the day's best event by default.
 */
export function DayDetail({ day, dark }: DayDetailProps): JSX.Element {
  const [which, setWhich] = useState<EventKind>(() => day.best?.kind ?? 'sunset');

  // A day change returns to the day's best event.
  useEffect(() => {
    setWhich(day.best?.kind ?? 'sunset');
  }, [day.date, day.best]);

  const event = which === 'sunrise' ? day.sunrise : day.sunset;

  return (
    <section className={styles.detail} aria-label={t.detail.sectionLabel}>
      <div className={styles.tabs} role="group" aria-label={t.detail.tabsLabel}>
        {(['sunrise', 'sunset'] as const).map((kind) => {
          const ev = kind === 'sunrise' ? day.sunrise : day.sunset;
          const active = which === kind;
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setWhich(kind)}
            >
              <span className={styles.tabLabel}>{t.dayCard.kind[kind]}</span>
              <span className={styles.tabTime}>
                {ev.eventTime ? formatTime(ev.eventTime) : '—'}
              </span>
              <QualityBadge category={ev.category} score={ev.score} size="sm" />
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className={styles.panel}>
        <HourlyChart event={event} dark={dark} />
      </div>
      <HealthLine day={day} event={event} />
    </section>
  );
}