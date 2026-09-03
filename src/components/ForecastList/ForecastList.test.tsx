import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForecastList } from './ForecastList';
import type { DayScore } from '../../types';

const cat = (s: number | null) => (s === null ? null : s >= 0.5 ? 'Good' : 'Fair');

const mkEvent = (kind: 'sunrise' | 'sunset', s: number | null, time: string): DayScore['sunrise'] => ({
  kind,
  score: s,
  category: cat(s),
  eventTime: time,
  hourScores: [],
  hourKeys: [],
});

const day = (date: string, ss: number | null, sn: number | null): DayScore => {
  const sunrise = mkEvent('sunrise', ss, `${date}T05:10`);
  const sunset = mkEvent('sunset', sn, `${date}T21:10`);
  const best =
    ss === null && sn === null ? null : ss === null ? sunset : sn === null ? sunrise : ss >= sn ? sunrise : sunset;
  return { date, sunrise, sunset, best };
};

const days: DayScore[] = [day('2024-06-15', 0.4, 0.2), day('2024-06-16', 0.6, 0.9)];

describe('ForecastList', () => {
  it('loading → 7 skeletons', () => {
    render(<ForecastList days={null} status="loading" error={null} selectedIndex={null} onSelectDay={vi.fn()} />);
    expect(screen.getByLabelText('Loading forecast')).toBeInTheDocument();
    expect(document.querySelectorAll('[aria-busy="true"] > *').length + 0).toBeGreaterThanOrEqual(7);
  });

  it('error → ErrorState with a message', () => {
    render(<ForecastList days={null} status="error" error="Network unavailable" selectedIndex={null} onSelectDay={vi.fn()} />);
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
  });

  it('success → best-day banner + cards', () => {
    render(<ForecastList days={days} status="success" error={null} selectedIndex={null} onSelectDay={vi.fn()} />);
    // Best is 2024-06-16 (0.9).
    expect(screen.getByText(/Best moment of the week/)).toBeInTheDocument();
    expect(screen.getByText('★ Best')).toBeInTheDocument();
  });

  it('idle → renders nothing', () => {
    const { container } = render(<ForecastList days={null} status="idle" error={null} selectedIndex={null} onSelectDay={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('isLowConfidence marks only the right days as "less confident"', () => {
    render(
      <ForecastList
        days={days}
        status="success"
        error={null}
        selectedIndex={null}
        onSelectDay={vi.fn()}
        isLowConfidence={(d) => d.date === '2024-06-16'}
      />,
    );
    // 2024-06-16 is marked, 2024-06-15 is not.
    const labels = screen.getAllByText('less confident');
    expect(labels).toHaveLength(1);
  });
});