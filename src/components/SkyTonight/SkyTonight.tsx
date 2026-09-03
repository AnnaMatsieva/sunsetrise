import type { JSX } from 'react';
import { useMemo } from 'react';
import { Body } from 'astronomy-engine';
import type { Location } from '../../types';
import type { PlanetView, Stargazing } from '../../lib/sky';
import {
  planetVisibility,
  meteorShowerStatus,
  moonIllumination,
  stargazingScore,
  skyMapPoints,
  eveningWhen,
  moonConjunctions,
  moonriseInfo,
} from '../../lib/sky';
import { bortleFor, lightFactor } from '../../lib/lightpollution';
import { flareCategory, kpCategory, type SpaceWeather } from '../../lib/space';
import { compassPoint, formatDay, formatUtcClock } from '../../lib/format';
import { formatMoonTime } from '../../lib/moon';
import { useSpaceWeather } from '../../hooks/useSpaceWeather';
import { STRINGS, tmpl } from '../../i18n/strings';
import { SkyMap } from '../SkyMap/SkyMap';
import styles from './SkyTonight.module.css';

const t = STRINGS.sky;

export interface SkyTonightProps {
  location: Location | null;
  /** Mean night cloud cover for tonight (0..1) — null when unknown. */
  cloudTonight?: number | null;
  /** Frozen at mount by the parent, like "Today" everywhere else. */
  now?: Date;
}

const ACTIVE_SHOWERS_MAX = 2;

/** The planets worth a look with the naked eye, in card order. */
const PLANETS: ReadonlyArray<{ body: Body; name: string }> = [
  { body: Body.Saturn, name: 'Saturn' },
  { body: Body.Jupiter, name: 'Jupiter' },
];

function PlanetRow({ name, view }: { name: string; view: PlanetView }): JSX.Element {
  const label = t.planets[name] ?? name;
  let state: string;
  if (view.altDeg >= 20) state = t.altHigh;
  else if (view.altDeg >= 5) state = t.altOk;
  else if (view.altDeg > 0) state = t.altLow;
  else if (view.rise) state = tmpl(t.risesLater, { time: formatMoonTime(view.rise) });
  else state = t.belowHorizon;
  // A visible planet is worth a compass direction; a rising one is not yet.
  const where = view.altDeg > 0 ? ` · ${tmpl(t.dirIn, { dir: compassPoint(view.azDeg) })}` : '';
  // What "mag 0.3" means in practice — can I see it without instruments?
  const hint =
    view.mag <= 1 ? t.magCity :
    view.mag <= 3 ? t.magEasy :
    view.mag <= 4.5 ? t.magDark :
    view.mag <= 6 ? t.magLimit : t.magOptic;
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden="true">🪐</span>
      <span className={styles.text}>
        <strong>{label}</strong> — {state}
        {where}
        <span className={styles.dim}> · {tmpl(t.mag, { mag: view.mag.toFixed(1) })} ({hint})</span>
      </span>
    </li>
  );
}

/** Local Date → "YYYY-MM-DD" for formatDay. */
function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Stars tonight" — sky clarity × moonlight × light pollution, in the same 0–100 language as the sunset score. */
function StarsRow({ stars, illum, cloud, bortle }: { stars: Stargazing; illum: number; cloud: number | null; bortle: number | null }): JSX.Element {
  if (stars.score === null || stars.category === null) {
    return (
      <li className={styles.row}>
        <span className={styles.icon} aria-hidden="true">🌟</span>
        <span className={styles.text}>
          <strong>{t.starsTitle}</strong> — {t.starsNoData}
        </span>
      </li>
    );
  }
  const skyPart =
    cloud === null
      ? null
      : cloud < 0.3
        ? t.starsClear
        : cloud < 0.6
          ? t.skyPartly
          : t.skyCloudy;
  const moonPart =
    illum < 0.15
      ? t.moonless
      : illum < 0.5
        ? tmpl(t.moonDim, { illum: Math.round(illum * 100) })
        : tmpl(t.moonBrightShort, { illum: Math.round(illum * 100) });
  const skyKind =
    bortle === null
      ? null
      : bortle <= 2
        ? t.bortleDark
        : bortle <= 4
          ? t.bortleRural
          : bortle <= 6
            ? t.bortleSuburban
            : t.bortleCity;
  const bortlePart =
    bortle !== null && skyKind !== null ? tmpl(t.bortleLabel, { sky: skyKind, bortle }) : null;
  const reasons = [skyPart, moonPart, bortlePart].filter(Boolean).join(' · ');
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden="true">🌟</span>
      <span className={styles.text}>
        <strong>{t.starsTitle}</strong> — {stars.category} ·{' '}
        {tmpl(t.starsScore, { score: stars.score })}
        {reasons && <span className={styles.dim}> · {reasons}</span>}
      </span>
    </li>
  );
}

