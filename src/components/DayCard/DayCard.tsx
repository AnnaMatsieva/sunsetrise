import type { KeyboardEvent } from 'react';
import type { DayScore, EventScore } from '../../types';
import { QualityBadge } from '../QualityBadge/QualityBadge';
import { compassPoint, formatDay, formatTime } from '../../lib/format';
import { STRINGS, tmpl } from '../../i18n/strings';
import { weatherCodeInfo } from '../../constants/weatherCodes';
import styles from './DayCard.module.css';

const t = STRINGS.dayCard;
const tt = STRINGS.today;

export interface DayCardProps {
  day: DayScore;
  /** Best day of the week. */
  isBest?: boolean;
  /** The day the user lives in — an accent outline + "Today" pill. */
  isToday?: boolean;
  /** Selected by the user. */
  selected?: boolean;
  onSelect?: () => void;
  /** Far-horizon date — render a dimmed "less confident" label. */
  lowConfidence?: boolean;
}

function EventRow({ event, kindLabel }: { event: EventScore; kindLabel: string }): JSX.Element {
  const polar = event.eventTime === null;
  return (
    <div className={styles.eventRow} data-kind={event.kind}>
      <span className={styles.kindLabel}>{kindLabel}</span>
      {polar ? (
        <span className={styles.polar}>
          {event.kind === 'sunrise' ? t.polarSunrise : t.polarSunset}
        </span>
      ) : (
        <>
          <span className={styles.time}>{formatTime(event.eventTime)}</span>
          <QualityBadge category={event.category} score={event.score} size="sm" />
        </>
      )}
    </div>
  );
}

/**
 * Quiet weather line: condition, day temp range, wind, rain. For today the
 * "now" values (current temp/humidity/UV) are added — the user asked for the
 * same data in the highlighted tile as everywhere else. Every chip skips its
 * null field (e.g. a daily aggregate the API didn't send).
 */
function WeatherRow({ day }: { day: DayScore }): JSX.Element | null {
  const w = day.weather;
  if (!w) return null;
  const tw = STRINGS.weather;
  const cond = weatherCodeInfo(w.code).label;
  const range =
    w.tMin !== null && w.tMax !== null
      ? tmpl(tw.tempRange, { min: Math.round(w.tMin), max: Math.round(w.tMax) })
      : null;
  const temp =
    w.tempNow !== null
      ? `${Math.round(w.tempNow)}°${range ? ` (${range})` : ''}`
      : range;
  const wind = w.windMaxKmh !== null
    ? tmpl(tw.wind, { value: Math.round(w.windMaxKmh), dir: compassPoint(w.windDirDeg) })
    : null;
  const gusts = w.gustsKmh !== null ? tmpl(tw.gusts, { value: Math.round(w.gustsKmh) }) : null;
  if (cond === '—' && !temp && !wind && w.precipProb === null) return null;
  return (
    <div className={styles.weatherRow} aria-label={tw.forecastAria}>
      {cond !== '—' && <span className={styles.chip}>{cond}</span>}
      {temp && <span className={styles.chip}>🌡 {temp}</span>}
      {w.humidityNow !== null && (
        <span className={styles.chip}>💧 {tmpl(tw.humidity, { value: Math.round(w.humidityNow) })}</span>
      )}
      {wind && <span className={styles.chip} title={gusts ?? undefined}>💨 {wind}</span>}
      {w.precipProb !== null && (
        <span className={styles.chip}>☔ {tmpl(tw.rain, { value: Math.round(w.precipProb) })}</span>
      )}
    </div>
  );
}

function handleKeyDown(e: KeyboardEvent<HTMLDivElement>, onSelect?: () => void): void {
  // Keyboard activation of the card (role="button"): Enter or Space.
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onSelect?.();
  }
}

export function DayCard({
  day,
  isBest = false,
  isToday = false,
  selected = false,
  onSelect,
  lowConfidence = false,
}: DayCardProps): JSX.Element {
  const bestKind = day.best?.kind;
  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''} ${isBest ? styles.best : ''} ${
        isToday ? styles.today : ''
      }`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => handleKeyDown(e, onSelect)}
    >
      <div className={styles.head}>
        <span className={styles.date}>{formatDay(day.date)}</span>
        {isToday && <span className={styles.todayTag}>{tt.label}</span>}
        {isBest && <span className={styles.bestTag}>{t.bestTag}</span>}
      </div>
      <EventRow event={day.sunrise} kindLabel={t.kind.sunrise} />
      <EventRow event={day.sunset} kindLabel={t.kind.sunset} />
      <WeatherRow day={day} />
      {/* Highlight of the day's best event */}
      {bestKind && (
        <span className={styles.bestGlowMarker} data-kind={bestKind} aria-hidden="true" />
      )}
      {/* Far date — we honestly show the low confidence. */}
      {lowConfidence && <span className={styles.lowConfidence}>{t.lowConfidence}</span>}
    </div>
  );
}