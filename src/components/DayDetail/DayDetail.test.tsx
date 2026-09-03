import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DayDetail } from './DayDetail';
import type { DayScore, EventScore, EventKind, QualityCategory } from '../../types';

function event(
  kind: EventKind,
  score: number | null,
  time: string | null,
  withHours = true,
): EventScore {
  const category: QualityCategory | null =
    score === null ? null : score >= 0.75 ? 'Great' : score >= 0.5 ? 'Good' : score >= 0.25 ? 'Fair' : 'Poor';
  return {
    kind,
    score,
    category,
    eventTime: time,
    hourScores: withHours
      ? [0.2, 0.3, 0.5, score ?? 0.5, 0.4, 0.3, 0.2]
      : [],
    hourKeys: withHours
      ? ['2024-06-15T18', '2024-06-15T19', '2024-06-15T20', '2024-06-15T21', '2024-06-15T22', '2024-06-15T23', '2024-06-16T00']
      : [],
  };
}

function day(sunriseScore: number | null, sunsetScore: number | null): DayScore {
  const sunrise = event('sunrise', sunriseScore, sunriseScore === null ? null : '2024-06-15T05:10');
  const sunset = event('sunset', sunsetScore, sunsetScore === null ? null : '2024-06-15T21:18');
  const best =
    sunriseScore === null && sunsetScore === null
      ? null
      : sunriseScore === null
        ? sunset
        : sunsetScore === null
          ? sunrise
          : sunriseScore >= sunsetScore
            ? sunrise
            : sunset;
  return { date: '2024-06-15', sunrise, sunset, best };
}

describe('DayDetail', () => {
  it('opens the best event of the day (sunset) by default', () => {
    render(<DayDetail day={day(0.4, 0.9)} dark={false} />);
    const sunsetTab = screen.getByRole('tab', { name: /Sunset/ });
    const sunriseTab = screen.getByRole('tab', { name: /Sunrise/ });
    expect(sunsetTab).toHaveAttribute('aria-selected', 'true');
    expect(sunriseTab).toHaveAttribute('aria-selected', 'false');
    // The chart shows the sunset.
    expect(screen.getAllByText(/Hourly score for Sunset/).length).toBeGreaterThan(0);
  });

  it('clicking "Sunrise" switches the chart', () => {
    render(<DayDetail day={day(0.4, 0.9)} dark={false} />);
    fireEvent.click(screen.getByRole('tab', { name: /Sunrise/ }));
    expect(screen.getByRole('tab', { name: /Sunrise/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText(/Hourly score for Sunrise/).length).toBeGreaterThan(0);
  });

  it('the tabs show each event\'s score', () => {
    render(<DayDetail day={day(0.4, 0.9)} dark={false} />);
    const sunriseTab = screen.getByRole('tab', { name: /Sunrise/ });
    const sunsetTab = screen.getByRole('tab', { name: /Sunset/ });
    // 40 — sunrise, 90 — sunset (numbers on the badges inside the tabs).
    expect(within(sunriseTab).getByText('40')).toBeInTheDocument();
    expect(within(sunsetTab).getByText('90')).toBeInTheDocument();
  });

  it('switching to a polar event shows a message', () => {
    // Sunrise doesn't rise (null), sunset exists.
    render(<DayDetail day={day(null, 0.9)} dark={false} />);
    fireEvent.click(screen.getByRole('tab', { name: /Sunrise/ }));
    expect(screen.getByText('Sun does not rise')).toBeInTheDocument();
  });
});