/** ☀️ Solar flares (NOAA SWPC) — a bonus row, rendered only with live data. */
function SolarRow({ sw }: { sw: SpaceWeather }): JSX.Element | null {
  const f = sw.flare;
  if (!f) return null;
  const category = f.ongoingClass ? flareCategory(f.ongoingClass) : flareCategory(f.lastMaxClass);
  const categoryLabel =
    category === 'quiet' ? t.flareQuiet : category === 'moderate' ? t.flareModerate : category === 'strong' ? t.flareStrong : t.flareExtreme;
  const ongoing = f.ongoingClass ? tmpl(t.flareOngoing, { cls: f.ongoingClass }) : '';
  const last =
    f.lastMaxClass && f.lastMaxTime
      ? tmpl(t.flareLast, { cls: f.lastMaxClass, time: formatUtcClock(f.lastMaxTime) })
      : t.noData;
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden="true">☀️</span>
      <span className={styles.text}>
        <strong>{t.solarTitle}</strong> — {categoryLabel}
        {ongoing && <span className={styles.dim}>{ongoing}</span>}
        <span className={styles.dim}> · {last}</span>
      </span>
    </li>
  );
}

/** 🧭 Planetary Kp index (NOAA SWPC) — calm/unsettled/storm, aurora hint. */
function GeoRow({ sw }: { sw: SpaceWeather }): JSX.Element | null {
  const k = sw.kp;
  if (!k || k.kp === null) return null;
  const category = kpCategory(k.kp);
  const label = category === 'calm' ? t.kpCalm : category === 'unsettled' ? t.kpUnsettled : t.kpStorm;
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden="true">🧭</span>
      <span className={styles.text}>
        <strong>{t.geoTitle}</strong> — {label} ({tmpl(t.kpValue, { kp: k.kp.toFixed(1) })})
        {k.kp >= 5 && <span className={styles.dim}> · {t.aurora}</span>}
      </span>
    </li>
  );
}

