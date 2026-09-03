import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HourlyChart } from './HourlyChart';
import type { EventScore } from '../../types';
import { CATEGORY_COLORS, CATEGORY_COLORS_DARK } from '../../constants/colors';

function makeEvent(overrides: Partial<EventScore> = {}): EventScore {
  return {
    kind: 'sunset',
    score: 0.82,
    category: 'Great',
    eventTime: '2024-06-15T21:18',
    hourScores: [0.2, 0.3, 0.6, 0.85, 0.7, 0.4, 0.1],
    hourKeys: [
      '2024-06-15T18',
      '2024-06-15T19',
      '2024-06-15T20',
      '2024-06-15T21',
      '2024-06-15T22',
      '2024-06-15T23',
      '2024-06-16T00',
    ],
    ...overrides,
  };
}

describe('HourlyChart', () => {
  it('draws 7 bars with numeric labels and the overall score', () => {
    render(<HourlyChart event={makeEvent()} dark={false} />);
    // 7 numeric labels above the bars.
    for (const v of ['20', '30', '60', '85', '70', '40', '10']) {
      expect(screen.getByText(v)).toBeInTheDocument();
    }
    // Title and overall score.
    expect(screen.getAllByText(/Sunset/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/score 82 of 100/).length).toBeGreaterThan(0);
  });

  it('colors the bar by category via --bar from colors.ts', () => {
    render(<HourlyChart event={makeEvent()} dark={false} />);
    // The bar with the peak score 85 → Great → color #be185d.
    const bar = screen.getByText('85').parentElement!;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('style')).toContain(CATEGORY_COLORS.Great.bar);
  });

  it('uses the dark palette when dark=true', () => {
    render(<HourlyChart event={makeEvent()} dark={true} />);
    const bar = screen.getByText('85').parentElement!;
    expect(bar.getAttribute('style')).toContain(CATEGORY_COLORS_DARK.Great.bar);
  });

  it('a null slot renders "no data" without a number', () => {
    const hourScores: (number | null)[] = [null, 0.3, 0.6, 0.85, 0.7, 0.4, null];
    render(<HourlyChart event={makeEvent({ hourScores })} dark={false} />);
    // There must be no 20 and 10 numbers (edge null buckets).
    expect(screen.queryByText('20')).toBeNull();
    expect(screen.queryByText('10')).toBeNull();
    // The sr-only table reports "no data" for the edges.
    const noData = screen.getAllByText('no data');
    expect(noData.length).toBeGreaterThanOrEqual(2);
  });

  it('polar night → a message instead of the chart', () => {
    render(
      <HourlyChart
        event={makeEvent({ kind: 'sunrise', score: null, category: null, eventTime: null, hourScores: [], hourKeys: [] })}
        dark={false}
      />,
    );
    expect(screen.getByText('Sun does not rise')).toBeInTheDocument();
    expect(screen.queryByText('85')).toBeNull();
  });

  it('shows a tooltip with hour, score and category on hover', () => {
    render(<HourlyChart event={makeEvent()} dark={false} />);
    const cols = screen.getAllByRole('img');
    // 4th column (offset 0, the event) — score 85, Great.
    const eventCol = cols[3];
    expect(eventCol).toBeDefined();
    fireEvent.mouseEnter(eventCol!);
    expect(screen.getByText(/Score 85 of 100/)).toBeInTheDocument();
    expect(screen.getByText('Great')).toBeInTheDocument();
    fireEvent.mouseLeave(eventCol!);
    expect(screen.queryByText(/Score 85 of 100/)).toBeNull();
  });

  it('the sr-only table has 7 rows with scores and categories', () => {
    render(<HourlyChart event={makeEvent()} dark={false} />);
    // Offsets H-3..H+3 are the row headers.
    for (const off of ['H-3', 'H-2', 'H-1', 'H', 'H+1', 'H+2', 'H+3']) {
      expect(screen.getByText(off)).toBeInTheDocument();
    }
    // Category of the peak hour.
    expect(screen.getAllByText('Great').length).toBeGreaterThan(0);
  });

  it('marks the event bucket with an icon', () => {
    const { container } = render(<HourlyChart event={makeEvent()} dark={false} />);
    // The sunset icon 🌇 is present on the axis.
    expect(container.textContent).toContain('🌇');
  });
});