import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkyMap, skyPointXY } from './SkyMap';
import type { SkyPoint } from '../../lib/sky';

const jupiterEast: SkyPoint = { name: 'Jupiter', kind: 'planet', azDeg: 100, altDeg: 30, mag: -2.1, rise: null };
const moonSouth: SkyPoint = { name: 'Moon', kind: 'moon', azDeg: 180, altDeg: 45, mag: null, rise: null };

describe('skyPointXY', () => {
  it('N is up, E is right, S is down, W is left', () => {
    expect(skyPointXY(0, 0).y).toBeLessThan(skyPointXY(90, 0).y); // N above E
    expect(skyPointXY(90, 0).x).toBeGreaterThan(skyPointXY(270, 0).x); // E right of W
    expect(skyPointXY(180, 0).y).toBeGreaterThan(skyPointXY(0, 0).y); // S below N
  });

  it('altitude pulls the marker toward the center', () => {
    const rim = skyPointXY(90, 0);
    const high = skyPointXY(90, 60);
    expect(Math.abs(high.x - 100)).toBeLessThan(Math.abs(rim.x - 100));
  });
});

describe('SkyMap', () => {
  it('renders the compass labels and one labeled marker per point', () => {
    render(<SkyMap points={[jupiterEast, moonSouth]} time="22:00" />);
    for (const dir of ['N', 'E', 'S', 'W']) {
      expect(screen.getByText(dir)).toBeInTheDocument();
    }
    expect(screen.getByText('Jupiter')).toBeInTheDocument();
    expect(screen.getByText('Moon')).toBeInTheDocument();
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toMatch(/Jupiter/);
    expect(svg.getAttribute('aria-label')).toMatch(/above the horizon/);
  });

  it('a rising-later point gets a dim marker with the rise time in the label', () => {
    const later: SkyPoint = { name: 'Jupiter', kind: 'planet', azDeg: 80, altDeg: 0, mag: -2, rise: new Date(2026, 8, 4, 3, 14) };
    render(<SkyMap points={[later]} time="22:00" />);
    expect(screen.getByText('Jupiter ↑ 03:14')).toBeInTheDocument();
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toMatch(/below the horizon now, rises at 03:14/);
  });

  it('a reference star is drawn by its name as a quiet landmark', () => {
    const vega: SkyPoint = { name: 'Vega', kind: 'star', azDeg: 300, altDeg: 70, mag: null, rise: null };
    render(<SkyMap points={[vega]} time="22:00" />);
    expect(screen.getByText('Vega')).toBeInTheDocument();
  });

  it('a shower radiant is drawn by its shower name', () => {
    const perseids: SkyPoint = { name: 'Perseids', kind: 'shower', azDeg: 40, altDeg: 55, mag: null, rise: null };
    render(<SkyMap points={[perseids]} time="22:00" />);
    expect(screen.getByText('Perseids')).toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Perseids — 55° above the horizon/);
  });

  it('no points → renders nothing', () => {
    const { container } = render(<SkyMap points={[]} time="22:00" />);
    expect(container).toBeEmptyDOMElement();
  });
});