import type { KeyboardEvent } from 'react';
import type { DayAir, DayScore, EventScore } from '../../types';
import { QualityBadge } from '../QualityBadge/QualityBadge';
import { compassPoint, formatDay, formatTime } from '../../lib/format';
import { uvCategory } from '../../lib/uv';
import { eaqiHzLevel } from '../../lib/air';
import { STRINGS, tmpl } from '../../i18n/strings';
import { weatherCodeInfo } from '../../constants/weatherCodes';
import styles from './TodayCard.module.css';

const t = STRINGS;

export interface TodayCardProps {
  /** Today's scored day from the forecast (the card is only rendered if it exists). */
  day: DayScore;
  /** Current air-quality snapshot — null/absent while loading or on error. */
  air?: DayAir | null;
  /** Clicking the card opens today's hourly chart (selects it in the list). */
  onSelect?: () => void;
}

function EventRow({ event, kindLabel }: { event: EventScore; kindLabel: string }): JSX.Element {
  const polar = event.eventTime === null;
  return (
    <div className={styles.row} data-kind={event.kind}>
      <span className={styles.kind}>{kindLabel}</span>
      {polar ? (
        <span className={styles.polar}>
          {event.kind === 'sunrise' ? t.dayCard.polarSunrise : t.dayCard.polarSunset}
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

function handleKeyDown(e: KeyboardEvent<HTMLElement>, onSelect?: () => void): void {
  // Keyboard activation of the card (role="button"): Enter or Space.
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onSelect?.();
  }
}

/** Today's weather line — condition, temp (now, day range), humidity, wind, rain, UV, AQI. */
function WeatherRow({ day, air }: { day: DayScore; air: DayAir | null }): JSX.Element | null {
  const w = day.weather ?? null;
  const aqiHz = eaqiHzLevel(air?.aqi ?? null);
  // The row lives as long as it has anything to say (weather, UV or AQI).
  if (!w && aqiHz === null) return null;
  const tw = STRINGS.weather;
  const cond = w ? weatherCodeInfo(w.code).label : null;
  const temp = w?.tempNow != null ? `${Math.round(w.tempNow)}°` : null;
  const range =
    w?.tMin != null && w.tMax != null
      ? tmpl(tw.tempRange, { min: Math.round(w.tMin), max: Math.round(w.tMax) })
      : null;
  const wind = w?.windMaxKmh != null
    ? tmpl(tw.wind, { value: Math.round(w.windMaxKmh), dir: compassPoint(w.windDirDeg) })
    : null;
  const gusts = w?.gustsKmh != null ? tmpl(tw.gusts, { value: Math.round(w.gustsKmh) }) : null;
  const uvCat = uvCategory(w?.uvNow ?? null);
  const uv =
    w?.uvNow != null && uvCat !== null
      ? `UV ${Math.round(w.uvNow)} (${t.uv.category[uvCat]})`
      : null;
  const aqi =
    air?.aqi != null && aqiHz !== null
      ? `AQI ${Math.round(air.aqi)} (${t.air.band[aqiHz]})`
      : null;
  return (
    <div className={styles.weather} aria-label={tw.ariaLabel}>
      {cond !== null && cond !== '—' && <span className={styles.cond}>{cond}</span>}
      {temp && (
        <span className={styles.chip}>
          🌡 {temp}
          {range && <span className={styles.dim}> ({range})</span>}
        </span>
      )}
      {w?.humidityNow != null && (
        <span className={styles.chip}>💧 {tmpl(tw.humidity, { value: Math.round(w.humidityNow) })}</span>
      )}
      {wind && <span className={styles.chip} title={gusts ?? undefined}>💨 {wind}</span>}
      {w?.precipProb != null && (
        <span className={styles.chip}>☔ {tmpl(tw.rain, { value: Math.round(w.precipProb) })}</span>
      )}
      {uv && (
        <span
          className={styles.chip}
          aria-label={tmpl(t.uv.chipAria, {
            uv: Math.round(w?.uvNow ?? 0),
            category: t.uv.category[uvCat ?? 'low'] ?? '',
          })}
        >
          ☀️ {uv}
        </span>
      )}
      {aqi && (
        <span
          className={styles.chip}
          aria-label={tmpl(t.air.chipAria, {
            value: Math.round(air?.aqi ?? 0),
            band: t.air.band[aqiHz ?? 1] ?? '',
          })}
        >
          🫁 {aqi}
        </span>
      )}
    </div>
  );
}

/** Full-width "Today" card — the day the user actually lives in, above the week. */
export function TodayCard({ day, air, onSelect }: TodayCardProps): JSX.Element {
  return (
    <section
      className={styles.card}
      role="button"
      tabIndex={0}
      aria-label={t.today.ariaSun}
      title={t.today.selectHint}
      onClick={onSelect}
      onKeyDown={(e) => handleKeyDown(e, onSelect)}
    >
      <div className={styles.topRow}>
        <span className={styles.tag}>{t.today.label}</span>
        <span className={styles.date}>{formatDay(day.date)}</span>
        <div className={styles.events}>
          <EventRow event={day.sunrise} kindLabel={t.dayCard.kind.sunrise} />
          <EventRow event={day.sunset} kindLabel={t.dayCard.kind.sunset} />
        </div>
      </div>
      <WeatherRow day={day} air={air ?? null} />
    </section>
  );
}