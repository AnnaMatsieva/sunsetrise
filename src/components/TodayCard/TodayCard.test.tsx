import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayCard } from './TodayCard';
import type { DayScore } from '../../types';

const mkDay = (sunriseScore: number | null, sunsetScore: number | null): DayScore => ({
  date: '2024-06-15',
  sunrise: {
    kind: 'sunrise',
    score: sunriseScore,
    category:
      sunriseScore === null ? null : sunriseScore >= 0.75 ? 'Great' : sunriseScore >= 0.5 ? 'Good' : sunriseScore >= 0.25 ? 'Fair' : 'Poor',
    eventTime: '2024-06-15T05:10',
    hourScores: [],
    hourKeys: [],
  },
  sunset: {
    kind: 'sunset',
    score: sunsetScore,
    category:
      sunsetScore === null ? null : sunsetScore >= 0.75 ? 'Great' : sunsetScore >= 0.5 ? 'Good' : sunsetScore >= 0.25 ? 'Fair' : 'Poor',
    eventTime: '2024-06-15T21:10',
    hourScores: [],
    hourKeys: [],
  },
  best: null,
});

describe('TodayCard', () => {
  it('shows the "Today" tag, the date and both events with badges', () => {
    render(<TodayCard day={mkDay(0.8, 0.4)} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Sat 15 Jun')).toBeInTheDocument();
    expect(screen.getByText('05:10')).toBeInTheDocument();
    expect(screen.getByText('21:10')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('polar event → "doesn\'t rise"', () => {
    const day = mkDay(null, 0.5);
    day.sunrise.eventTime = null;
    render(<TodayCard day={day} />);
    expect(screen.getByText("doesn't rise")).toBeInTheDocument();
  });

  it('shows the weather line: condition, temp, humidity, wind, rain', () => {
    const day = mkDay(0.8, 0.4);
    day.weather = {
      tempNow: 21.4,
      humidityNow: 46,
      tMin: 12.1,
      tMax: 23.6,
      windMaxKmh: 14,
      gustsKmh: 33,
      windDirDeg: 315,
      precipProb: 20,
      precipSumMm: 0.2,
      cloudNight: 0.15,
      code: 1,
      uvNow: null,
      uvMax: 5,
      uvWindow: { from: '10:00', to: '17:00' },
    };
    render(<TodayCard day={day} />);
    expect(screen.getByText('Mainly clear')).toBeInTheDocument();
    // The temp chip is split into text + nested range span — match by textContent.
    expect(
      screen.getByText((_, el) => el?.textContent === '🌡 21° (12–24°)'),
    ).toBeInTheDocument();
    expect(screen.getByText('💧 Humidity 46%')).toBeInTheDocument();
    expect(screen.getByText('💨 Wind 14 km/h NW')).toBeInTheDocument();
    expect(screen.getByText('☔ Rain 20%')).toBeInTheDocument();
  });

  it('no weather → no weather line', () => {
    render(<TodayCard day={mkDay(0.8, 0.4)} />);
    expect(screen.queryByText(/Humidity/)).toBeNull();
  });

  it('shows the AQI chip with the band name', () => {
    render(<TodayCard day={mkDay(0.8, 0.4)} air={{ aqi: 25, pm25: null, pm10: null, dust: null, smoke: null, pollens: [], anyPollenHigh: false, peakAqi: null }} />);
    // The chip renders as "🫁 " + "AQI 25 (Fair)" — match the span by full text.
    expect(
      screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '🫁 AQI 25 (Fair)'),
    ).toBeInTheDocument();
  });

  it('air with unknown AQI and no air → no AQI chip', () => {
    render(<TodayCard day={mkDay(0.8, 0.4)} air={{ aqi: null, pm25: null, pm10: null, dust: null, smoke: null, pollens: [], anyPollenHigh: false, peakAqi: null }} />);
    expect(screen.queryByText(/AQI/)).toBeNull();
    render(<TodayCard day={mkDay(0.8, 0.4)} />);
    expect(screen.queryByText(/AQI/)).toBeNull();
  });

  it('click calls onSelect', () => {
    const onSelect = vi.fn();
    render(<TodayCard day={mkDay(0.5, 0.6)} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Today at a glance/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('the Enter key activates the card (role=button)', () => {
    const onSelect = vi.fn();
    render(<TodayCard day={mkDay(0.5, 0.6)} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /Today at a glance/ }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});