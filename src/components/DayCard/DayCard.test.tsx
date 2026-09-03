import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayCard } from './DayCard';
import type { DayScore } from '../../types';

const mkDay = (
  sunriseScore: number | null,
  sunsetScore: number | null,
  sunriseTime: string | null = '2024-06-15T05:10',
  sunsetTime: string | null = '2024-06-15T21:10',
): DayScore => ({
  date: '2024-06-15',
  sunrise: {
    kind: 'sunrise',
    score: sunriseScore,
    category: sunriseScore === null ? null : sunriseScore >= 0.75 ? 'Great' : sunriseScore >= 0.5 ? 'Good' : sunriseScore >= 0.25 ? 'Fair' : 'Poor',
    eventTime: sunriseTime,
    hourScores: [],
    hourKeys: [],
  },
  sunset: {
    kind: 'sunset',
    score: sunsetScore,
    category: sunsetScore === null ? null : sunsetScore >= 0.75 ? 'Great' : sunsetScore >= 0.5 ? 'Good' : sunsetScore >= 0.25 ? 'Fair' : 'Poor',
    eventTime: sunsetTime,
    hourScores: [],
    hourKeys: [],
  },
  best: null,
});

describe('DayCard', () => {
  it('shows the date, times and badges', () => {
    render(<DayCard day={mkDay(0.8, 0.4)} />);
    expect(screen.getByText('Sat 15 Jun')).toBeInTheDocument();
    expect(screen.getByText('05:10')).toBeInTheDocument();
    expect(screen.getByText('21:10')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('polar event → "doesn\'t rise/doesn\'t set"', () => {
    render(<DayCard day={mkDay(null, null, null, null)} />);
    expect(screen.getByText("doesn't rise")).toBeInTheDocument();
    expect(screen.getByText("doesn't set")).toBeInTheDocument();
  });

  it('isBest → the "★ Best" tag', () => {
    render(<DayCard day={mkDay(0.9, 0.6)} isBest />);
    expect(screen.getByText('★ Best')).toBeInTheDocument();
  });

  it('isToday → the "Today" pill', () => {
    render(<DayCard day={mkDay(0.9, 0.6)} isToday />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('without isToday it shows no "Today" pill', () => {
    render(<DayCard day={mkDay(0.9, 0.6)} />);
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('click calls onSelect', () => {
    const onSelect = vi.fn();
    render(<DayCard day={mkDay(0.5, 0.6)} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Sat 15 Jun'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('the Enter key activates the card (role=button)', () => {
    const onSelect = vi.fn();
    render(<DayCard day={mkDay(0.5, 0.6)} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Sat 15 Jun/ }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('DayCard — confidence', () => {
  it('without lowConfidence it shows no caption', () => {
    render(<DayCard day={mkDay(0.5, 0.6)} />);
    expect(screen.queryByText('less confident')).toBeNull();
  });

  it('lowConfidence shows a muted caption', () => {
    render(<DayCard day={mkDay(0.5, 0.6)} lowConfidence />);
    expect(screen.getByText('less confident')).toBeInTheDocument();
  });
});

describe('DayCard — forecast weather', () => {
  it('a non-today day with weather shows range, wind and rain chips', () => {
    const day = mkDay(0.5, 0.6);
    day.weather = {
      tempNow: null,
      humidityNow: null,
      tMin: 12.1,
      tMax: 23.6,
      windMaxKmh: 14,
      gustsKmh: 33,
      windDirDeg: 315,
      precipProb: 20,
      precipSumMm: 0.2,
      cloudNight: null,
      code: 1,
      uvNow: null,
      uvMax: 5,
      uvWindow: { from: '10:00', to: '17:00' },
    };
    render(<DayCard day={day} />);
    expect(screen.getByText('Mainly clear')).toBeInTheDocument();
    expect(screen.getByText('🌡 12–24°')).toBeInTheDocument();
    expect(screen.getByText('💨 Wind 14 km/h NW')).toBeInTheDocument();
    expect(screen.getByText('☔ Rain 20%')).toBeInTheDocument();
    // "Now" values have no forecast-day meaning — never rendered.
    expect(screen.queryByText(/Humidity/)).toBeNull();
  });

  it('today\'s tile shows the weather line too, including the "now" values', () => {
    const day = mkDay(0.5, 0.6);
    day.weather = {
      tempNow: 21, humidityNow: 46, tMin: 12, tMax: 23, windMaxKmh: 14, gustsKmh: 33,
      windDirDeg: 315, precipProb: 20, precipSumMm: 0.2, cloudNight: 0.15, code: 1,
      uvNow: 5, uvMax: 6, uvWindow: { from: '10:00', to: '17:00' },
    };
    render(<DayCard day={day} isToday />);
    expect(screen.getByText(/Wind/)).toBeInTheDocument();
    expect(screen.getByText(/Rain/)).toBeInTheDocument();
    expect(screen.getByText('💧 Humidity 46%')).toBeInTheDocument();
  });

  it('a day without weather shows no weather row', () => {
    render(<DayCard day={mkDay(0.5, 0.6)} />);
    expect(screen.queryByText(/Rain/)).toBeNull();
  });
});