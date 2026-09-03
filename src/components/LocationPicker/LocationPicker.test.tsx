import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';
import type { Location } from '../../types';

const warsaw: Location = { name: 'Warsaw', latitude: 52.2, longitude: 21.0, country: 'Poland' };
const paris: Location = { name: 'Paris', latitude: 48.85, longitude: 2.35, country: 'France' };

describe('LocationPicker', () => {
  it('shows the search, geolocation button and current-location chip', () => {
    render(<LocationPicker current={warsaw} onSelectLocation={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Enter a city/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My location/ })).toBeInTheDocument();
    expect(screen.getByText('Warsaw, Poland')).toBeInTheDocument();
  });

  it('without recents it does not render the recents block', () => {
    const { container } = render(<LocationPicker current={warsaw} onSelectLocation={vi.fn()} />);
    expect(container.querySelector('[aria-label="Recent cities"]')).toBeNull();
  });

  it('shows recent-city chips', () => {
    render(<LocationPicker current={warsaw} onSelectLocation={vi.fn()} recents={[warsaw, paris]} />);
    expect(screen.getByRole('button', { name: 'Paris, France' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Warsaw, Poland' })).toBeInTheDocument();
  });

  it('clicking a recent chip calls onSelectLocation', () => {
    const onSelect = vi.fn();
    render(<LocationPicker current={warsaw} onSelectLocation={onSelect} recents={[warsaw, paris]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paris, France' }));
    expect(onSelect).toHaveBeenCalledWith(paris);
  });

  it('with onRemoveRecent each chip gets an × that removes only its city', () => {
    const onRemove = vi.fn();
    render(
      <LocationPicker current={null} onSelectLocation={vi.fn()} recents={[warsaw, paris]} onRemoveRecent={onRemove} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove Paris from recents' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(paris);
  });

  it('without onRemoveRecent the chips have no × buttons', () => {
    render(<LocationPicker current={null} onSelectLocation={vi.fn()} recents={[warsaw]} />);
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });
});