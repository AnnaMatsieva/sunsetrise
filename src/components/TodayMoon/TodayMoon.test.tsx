import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayMoon } from './TodayMoon';
import type { TodayMoonInfo } from '../../lib/moon';

const mkDay = (over: Partial<TodayMoonInfo> = {}): TodayMoonInfo => ({
  date: '2026-09-02',
  inMonth: true,
  illumination: 0.64,
  phaseAngle: 250,
  phaseIcon: '🌖',
  phaseName: 'waningGibbous',
  moonrise: new Date(2026, 8, 2, 22, 41),
  moonset: new Date(2026, 8, 2, 8, 13),
  isFullMoon: false,
  isNewMoon: false,
  supermoon: false,
  ...over,
});

describe('TodayMoon', () => {
  it('shows the phase name, illumination and rise/set times', () => {
    render(<TodayMoon day={mkDay()} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Waning gibbous')).toBeInTheDocument();
    expect(screen.getByText('64% illuminated')).toBeInTheDocument();
    expect(screen.getByText('↑ 22:41')).toBeInTheDocument();
    expect(screen.getByText('↓ 08:13')).toBeInTheDocument();
  });

  it('without a location the times fall back to dashes', () => {
    render(<TodayMoon day={mkDay({ moonrise: null, moonset: null })} />);
    expect(screen.getByText('↑ —')).toBeInTheDocument();
    expect(screen.getByText('↓ —')).toBeInTheDocument();
  });

  it('a full-moon day shows the "Full moon day" badge', () => {
    render(<TodayMoon day={mkDay({ isFullMoon: true, illumination: 0.99 })} />);
    expect(screen.getByText('Full moon day')).toBeInTheDocument();
  });

  it('a supermoon day is labeled "Supermoon"', () => {
    render(<TodayMoon day={mkDay({ isFullMoon: true, supermoon: true })} />);
    expect(screen.getByText('Supermoon')).toBeInTheDocument();
  });

  it('a new-moon day shows the "New moon day" badge', () => {
    render(<TodayMoon day={mkDay({ isNewMoon: true, illumination: 0.01 })} />);
    expect(screen.getByText('New moon day')).toBeInTheDocument();
  });

  it('an ordinary day shows no badge', () => {
    render(<TodayMoon day={mkDay()} />);
    expect(screen.queryByText('Full moon day')).toBeNull();
    expect(screen.queryByText('New moon day')).toBeNull();
  });
});