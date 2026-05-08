import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FollowUpQuestions from './FollowUpQuestions.jsx';

describe('FollowUpQuestions', () => {
  it('renders nothing when questions is null', () => {
    const { container } = render(<FollowUpQuestions questions={null} onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when questions is empty', () => {
    const { container } = render(<FollowUpQuestions questions={[]} onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a chip for each question', () => {
    const questions = ['What is X?', 'How does Y work?', 'Why Z?'];
    render(<FollowUpQuestions questions={questions} onSelect={() => {}} />);

    questions.forEach((q) => {
      expect(screen.getByText(q)).toBeInTheDocument();
    });
  });

  it('renders all chips as buttons', () => {
    const questions = ['Q1', 'Q2'];
    render(<FollowUpQuestions questions={questions} onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('calls onSelect with the question text when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const questions = ['What is X?', 'How does Y work?'];

    render(<FollowUpQuestions questions={questions} onSelect={onSelect} />);

    await user.click(screen.getByText('How does Y work?'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('How does Y work?');
  });

  it('renders the header text', () => {
    render(<FollowUpQuestions questions={['Q1']} onSelect={() => {}} />);
    expect(screen.getByText('Suggested Follow-Up Questions:')).toBeInTheDocument();
  });
});
