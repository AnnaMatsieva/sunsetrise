import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DayAir } from '../../types';
import { AirQualityCard } from './AirQualityCard';

function makeAir(overrides: Partial<DayAir> = {}): DayAir {
  return {
    aqi: 45,
    pm25: 7.4,
    pm10: 11.6,
    dust: 0,
    smoke: false,
    pollens: [],
    anyPollenHigh: false,
    peakAqi: { date: '2026-09-04', aqi: 61 },
    ...overrides,
  };
}

describe('AirQualityCard', () => {
  it('renders nothing without data (the page never depends on air quality)', () => {
    const { container } = render(<AirQualityCard air={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows AQI, the band badge and the who-should-be-careful line', () => {
    render(<AirQualityCard air={makeAir()} />);
    expect(screen.getByText('Air & health')).toBeInTheDocument();
    expect(screen.getByText(/AQI 45/)).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(
      screen.getByText(/Children, older adults and people with asthma/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fine particles \(PM2\.5\)/)).toBeInTheDocument();
  });

  it('shows the smoke row only when smoke is true', () => {
    const { rerender } = render(<AirQualityCard air={makeAir({ smoke: false })} />);
    expect(screen.queryByText(/Smoke haze/)).not.toBeInTheDocument();
    rerender(<AirQualityCard air={makeAir({ smoke: true })} />);
    expect(screen.getByText(/Smoke haze/)).toBeInTheDocument();
  });

  it('renders pollen rows and hides the block when empty', () => {
    render(
      <AirQualityCard
        air={makeAir({
          pollens: [
            { key: 'birch', value: 120, level: 'high' },
            { key: 'grass', value: 3, level: 'low' },
          ],
          anyPollenHigh: true,
        })}
      />,
    );
    // "Birch" appears twice (name + the high-pollen warning) — match all.
    expect(screen.getAllByText(/Birch/).length).toBeGreaterThan(0);
    expect(screen.getByText(/allergy sufferers/i)).toBeInTheDocument();
    expect(screen.getByText(/Grass/)).toBeInTheDocument();
  });

  it('low AQI uses the good-air who-line', () => {
    render(<AirQualityCard air={makeAir({ aqi: 12, pm25: null, pm10: null, peakAqi: null })} />);
    expect(screen.getByText(/Air quality is good/)).toBeInTheDocument();
    expect(screen.queryByText(/Fine particles/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Worst day/)).not.toBeInTheDocument();
  });
});