import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroundednessScore from './GroundednessScore.jsx';

describe('GroundednessScore', () => {
  it('renders nothing when score is null', () => {
    const { container } = render(<GroundednessScore score={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when score is undefined', () => {
    const { container } = render(<GroundednessScore />);
    expect(container.innerHTML).toBe('');
  });

  it('renders green level for score >= 0.75', () => {
    render(<GroundednessScore score={0.85} />);
    const el = screen.getByText(/Grounded: 85%/);
    expect(el).toHaveClass('green');
  });

  it('renders green at exactly 0.75 boundary', () => {
    render(<GroundednessScore score={0.75} />);
    const el = screen.getByText(/Grounded: 75%/);
    expect(el).toHaveClass('green');
  });

  it('renders gold level for score >= 0.50 and < 0.75', () => {
    render(<GroundednessScore score={0.6} />);
    const el = screen.getByText(/Grounded: 60%/);
    expect(el).toHaveClass('gold');
  });

  it('renders gold at exactly 0.50 boundary', () => {
    render(<GroundednessScore score={0.5} />);
    const el = screen.getByText(/Grounded: 50%/);
    expect(el).toHaveClass('gold');
  });

  it('renders red level for score < 0.50', () => {
    render(<GroundednessScore score={0.3} />);
    const el = screen.getByText(/Grounded: 30%/);
    expect(el).toHaveClass('red');
  });

  it('renders 0% for score of 0', () => {
    render(<GroundednessScore score={0} />);
    const el = screen.getByText(/Grounded: 0%/);
    expect(el).toHaveClass('red');
  });

  it('renders 100% for score of 1', () => {
    render(<GroundednessScore score={1} />);
    const el = screen.getByText(/Grounded: 100%/);
    expect(el).toHaveClass('green');
  });

  it('includes the correct label text for each level', () => {
    const { rerender } = render(<GroundednessScore score={0.9} />);
    expect(screen.getByText(/Factually reliable response/)).toBeInTheDocument();

    rerender(<GroundednessScore score={0.6} />);
    expect(screen.getByText(/minor drift from source/)).toBeInTheDocument();

    rerender(<GroundednessScore score={0.2} />);
    expect(screen.getByText(/factually inaccurate or hallucination/)).toBeInTheDocument();
  });
});
