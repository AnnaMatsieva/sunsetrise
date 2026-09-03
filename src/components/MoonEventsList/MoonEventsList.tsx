import type { JSX } from 'react';
import type {
  MoonEventInfo,
  LunarEclipseEvent,
  SolarEclipseEvent,
  SupermoonInfo,
} from '../../lib/moon';
import { formatMoonTime } from '../../lib/moon';
import { STRINGS, tmpl } from '../../i18n/strings';
import { formatDay } from '../../lib/format';
import styles from './MoonEventsList.module.css';

const t = STRINGS.moon;

export interface MoonEventsListProps {
  events: {
    fullMoons: MoonEventInfo[];
    newMoons: MoonEventInfo[];
    supermoons: SupermoonInfo[];
    lunarEclipses: LunarEclipseEvent[];
    solarEclipses: SolarEclipseEvent[];
  };
}

interface Row {
  key: string;
  /** Local calendar day "YYYY-MM-DD" the event's peak falls on. */
  date: string;
  /** Exact UTC instant of the peak — for the clock time and for sorting. */
  timeUtc: Date;
  title: string;
  detail: string;
  /** true when the event is rare enough to earn the accent color. */
  special: boolean;
}

/** Human name for a lunar-eclipse kind. */
function lunarLabel(kind: LunarEclipseEvent['kind']): string {
  if (kind === 'total') return t.lunarTotal;
  if (kind === 'partial') return t.lunarPartial;
  return t.lunarPenumbral;
}

function solarLabel(kind: SolarEclipseEvent['kind']): string {
  if (kind === 'total') return t.solarTotal;
  if (kind === 'annular') return t.solarAnnular;
  return t.solarPartial;
}

function visibilityLabel(v: boolean | null): string {
  if (v === true) return t.visibleHere;
  if (v === false) return t.notVisibleHere;
  return t.visibilityUnknown;
}

/** All events of the month, one row each, sorted by date and time. */
function buildRows(events: MoonEventsListProps['events']): Row[] {
  const rows: Row[] = [
    ...events.supermoons.map((s) => ({
      key: `super-${s.timeUtc.toISOString()}`,
      date: s.date,
      timeUtc: s.timeUtc,
      title: t.supermoon,
      detail: `${tmpl(t.supermoonDetail, { km: Math.round(s.distKm) })} · ${t.fullMoon}`,
      special: true,
    })),
    ...events.lunarEclipses.map((e) => ({
      key: `lunar-${e.timeUtc.toISOString()}`,
      date: e.date,
      timeUtc: e.timeUtc,
      title: lunarLabel(e.kind),
      detail: t.fullMoon,
      special: true,
    })),
    ...events.solarEclipses.map((e) => ({
      key: `solar-${e.timeUtc.toISOString()}`,
      date: e.date,
      timeUtc: e.timeUtc,
      title: solarLabel(e.kind),
      detail: visibilityLabel(e.visibleHere),
      special: true,
    })),
    ...events.fullMoons.map((f) => ({
      key: `full-${f.timeUtc.toISOString()}`,
      date: f.date,
      timeUtc: f.timeUtc,
      title: t.fullMoon,
      detail: '',
      special: false,
    })),
    ...events.newMoons.map((n) => ({
      key: `new-${n.timeUtc.toISOString()}`,
      date: n.date,
      timeUtc: n.timeUtc,
      title: t.newMoon,
      detail: '',
      special: false,
    })),
  ];
  // Chronological order — the calendar reads top to bottom as the month goes.
  rows.sort((a, b) => a.timeUtc.getTime() - b.timeUtc.getTime());
  return rows;
}

export function MoonEventsList({ events }: MoonEventsListProps): JSX.Element | null {
  const rows = buildRows(events);

  return (
    <section className={styles.wrap} aria-label={t.eventsTitle}>
      <h3 className={styles.title}>{t.eventsTitle}</h3>
      {rows.length === 0 ? (
        <p className={styles.empty}>{t.noEvents}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((r) => (
            <li key={r.key} className={styles.row}>
              <span className={styles.dateCell}>
                <span className={styles.date}>{formatDay(r.date)}</span>
                <span className={styles.time}>{formatMoonTime(r.timeUtc)}</span>
              </span>
              <span className={styles.eventCell}>
                <span className={r.special ? styles.titleSpecial : styles.title}>{r.title}</span>
                {r.detail && <span className={styles.detail}>{r.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}