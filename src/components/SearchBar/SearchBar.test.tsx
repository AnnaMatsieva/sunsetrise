import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import type { GeoResult } from '../../types';

const results: GeoResult[] = [
  { id: 1, name: 'Warsaw', latitude: 52.23, longitude: 21.01, country: 'Poland', admin1: 'Mazovia' },
  { id: 2, name: 'Warsaw', latitude: 35.75, longitude: -90.7, country: 'United States', admin1: 'Arkansas' },
];

describe('SearchBar', () => {
  it('typing changes the query and opens the list', () => {
    const onQueryChange = vi.fn();
    render(<SearchBar query="wa" onQueryChange={onQueryChange} results={results} status="success" onSelect={vi.fn()} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wars' } });
    expect(onQueryChange).toHaveBeenCalledWith('wars');
  });

  it('renders options and a click selects one', () => {
    const onSelect = vi.fn();
    render(<SearchBar query="warsaw" onQueryChange={vi.fn()} results={results} status="success" onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input); // open the dropdown
    expect(screen.getAllByText('Warsaw')).toHaveLength(2);
    fireEvent.mouseDown(screen.getAllByText('Warsaw')[0]!);
    expect(onSelect).toHaveBeenCalledWith(results[0]);
  });

  it('ArrowDown/Enter selects the highlighted option', () => {
    const onSelect = vi.fn();
    render(<SearchBar query="warsaw" onQueryChange={vi.fn()} results={results} status="success" onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(results[0]);
  });

  it('success with no results → "Nothing found"', () => {
    render(<SearchBar query="zxqw" onQueryChange={vi.fn()} results={[]} status="success" onSelect={vi.fn()} />);
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });
});