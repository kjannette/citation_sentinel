import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CitationDetailModal from './CitationDetailModal.jsx';

const detail = {
  citedSentence: 'The earth orbits the sun.',
  topicSummary: 'Astronomy basics covering planetary motion.',
  additionalInsight: 'This was first proven by Copernicus.',
  relevantLinks: [
    { title: 'Wikipedia: Heliocentrism', url: 'https://en.wikipedia.org/wiki/Heliocentrism' },
    { title: 'NASA Orbits', url: 'https://nasa.gov/orbits' },
  ],
};

describe('CitationDetailModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <CitationDetailModal open={false} onClose={() => {}} detail={detail} sourceName="Doc1" citationIndex={1} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading state when detail is null', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={null} sourceName="Doc1" citationIndex={1} />,
    );
    expect(screen.getByText(/Loading deeper insight/)).toBeInTheDocument();
  });

  it('renders the title with source name and index', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="MyDoc.pdf" citationIndex={3} />,
    );
    expect(screen.getByText('Source 3 — MyDoc.pdf')).toBeInTheDocument();
  });

  it('uses "Unknown" when sourceName is falsy', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="" citationIndex={1} />,
    );
    expect(screen.getByText('Source 1 — Unknown')).toBeInTheDocument();
  });

  it('renders cited passage as blockquote', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="Doc" citationIndex={1} />,
    );
    const quote = screen.getByText('The earth orbits the sun.');
    expect(quote.tagName).toBe('BLOCKQUOTE');
  });

  it('renders topic context', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="Doc" citationIndex={1} />,
    );
    expect(screen.getByText('Astronomy basics covering planetary motion.')).toBeInTheDocument();
  });

  it('renders additional insight', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="Doc" citationIndex={1} />,
    );
    expect(screen.getByText('This was first proven by Copernicus.')).toBeInTheDocument();
  });

  it('renders relevant links', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="Doc" citationIndex={1} />,
    );
    const link1 = screen.getByText('Wikipedia: Heliocentrism');
    expect(link1.closest('a')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Heliocentrism');
    expect(link1.closest('a')).toHaveAttribute('target', '_blank');

    const link2 = screen.getByText('NASA Orbits');
    expect(link2.closest('a')).toHaveAttribute('href', 'https://nasa.gov/orbits');
  });

  it('omits Further Reading when relevantLinks is empty', () => {
    const noLinks = { ...detail, relevantLinks: [] };
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={noLinks} sourceName="Doc" citationIndex={1} />,
    );
    expect(screen.queryByText('Further Reading')).toBeNull();
  });

  it('renders Close button and calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CitationDetailModal open={true} onClose={onClose} detail={detail} sourceName="Doc" citationIndex={1} />,
    );

    await user.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders all section labels', () => {
    render(
      <CitationDetailModal open={true} onClose={() => {}} detail={detail} sourceName="Doc" citationIndex={1} />,
    );
    expect(screen.getByText('Cited Passage')).toBeInTheDocument();
    expect(screen.getByText('Topic Context')).toBeInTheDocument();
    expect(screen.getByText('Additional Insight')).toBeInTheDocument();
    expect(screen.getByText('Further Reading')).toBeInTheDocument();
  });
});
