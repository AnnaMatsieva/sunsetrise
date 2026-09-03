import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityBadge } from './QualityBadge';

describe('QualityBadge', () => {
  it('shows the number and short label for the category', () => {
    render(<QualityBadge category="Great" score={0.87} />);
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('Gt.')).toBeInTheDocument();
    const pill = screen.getByLabelText(/Great, score 87 of 100/);
    expect(pill).toHaveAttribute('data-cat', 'great');
  });

  it('null category → muted "no data"', () => {
    render(<QualityBadge category={null} score={null} />);
    expect(screen.getByText('no data')).toBeInTheDocument();
  });

  it('each category sets its own data-cat', () => {
    const { rerender } = render(<QualityBadge category="Poor" score={0.1} />);
    expect(screen.getByText('10').parentElement).toHaveAttribute('data-cat', 'poor');
    rerender(<QualityBadge category="Fair" score={0.3} />);
    expect(screen.getByText('30').parentElement).toHaveAttribute('data-cat', 'fair');
    rerender(<QualityBadge category="Good" score={0.6} />);
    expect(screen.getByText('60').parentElement).toHaveAttribute('data-cat', 'good');
  });
});