import type { JSX } from 'react';
import type { SkyPoint } from '../../lib/sky';
import { compassPoint } from '../../lib/format';
import { formatMoonTime } from '../../lib/moon';
import { STRINGS, tmpl } from '../../i18n/strings';
import styles from './SkyMap.module.css';

const t = STRINGS.sky;

/** Display name of a sky point, per its kind. */
function mapName(p: SkyPoint): string {
  if (p.kind === 'moon') return t.moonName;
  if (p.kind === 'star') return t.starNames[p.name] ?? p.name;
  return t.planets[p.name] ?? p.name;
}

const C = 100; // disc center
const R = 88; // horizon rim radius

/** Azimuth/altitude → x/y on the disc: 0° altitude at the rim, 90° at the center. */
export function skyPointXY(azDeg: number, altDeg: number): { x: number; y: number } {
  const alt = Math.min(Math.max(altDeg, 0), 90);
  const r = R * (1 - alt / 90);
  const a = (azDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

/**
 * Static "where to look" diagram: a compass disc with N at the top. A marker's
 * position on the rim is the azimuth; the distance from the rim toward the
 * center is the altitude (center = straight up). Pure SVG, no interaction.
 */
export function SkyMap({ points, time }: { points: SkyPoint[]; time: string }): JSX.Element | null {
  if (points.length === 0) return null;

  const aria = tmpl(t.mapAria, {
    points: points
      .map((p) => {
        const name = mapName(p);
        const dir = compassPoint(p.azDeg);
        return p.rise
          ? tmpl(t.mapPointLater, { name, time: formatMoonTime(p.rise), dir })
          : tmpl(t.mapPoint, { name, alt: Math.round(p.altDeg), dir });
      })
      .join('; '),
  });

  return (
    <figure className={styles.map}>
      <svg viewBox="0 0 200 200" role="img" aria-label={aria} className={styles.svg}>
        {/* altitude grid: 30° and 60° rings, dashed and faint */}
        <circle cx={C} cy={C} r={(R * 2) / 3} className={styles.grid} />
        <circle cx={C} cy={C} r={R / 3} className={styles.grid} />
        {/* horizon rim */}
        <circle cx={C} cy={C} r={R} className={styles.rim} />
        {/* cardinal directions — N top, E right, S bottom, W left */}
        <text x={C} y={C - R + 12} textAnchor="middle" className={styles.cardinal}>N</text>
        <text x={C + R - 10} y={C + 4} textAnchor="middle" className={styles.cardinal}>E</text>
        <text x={C} y={C + R - 6} textAnchor="middle" className={styles.cardinal}>S</text>
        <text x={C - R + 10} y={C + 4} textAnchor="middle" className={styles.cardinal}>W</text>
        {points.map((p) => {
          const { x, y } = skyPointXY(p.azDeg, p.altDeg);
          const label = mapName(p);
          // Labels grow inward — outside the rim they would clip on narrow screens.
          const right = x >= C;
          return (
            <g
              key={p.name}
              className={styles.point}
              data-kind={p.kind}
              data-state={p.rise ? 'later' : 'up'}
            >
              <circle
                cx={x}
                cy={y}
                r={p.kind === 'moon' ? 5 : p.kind === 'star' ? 2 : 3.5}
                className={styles.dot}
              />
              <text
                x={right ? x - 8 : x + 8}
                y={y + 3}
                textAnchor={right ? 'end' : 'start'}
                className={styles.label}
              >
                {p.rise ? tmpl(t.mapRiseLabel, { name: label, time: formatMoonTime(p.rise) }) : label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>{tmpl(t.mapCaption, { time })}</figcaption>
    </figure>
  );
}