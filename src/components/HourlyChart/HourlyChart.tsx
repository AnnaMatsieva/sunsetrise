/**
 * HourlyChart — a per-hour quality chart of a single event (sunrise/sunset)
 * as a bar chart. Window H-3..H+3 (7 buckets).
 *
 * Encoding (see the dataviz skill):
 *  - PRIMARY — bar height = score (0..1), plus a direct numeric label.
 *  - SECONDARY — color by category (from colors.ts via --bar). The Fair/Good pair
 *    is close in ΔE in dark theme, so color is NEVER the only signal:
 *    there is a number above the bar, a legend, a tooltip and an sr-only table.
 *  - a11y: img role + label, sr-only table with the full data, focus ring.
 *
 * Dynamic values (height/color/tooltip index) are passed via CSS variables;
 * all visual rules live in module.css (no inline styles).
 */
import { useState } from 'react';
import type { EventScore, QualityCategory } from '../../types';
import { colorsFor } from '../../constants/colors';
import { scoreToCategory } from '../../lib/categorize';
import { STRINGS, tmpl } from '../../i18n/strings';
import { formatPercent, formatTime } from '../../lib/format';
import styles from './HourlyChart.module.css';

const t = STRINGS;

export interface HourlyChartProps {
  event: EventScore;
  /** Dark theme (for palette selection). */
  dark: boolean;
}

const OFFSET_LABELS = ['H-3', 'H-2', 'H-1', 'H', 'H+1', 'H+2', 'H+3'] as const;
const EVENT_INDEX = 3;
const KIND_ICON = { sunrise: '🌅', sunset: '🌇' } as const;

interface Slot {
  score: number | null;
  key: string;
  category: QualityCategory | null;
  bar: string;
  hour: string | null;
  offset: string;
}

/** Hour from the "YYYY-MM-DDTHH" key → "HH:00". An empty key → null. */
function hourLabel(key: string): string | null {
  if (!key) return null;
  const hh = key.slice(11, 13);
  return hh ? `${hh}:00` : null;
}

function categoryLabel(category: QualityCategory): string {
  return t.categories[category].label;
}

function ariaForSlot(slot: Slot): string {
  const c = t.chart;
  if (slot.score === null) {
    return tmpl(c.ariaSlotNoData, { offset: slot.offset });
  }
  const base = tmpl(c.ariaSlotScore, {
    offset: slot.offset,
    hour: slot.hour ?? c.timeUnknown,
    score: formatPercent(slot.score),
  });
  return slot.category ? base + tmpl(c.ariaSlotCat, { label: categoryLabel(slot.category) }) : base;
}

export function HourlyChart({ event, dark }: HourlyChartProps): JSX.Element {
  const c = t.chart;
  const kindLabel = c.kind[event.kind];
  const [hover, setHover] = useState<number | null>(null);

  // Polar night / white nights / no data — no chart.
  if (event.score === null || event.hourScores.length === 0) {
    const msg =
      event.eventTime === null
        ? event.kind === 'sunrise'
          ? c.polarSunrise
          : c.polarSunset
        : c.noData;
    return (
      <section className={styles.wrap} aria-label={tmpl(c.aria, { kind: kindLabel })}>
        <p className={styles.empty}>{msg}</p>
      </section>
    );
  }

  const slots: Slot[] = event.hourScores.map((score, i) => {
    const key = event.hourKeys[i] ?? '';
    const category = scoreToCategory(score);
    const bar = category ? colorsFor(category, dark).bar : 'var(--border)';
    const hour = hourLabel(key);
    return { score, key, category, bar, hour, offset: OFFSET_LABELS[i] ?? 'H' };
  });

  const focusSlot = hover !== null ? slots[hover] : null;

  return (
    <section
      className={styles.wrap}
      aria-label={
        tmpl(c.hourlyAria, { kind: kindLabel }) +
        (event.eventTime ? tmpl(c.atTime, { time: formatTime(event.eventTime) }) : '')
      }
    >
      <div className={styles.head}>
        <span className={styles.title}>
          {KIND_ICON[event.kind]} {kindLabel}
        </span>
        <span className={styles.sub}>
          {event.eventTime
            ? tmpl(c.sub, { time: formatTime(event.eventTime), score: formatPercent(event.score) })
            : tmpl(c.score, { score: formatPercent(event.score) })}
        </span>
      </div>

      <div className={styles.figure}>
        <div className={styles.yaxis} aria-hidden="true">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        <div className={styles.plot}>
          {/* Reference lines of the 25/50/75 category boundaries. */}
          {[75, 50, 25].map((p) => (
            <span key={p} className={styles.gridline} style={{ bottom: `${p}%` }} />
          ))}

          {slots.map((slot, i) => {
            const isEvent = i === EVENT_INDEX;
            const isFocused = hover === i;
            const pct = slot.score === null ? 0 : Math.round(slot.score * 100);
            const colClass = [styles.col, isEvent ? styles.eventCol : '', isFocused ? styles.focused : '']
              .join(' ')
              .trim();
            return (
              <div
                key={i}
                className={colClass}
                tabIndex={0}
                role="img"
                aria-label={ariaForSlot(slot)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {slot.score === null ? (
                  <div className={styles.noData} aria-hidden="true" />
                ) : (
                  <div className={styles.bar} style={{ '--h': pct, '--bar': slot.bar } as React.CSSProperties}>
                    <span className={styles.barLabel}>{pct}</span>
                  </div>
                )}
              </div>
            );
          })}

          {focusSlot && (
            <div
              className={styles.tooltip}
              style={{ '--i': hover, '--bar': focusSlot.bar } as React.CSSProperties}
              role="status"
            >
              <div className={styles.ttRow}>
                <span className={styles.ttDot} style={{ '--bar': focusSlot.bar } as React.CSSProperties} />
                <span>{focusSlot.hour ?? '—'}</span>
                <span className={styles.ttMuted}>{focusSlot.offset}</span>
              </div>
              <div>
                {tmpl(c.score, { score: formatPercent(focusSlot.score) })}
                {focusSlot.category
                  ? tmpl(c.ariaSlotCat, { label: categoryLabel(focusSlot.category) })
                  : ` · ${c.noCat}`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.axis} aria-hidden="true">
        <span />
        {slots.map((slot, i) => (
          <span
            key={i}
            className={i === EVENT_INDEX ? `${styles.tick} ${styles.eventTick}` : styles.tick}
          >
            {i === EVENT_INDEX ? (
              <span className={styles.eventIcon}>{KIND_ICON[event.kind]}</span>
            ) : (
              slot.hour ?? '·'
            )}
          </span>
        ))}
      </div>

      {/* Full table for screen readers. */}
      <table className="sr-only">
        <caption>
          {tmpl(c.tableCaption, {
            kind: kindLabel,
            time: event.eventTime ? formatTime(event.eventTime) : '',
            score: formatPercent(event.score),
          })}
        </caption>
        <thead>
          <tr>
            <th>{c.th.offset}</th>
            <th>{c.th.hour}</th>
            <th>{c.th.score}</th>
            <th>{c.th.category}</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={i}>
              <th scope="row">{slot.offset}</th>
              <td>{slot.hour ?? '—'}</td>
              <td>
                {slot.score === null ? c.cellNoData : tmpl(c.cellScore, { score: formatPercent(slot.score) })}
              </td>
              <td>{slot.category ? categoryLabel(slot.category) : c.cellNoData}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}