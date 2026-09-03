import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DayScore, Location } from './types';
import { useForecast } from './hooks/useForecast';
import { useAirQuality } from './hooks/useAirQuality';
import { useLocationSync } from './hooks/useLocationSync';
import { useTheme } from './hooks/useTheme';
import { bestDayIndex } from './lib/forecast';
import { formatDay } from './lib/format';
import { todayStr, daysAhead } from './lib/date';
import { pageHref } from './lib/url';
import { LOW_CONFIDENCE_DAYS_AHEAD } from './constants/endpoints';
import { STRINGS } from './i18n/strings';
import { Header } from './components/Header/Header';
import { LocationPicker } from './components/LocationPicker/LocationPicker';
import { LocationHighlight } from './components/LocationHighlight/LocationHighlight';
import { ForecastList } from './components/ForecastList/ForecastList';
import { TodayCard } from './components/TodayCard/TodayCard';
import { SkyTonight } from './components/SkyTonight/SkyTonight';
import { AirQualityCard } from './components/AirQualityCard/AirQualityCard';
import { DayDetail } from './components/DayDetail/DayDetail';
import { Legend } from './components/Legend/Legend';
import styles from './App.module.css';

const t = STRINGS;

export function App(): JSX.Element {
  const [theme, toggleTheme] = useTheme();
  const { location, setLocation, recents, removeRecent } = useLocationSync();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const forecast = useForecast(location);
  // Independent health source — its failure must never touch the forecast.
  const air = useAirQuality(location);
  const dark = theme === 'dark';

  // Freeze "today" at mount time — the "has the day passed" comparison must not
  // shift while the user is viewing the forecast.
  const today = useMemo(() => todayStr(), []);

  // A location change resets the selected day.
  useEffect(() => {
    setSelectedIndex(null);
  }, [location]);

  // When the forecast loads, open the best day automatically.
  useEffect(() => {
    if (forecast.status === 'success' && forecast.data && selectedIndex === null) {
      const best = bestDayIndex(forecast.data);
      setSelectedIndex(best ?? 0);
    }
  }, [forecast.status, forecast.data, selectedIndex]);

  const selectLocation = useCallback((loc: Location) => setLocation(loc), [setLocation]);

  // Far days of the horizon (>= LOW_CONFIDENCE_DAYS_AHEAD from today) are less reliable.
  const isLowConfidence = useCallback(
    (day: DayScore) => daysAhead(day.date, today) >= LOW_CONFIDENCE_DAYS_AHEAD,
    [today],
  );

  const selectedDay =
    selectedIndex !== null && forecast.data ? forecast.data[selectedIndex] ?? null : null;

  // Today's own day card — the first row of the page. Today can be absent from
  // the returned horizon (shouldn't happen, but the card then just stays off).
  const todayIndex = forecast.data ? forecast.data.findIndex((d) => d.date === today) : -1;
  const todayDay = forecast.data && todayIndex >= 0 ? forecast.data[todayIndex] : null;

  const nav = [
    { label: t.header.pageForecast, href: pageHref('sun', location), active: true },
    { label: t.header.pageMoon, href: pageHref('moon', location), active: false },
  ];

  return (
    <div className={styles.app}>
      <Header theme={theme} onToggleTheme={toggleTheme} nav={nav} />

      <main className={styles.main}>
        <section className={styles.hero} aria-label={t.app.heroLabel}>
          <div className={styles.heroCol}>
            <h2 className={styles.heroTitle}>{t.app.heroTitle}</h2>
            <p className={styles.heroText}>{t.app.heroText}</p>
            <LocationPicker
              current={location}
              onSelectLocation={selectLocation}
              recents={recents}
              onRemoveRecent={removeRecent}
            />
          </div>
          {location && <LocationHighlight location={location} />}
        </section>

        {location && todayDay && (
          <TodayCard
            day={todayDay}
            air={air.data}
            onSelect={() => setSelectedIndex(todayIndex)}
          />
        )}

        {location && (
          <ForecastList
            days={forecast.data}
            status={forecast.status}
            error={forecast.error}
            selectedIndex={selectedIndex}
            onSelectDay={setSelectedIndex}
            onRetry={forecast.refetch}
            isLowConfidence={isLowConfidence}
            today={today}
          />
        )}

        {selectedDay && (
          <section className={styles.chartWrap} aria-label={t.app.chartWrapLabel}>
            <p className={styles.selectedDay}>{formatDay(selectedDay.date)}</p>
            <DayDetail day={selectedDay} dark={dark} />
          </section>
        )}

        <SkyTonight location={location} cloudTonight={todayDay?.weather?.cloudNight ?? null} />

        {/* Renders nothing while loading/error — the page never waits on air quality. */}
        {location && <AirQualityCard air={air.data} />}

        <Legend />
      </main>

      <footer className={styles.footer}>{t.app.footer}</footer>
    </div>
  );
}