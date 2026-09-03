import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders brand and theme toggle', () => {
    render(<Header theme="light" onToggleTheme={() => {}} />);
    expect(screen.getByText('Sunsetrise')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark theme/ })).toBeInTheDocument();
  });

  it('without nav no navigation is rendered', () => {
    render(<Header theme="light" onToggleTheme={() => {}} />);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('with nav renders links and marks the active one', () => {
    const nav = [
      { label: 'Forecast', href: './', active: true },
      { label: 'Moon', href: './moon.html?lat=52.2&lon=21', active: false },
    ];
    render(<Header theme="light" onToggleTheme={() => {}} nav={nav} />);
    const forecast = screen.getByRole('link', { name: 'Forecast' });
    const moon = screen.getByRole('link', { name: 'Moon' });
    expect(forecast).toHaveAttribute('href', './');
    expect(forecast).toHaveAttribute('aria-current', 'page');
    expect(moon).toHaveAttribute('href', './moon.html?lat=52.2&lon=21');
    expect(moon).not.toHaveAttribute('aria-current');
  });

  it('the theme toggle fires the callback', () => {
    const onToggleTheme = vi.fn();
    render(<Header theme="light" onToggleTheme={onToggleTheme} />);
    fireEvent.click(screen.getByRole('button', { name: /dark theme/ }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});