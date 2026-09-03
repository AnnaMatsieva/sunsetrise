import type { JSX } from 'react';
import type { DayAir, PollenInfo } from '../../types';
import { eaqiHzLevel } from '../../lib/air';
import { formatDay } from '../../lib/format';
import { HzBadge } from '../HzBadge/HzBadge';
import { STRINGS, tmpl } from '../../i18n/strings';
import styles from './AirQualityCard.module.css';

const t = STRINGS.air;

export interface AirQualityCardProps {
  /** Shaped air snapshot from useAirQuality — the card renders nothing without it. */
  air: DayAir | null;
}

/** One pollen row — only rendered for a measured concentration. */
function PollenRow({ p }: { p: PollenInfo }): JSX.Element {
  const name = t.pollenNames[p.key] ?? p.key;
  const high = p.level === 'high';
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden="true">🌾</span>
      <span className={styles.text}>
        <strong>{name}</strong> — {tmpl(t.pollenValue, { value: Math.round(p.value ?? 0) })}
        {p.level !== null && <span className={styles.dim}> · {p.level}</span>}
        {high && <span className={styles.warn}> · {tmpl(t.pollenHigh, { name })}</span>}
      </span>
    </li>
  );
}

/**
 * Full-width "Air & health" card — European AQI with a "who should be careful"
 * line, particulates, dust/smoke and pollen. A bonus data source like the
 * space-weather rows: air === null renders nothing, the page never depends on it.
 */
export function AirQualityCard({ air }: AirQualityCardProps): JSX.Element | null {
  if (!air) return null;
  const hz = eaqiHzLevel(air.aqi);
  const who = hz !== null ? t.whoLine[hz] : null;

  return (
    <section className={styles.card} aria-label={t.ariaLabel}>
      <h3 className={styles.title}>{t.title}</h3>
      <ul className={styles.list}>
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden="true">🌫</span>
          <span className={styles.text}>
            <strong>{t.aqiTitle}</strong> —{' '}
            {air.aqi !== null && hz !== null ? (
              <>
                {tmpl(t.aqiValue, { value: Math.round(air.aqi) })}{' '}
                <HzBadge level={hz} label={t.band[hz] ?? ''} size="sm" />
              </>
            ) : (
              t.aqiNoData
            )}
            {who && <span className={styles.dim}> · {who}</span>}
          </span>
        </li>
        {air.pm25 !== null && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">💨</span>
            <span className={styles.text}>
              <strong>{t.pm25}</strong> — {air.pm25.toFixed(1)} {t.units}
              {air.pm10 !== null && (
                <span className={styles.dim}> · {t.pm10}: {air.pm10.toFixed(1)} {t.units}</span>
              )}
            </span>
          </li>
        )}
        {air.dust !== null && air.dust > 0 && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">🏜</span>
            <span className={styles.text}>
              <strong>{t.dust}</strong> — {air.dust.toFixed(1)} {t.units}
            </span>
          </li>
        )}
        {air.smoke === true && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">🔥</span>
            <span className={styles.text}>{t.smoke}</span>
          </li>
        )}
        {air.peakAqi !== null && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">📅</span>
            <span className={styles.text}>
              {tmpl(t.peakAqi, { date: formatDay(air.peakAqi.date), value: Math.round(air.peakAqi.aqi) })}
            </span>
          </li>
        )}
        {air.pollens.length > 0 && (
          <>
            <li className={styles.subtitle} aria-hidden="true">{t.pollenTitle}</li>
            {air.pollens.map((p) => (
              <PollenRow key={p.key} p={p} />
            ))}
          </>
        )}
      </ul>
    </section>
  );
}