import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoonCalendar } from './MoonCalendar';
import { monthMoonCalendar } from '../../lib/moon';

const days = monthMoonCalendar(2026, 2, null); // March 2026, no location

function renderCal(): void {
  render(
    <MoonCalendar
      days={days}
      monthLabel="March 2026"
      onPrevMonth={() => {}}
      onNextMonth={() => {}}
    />,
  );
}

describe('MoonCalendar', () => {
  it('renders the month label, weekday header starting Monday, and 42 cells', () => {
    renderCal();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    // Every cell has an accessible label mentioning its date and phase.
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(42);
    expect(cells[0]).toHaveAttribute('aria-label', expect.stringContaining('2026-02-23'));
  });

  it('the full-moon cell is highlighted with an event marker', () => {
    renderCal();
    const cell = screen.getByLabelText(/2026-03-03: Full moon/);
    expect(cell).toHaveAttribute('data-event', 'full');
  });

  it('the today cell gets the accent outline class, others do not', () => {
    render(
      <MoonCalendar
        days={days}
        monthLabel="March 2026"
        todayKey="2026-03-05"
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
      />,
    );
    const today = screen.getByLabelText(/2026-03-05:/);
    expect(today.className).toMatch(/today/i);
    const other = screen.getByLabelText(/2026-03-06:/);
    expect(other.className).not.toMatch(/today/);
  });

  it('month navigation buttons fire callbacks', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <MoonCalendar
        days={days}
        monthLabel="March 2026"
        onPrevMonth={onPrev}
        onNextMonth={onNext}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});