/** Full-width "Tonight's sky" card — planets, meteor showers, moon interference. */
export function SkyTonight({ location, cloudTonight = null, now = new Date() }: SkyTonightProps): JSX.Element {
  const showers = useMemo(() => meteorShowerStatus(now), [now]);
  const illum = useMemo(() => moonIllumination(now), [now]);
  // Light pollution from the embedded city table — an estimate, labeled as such.
  const bortle = useMemo(
    () => (location ? bortleFor(location.latitude, location.longitude) : null),
    [location],
  );
  const stars = useMemo(
    () => stargazingScore(cloudTonight ?? null, illum, lightFactor(bortle)),
    [cloudTonight, illum, bortle],
  );
  // Space weather (NOAA SWPC) — only with a location chosen, like the planets;
  // loading/error means the two bonus rows are simply absent.
  const space = useSpaceWeather(location !== null);
  const planets = useMemo(
    () =>
      location
        ? PLANETS.map(({ body, name }) => ({ name, view: planetVisibility(body, location, now) })).filter(
            (p) => p.view !== null,
          )
        : [],
    [location, now],
  );
  // "Where to look" disc — same evening moment the planet rows describe.
  const mapPoints = useMemo(() => (location ? skyMapPoints(location, now) : []), [location, now]);
  const mapTime = formatMoonTime(eveningWhen(now));
  // Moon passing a planet this week + tonight's moonrise pace/perigee — offline.
  const conjunctions = useMemo(() => (location ? moonConjunctions(location, now) : []), [location, now]);
  const rise = useMemo(() => (location ? moonriseInfo(location, now) : null), [location, now]);

  const activeShowers = showers
    .filter((s) => s.active)
    .sort((a, b) => b.zhrNow - a.zhrNow)
    .slice(0, ACTIVE_SHOWERS_MAX);
  const next = showers
    .filter((s) => !s.active && s.daysToPeak > 0)
    .sort((a, b) => a.daysToPeak - b.daysToPeak)[0];

  const moonBright = illum >= 0.5;

  return (
    <section className={styles.card} aria-label={t.ariaLabel}>
      <h3 className={styles.title}>{t.title}</h3>
      {location && mapPoints.length > 0 && <SkyMap points={mapPoints} time={mapTime} />}
      <ul className={styles.list}>
        {planets.map(({ name, view }) => (
          <PlanetRow key={name} name={name} view={view!} />
        ))}
        {planets.length === 0 && <li className={styles.row}>{t.needLocation}</li>}
        {conjunctions.slice(0, 2).map((c) => (
          <li key={`${c.dateKey}_${c.planet}`} className={styles.row}>
            <span className={styles.icon} aria-hidden="true">🌙</span>
            <span className={styles.text}>
              <strong>{formatDay(c.dateKey)}</strong> —{' '}
              {tmpl(t.moonNear, {
                planet: t.planets[c.planet] ?? c.planet,
                sep: c.sepDeg.toFixed(1),
                dir: compassPoint(c.azDeg),
              })}
            </span>
          </li>
        ))}
        {activeShowers.map((s) => (
          <li key={s.shower.name} className={styles.row}>
            <span className={styles.icon} aria-hidden="true">☄️</span>
            <span className={styles.text}>
              {tmpl(t.meteorActive, {
                name: s.shower.name,
                zhr: s.zhrNow,
                date: formatDay(isoDate(s.peak)),
              })}
            </span>
          </li>
        ))}
        {!activeShowers.length && next && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">☄️</span>
            <span className={styles.text}>
              {tmpl(t.meteorNext, {
                name: next.shower.name,
                zhr: next.shower.zhr,
                date: formatDay(isoDate(next.peak)),
                days: next.daysToPeak,
              })}
            </span>
          </li>
        )}
        <StarsRow stars={stars} illum={illum} cloud={cloudTonight ?? null} bortle={bortle} />
        <li className={styles.row}>
          <span className={styles.icon} aria-hidden="true">🌙</span>
          <span className={styles.text}>
            {moonBright ? tmpl(t.moonBright, { illum: Math.round(illum * 100) }) : t.moonDark}
          </span>
        </li>
        {rise && (
          <li className={styles.row}>
            <span className={styles.icon} aria-hidden="true">🌖</span>
            <span className={styles.text}>
              <strong>{t.moonriseTitle}</strong> —{' '}
              {rise.delayMin !== null &&
                (rise.delayMin < 35
                  ? tmpl(t.moonPaceFast, { min: rise.delayMin })
                  : tmpl(t.moonPace, { min: rise.delayMin }))}
              {rise.giant && rise.riseDistanceKm !== null && (
                <span className={styles.dim}>
                  {' · '}
                  {tmpl(t.moonGiant, { km: Math.round(rise.riseDistanceKm / 1000) * 1000 })}
                </span>
              )}
            </span>
          </li>
        )}
        {space.status === 'success' && space.data && (
          <>
            <SolarRow sw={space.data} />
            <GeoRow sw={space.data} />
          </>
        )}
      </ul>
    </section>
  );
}