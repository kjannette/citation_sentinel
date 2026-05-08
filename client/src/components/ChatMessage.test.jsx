import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatMessage from './ChatMessage.jsx';

describe('ChatMessage', () => {
  describe('user messages', () => {
    it('renders user text in a user-styled div', () => {
      const msg = { role: 'user', text: 'Hello there' };
      const { container } = render(<ChatMessage message={msg} />);
      const el = container.querySelector('.chat-message.user');
      expect(el).toHaveTextContent('Hello there');
    });

    it('does not render groundedness or follow-ups for user messages', () => {
      const msg = { role: 'user', text: 'Hi' };
      const { container } = render(<ChatMessage message={msg} />);
      expect(container.querySelector('.groundedness-score')).toBeNull();
      expect(container.querySelector('.follow-up-questions')).toBeNull();
    });
  });

  describe('assistant messages — plain text (no citations)', () => {
    it('renders answer text without citation markers', () => {
      const msg = { role: 'assistant', answer: 'The sky is blue.', citations: [] };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);
      expect(screen.getByText('The sky is blue.')).toBeInTheDocument();
    });

    it('renders answer when citations is null', () => {
      const msg = { role: 'assistant', answer: 'No sources.', citations: null };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);
      expect(screen.getByText('No sources.')).toBeInTheDocument();
    });
  });

  describe('assistant messages — with citations', () => {
    const baseCitations = [{ sourceIndex: 1 }, { sourceIndex: 2 }];

    it('renders citation numbers as clickable buttons', () => {
      const msg = {
        role: 'assistant',
        answer: 'Fact one [1] and fact two [2].',
        citations: baseCitations,
      };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);

      const markers = screen.getAllByRole('button');
      expect(markers).toHaveLength(2);
      expect(markers[0]).toHaveTextContent('1');
      expect(markers[1]).toHaveTextContent('2');
    });

    it('sets aria-label on citation markers', () => {
      const msg = {
        role: 'assistant',
        answer: 'Info [3].',
        citations: [{ sourceIndex: 3 }],
      };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);
      expect(screen.getByLabelText('Citation source 3')).toBeInTheDocument();
    });

    it('calls onCitationClick with docIndex when citation is clicked', async () => {
      const user = userEvent.setup();
      const onCitationClick = vi.fn();
      const msg = {
        role: 'assistant',
        answer: 'See [2] here.',
        citations: [{ sourceIndex: 1 }, { sourceIndex: 2 }],
      };
      render(
        <ChatMessage
          message={msg}
          onFollowUp={() => {}}
          onSourceHover={() => {}}
          onCitationClick={onCitationClick}
        />,
      );

      await user.click(screen.getByLabelText('Citation source 2'));
      expect(onCitationClick).toHaveBeenCalledWith(2);
    });

    it('calls onSourceHover on mouseEnter/mouseLeave of citation', async () => {
      const user = userEvent.setup();
      const onSourceHover = vi.fn();
      const msg = {
        role: 'assistant',
        answer: 'Ref [1].',
        citations: [{ sourceIndex: 1 }],
      };
      render(
        <ChatMessage
          message={msg}
          onFollowUp={() => {}}
          onSourceHover={onSourceHover}
        />,
      );

      const marker = screen.getByLabelText('Citation source 1');
      await user.hover(marker);
      expect(onSourceHover).toHaveBeenCalledWith({ instanceId: 'c-0', docIndex: 1 });

      await user.unhover(marker);
      expect(onSourceHover).toHaveBeenCalledWith(null);
    });

    it('highlights citation when hoveredSource matches instanceId', () => {
      const msg = {
        role: 'assistant',
        answer: 'Ref [1].',
        citations: [{ sourceIndex: 1 }],
      };
      const { container } = render(
        <ChatMessage
          message={msg}
          hoveredSource="c-0"
          onFollowUp={() => {}}
          onSourceHover={() => {}}
        />,
      );
      expect(container.querySelector('.citation-highlighted')).not.toBeNull();
    });

    it('handles multiple citations in sequence', () => {
      const msg = {
        role: 'assistant',
        answer: '[1][2][3]',
        citations: [{ sourceIndex: 1 }, { sourceIndex: 2 }, { sourceIndex: 3 }],
      };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);
      const markers = screen.getAllByRole('button');
      expect(markers).toHaveLength(3);
    });
  });

  describe('groundedness and follow-ups', () => {
    it('renders GroundednessScore when present', () => {
      const msg = {
        role: 'assistant',
        answer: 'Answer',
        citations: [],
        groundednessScore: 0.85,
      };
      render(<ChatMessage message={msg} onFollowUp={() => {}} onSourceHover={() => {}} />);
      expect(screen.getByText(/Grounded: 85%/)).toBeInTheDocument();
    });

    it('renders follow-up questions and forwards onFollowUp', async () => {
      const user = userEvent.setup();
      const onFollowUp = vi.fn();
      const msg = {
        role: 'assistant',
        answer: 'Answer',
        citations: [],
        followUpQuestions: ['Tell me more', 'Why?'],
      };
      render(<ChatMessage message={msg} onFollowUp={onFollowUp} onSourceHover={() => {}} />);

      await user.click(screen.getByText('Why?'));
      expect(onFollowUp).toHaveBeenCalledWith('Why?');
    });
  });
});
