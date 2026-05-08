import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentButtons from './DocumentButtons.jsx';

describe('DocumentButtons', () => {
  const LABELS = ['Study Guide', 'F.A.Q.', 'Executive Brief'];

  it('renders all three document type buttons', () => {
    render(<DocumentButtons sourceCount={0} onRequest={() => {}} generatingType={null} />);
    LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('disables all buttons when sourceCount < 2', () => {
    render(<DocumentButtons sourceCount={1} onRequest={() => {}} generatingType={null} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('enables buttons when sourceCount >= 2', () => {
    render(<DocumentButtons sourceCount={2} onRequest={() => {}} generatingType={null} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeEnabled());
  });

  it('enables buttons for large source counts', () => {
    render(<DocumentButtons sourceCount={10} onRequest={() => {}} generatingType={null} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeEnabled());
  });

  it('calls onRequest with the correct type when clicked', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<DocumentButtons sourceCount={3} onRequest={onRequest} generatingType={null} />);

    await user.click(screen.getByText('F.A.Q.'));
    expect(onRequest).toHaveBeenCalledWith('faq');
  });

  it('disables all buttons when one type is generating', () => {
    render(<DocumentButtons sourceCount={5} onRequest={() => {}} generatingType="faq" />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows generating label for the active type', () => {
    render(<DocumentButtons sourceCount={5} onRequest={() => {}} generatingType="study-guide" />);
    expect(screen.getByText('Generating Study Guide...')).toBeInTheDocument();
    expect(screen.getByText('F.A.Q.')).toBeInTheDocument();
    expect(screen.getByText('Executive Brief')).toBeInTheDocument();
  });

  it('applies generating CSS class to the active button', () => {
    render(<DocumentButtons sourceCount={5} onRequest={() => {}} generatingType="executive-brief" />);
    const genButton = screen.getByText('Generating Executive Brief...');
    expect(genButton).toHaveClass('generating');
  });
});
