import type { JSX } from 'react';
import type { MoonDay } from '../../lib/moon';
import { formatMoonTime } from '../../lib/moon';
import { STRINGS, tmpl } from '../../i18n/strings';
import { formatPercent } from '../../lib/format';
import styles from './MoonCalendar.module.css';

const t = STRINGS.moon;

export interface MoonCalendarProps {
  days: MoonDay[];
  /** Weekday header, Monday first (7 labels). */
  weekdays?: string[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** "September 2026" — formatted by the parent (it owns the month state). */
  monthLabel: string;
  /** Browser-local "YYYY-MM-DD" of today — that cell gets the accent outline. */
  todayKey?: string;
}

export function MoonCalendar({
  days,
  weekdays = t.weekdays,
  onPrevMonth,
  onNextMonth,
  monthLabel,
  todayKey,
}: MoonCalendarProps): JSX.Element {
  return (
    <div className={styles.wrap}>
      <div className={styles.monthNav} role="group" aria-label={t.monthNavLabel}>
        <button type="button" className={styles.arrow} onClick={onPrevMonth} aria-label={t.prevMonth}>
          ‹
        </button>
        <h3 className={styles.monthLabel}>{monthLabel}</h3>
        <button type="button" className={styles.next} onClick={onNextMonth} aria-label={t.nextMonth}>
          ›
        </button>
      </div>
      <p className={styles.timesLocal}>{t.timesLocal}</p>

      <div className={styles.grid} role="grid">
        <div className={styles.weekHeader} role="row">
          {weekdays.map((w) => (
            <span key={w} className={styles.weekday} role="columnheader">
              {w}
            </span>
          ))}
        </div>
        {chunkWeeks(days).map((week, wi) => (
          <div key={wi} className={styles.week} role="row">
            {week.map((d) => (
              <Cell key={d.date} day={d} isToday={d.date === todayKey} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function chunkWeeks(days: MoonDay[]): MoonDay[][] {
  const weeks: MoonDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function Cell({ day, isToday }: { day: MoonDay; isToday: boolean }): JSX.Element {
  const phase = t.phase[day.phaseName];
  const aria = tmpl(t.cellAria, {
    date: day.date,
    phase,
    illum: formatPercent(day.illumination),
    rise: formatMoonTime(day.moonrise),
    set: formatMoonTime(day.moonset),
  });
  const highlight = day.isFullMoon || day.isNewMoon ? styles.highlight : '';
  return (
    <div
      className={[
        styles.cell,
        day.inMonth ? '' : styles.outside,
        highlight,
        isToday ? styles.today : '',
      ].join(' ')}
      role="gridcell"
      aria-label={aria}
      data-event={day.isFullMoon ? 'full' : day.isNewMoon ? 'new' : undefined}
      title={day.isFullMoon ? t.fullMoonDay : day.isNewMoon ? t.newMoonDay : undefined}
    >
      <span className={styles.dayNum}>{Number(day.date.slice(-2))}</span>
      <span className={styles.icon} aria-hidden="true">
        {day.phaseIcon}
      </span>
      <span className={styles.illum}>{formatPercent(day.illumination)}%</span>
      <span className={styles.rs} title={t.rise}>
        ↑ {formatMoonTime(day.moonrise)}
      </span>
      <span className={styles.rs} title={t.set}>
        ↓ {formatMoonTime(day.moonset)}
      </span>
    </div>
  );
}