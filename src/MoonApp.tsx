import { useMemo, useState } from 'react';
import type { Location } from './types';
import { useTheme } from './hooks/useTheme';
import { useLocationSync } from './hooks/useLocationSync';
import { monthMoonCalendar, monthMoonEvents, moonDayFor } from './lib/moon';
import { useForecast } from './hooks/useForecast';
import { todayStr } from './lib/date';
import { pageHref } from './lib/url';
import { STRINGS } from './i18n/strings';
import { Header } from './components/Header/Header';
import { LocationPicker } from './components/LocationPicker/LocationPicker';
import { LocationHighlight } from './components/LocationHighlight/LocationHighlight';
import { MoonCalendar } from './components/MoonCalendar/MoonCalendar';
import { MoonEventsList } from './components/MoonEventsList/MoonEventsList';
import { TodayMoon } from './components/TodayMoon/TodayMoon';
import { SkyTonight } from './components/SkyTonight/SkyTonight';
import styles from './MoonApp.module.css';

const t = STRINGS;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function MoonApp(): JSX.Element {
  const [theme, toggleTheme] = useTheme();
  const { location, setLocation, recents, removeRecent } = useLocationSync();
  // Tonight's cloud cover for the "Stars tonight" row — same open Open-Meteo
  // source as the forecast page, cached per location.
  const forecast = useForecast(location);
  // The viewed month: a Date anchored on the 1st (0-indexed month inside).
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthIdx = month.getMonth();

  const days = useMemo(
    () => monthMoonCalendar(year, monthIdx, location),
    [year, monthIdx, location],
  );
  const events = useMemo(
    () => monthMoonEvents(year, monthIdx, location),
    [year, monthIdx, location],
  );

  // "Today" is frozen at mount — like the sun page, so the card never shifts.
  const today = useMemo(() => new Date(), []);
  const todayMoon = useMemo(() => moonDayFor(today, location), [today, location]);
  const todayKey = todayStr(today);
  const cloudTonight =
    forecast.data?.find((d) => d.date === todayKey)?.weather?.cloudNight ?? null;

  const selectLocation = (loc: Location) => setLocation(loc);

  const nav = [
    { label: t.header.pageForecast, href: pageHref('sun', location), active: false },
    { label: t.header.pageMoon, href: pageHref('moon', location), active: true },
  ];

  return (
    <div className={styles.app}>
      <Header theme={theme} onToggleTheme={toggleTheme} nav={nav} />

      <main className={styles.main}>
        <section className={styles.hero} aria-label={t.moon.pageLabel}>
          <div className={styles.heroCol}>
            <h2 className={styles.heroTitle}>{t.moon.heroTitle}</h2>
            <p className={styles.heroText}>{t.moon.heroText}</p>
            <LocationPicker
              current={location}
              onSelectLocation={selectLocation}
              recents={recents}
              onRemoveRecent={removeRecent}
            />
          </div>
          {location && <LocationHighlight location={location} />}
        </section>

        <TodayMoon day={todayMoon} />

        <MoonCalendar
          days={days}
          todayKey={todayMoon.date}
          monthLabel={`${MONTH_NAMES[monthIdx] ?? ''} ${year}`}
          onPrevMonth={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          onNextMonth={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
        />

        {!location && (
          <p className={styles.noLocation}>{t.moon.noLocation}</p>
        )}

        <SkyTonight location={location} cloudTonight={cloudTonight} now={today} />

        <MoonEventsList events={events} />
      </main>

      <footer className={styles.footer}>{t.moon.footer}</footer>
    </div>
  );
}