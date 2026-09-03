import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the message', () => {
    render(<ErrorState message="Could not load the forecast." />);
    expect(screen.getByText('Could not load the forecast.')).toBeInTheDocument();
  });

  it('the retry button calls the handler', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="x" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('without onRetry there is no button', () => {
    render(<ErrorState message="x" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});