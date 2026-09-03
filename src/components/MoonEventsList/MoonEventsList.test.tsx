import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoonEventsList } from './MoonEventsList';
import type { MoonMonthEvents } from '../../lib/moon';

const mkEvents = (over: Partial<MoonMonthEvents> = {}): MoonMonthEvents => ({
  fullMoons: [
    { date: '2026-09-26', timeUtc: new Date(2026, 8, 26, 18, 49) }, // local — by construction
  ],
  newMoons: [
    { date: '2026-09-11', timeUtc: new Date(2026, 8, 11, 3, 27) },
  ],
  supermoons: [],
  lunarEclipses: [],
  solarEclipses: [],
  ...over,
});

describe('MoonEventsList', () => {
  it('renders date on the left and the event on the right', () => {
    render(<MoonEventsList events={mkEvents()} />);
    expect(screen.getByText('Sat 26 Sep')).toBeInTheDocument();
    expect(screen.getByText('Full moon')).toBeInTheDocument();
    expect(screen.getByText('18:49')).toBeInTheDocument();
    expect(screen.getByText('New moon')).toBeInTheDocument();
  });

  it('sorts rows chronologically regardless of event type', () => {
    render(
      <MoonEventsList
        events={mkEvents({
          fullMoons: [{ date: '2026-09-26', timeUtc: new Date(2026, 8, 26, 18, 49) }],
          newMoons: [{ date: '2026-09-11', timeUtc: new Date(2026, 8, 11, 3, 27) }],
        })}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('Fri 11 Sep');
    expect(items[1]?.textContent).toContain('Sat 26 Sep');
  });

  it('eclipses and supermoons get the special accent treatment', () => {
    render(
      <MoonEventsList
        events={mkEvents({
          supermoons: [
            { date: '2026-09-26', timeUtc: new Date(2026, 8, 26, 18, 49), distKm: 359_200 },
          ],
          lunarEclipses: [
            { date: '2026-09-03', timeUtc: new Date(2026, 8, 3, 15, 12), kind: 'partial', obscuration: 0.1 },
          ],
        })}
      />,
    );
    expect(screen.getByText('Supermoon')).toBeInTheDocument();
    expect(screen.getByText('Partial lunar eclipse')).toBeInTheDocument();
    // The detail line joins distance + event kind into one text node pair.
    expect(screen.getByText(/359200 km from Earth/)).toBeInTheDocument();
  });

  it('no events → the empty message', () => {
    render(<MoonEventsList events={mkEvents({ fullMoons: [], newMoons: [] })} />);
    expect(screen.getByText('No special events this month.')).toBeInTheDocument();
  });
});