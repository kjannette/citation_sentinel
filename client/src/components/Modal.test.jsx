import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal.jsx';

describe('Modal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Content</p>
      </Modal>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders children when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>Hello world</p>
      </Modal>,
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders the title when provided', () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Modal">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
  });

  it('does not render a title element when title is omitted', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('has dialog role and aria-modal', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Accessible">
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Accessible');
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>body</p>
      </Modal>,
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} onClose={onClose}>
        <p>body</p>
      </Modal>,
    );

    const overlay = container.querySelector('.modal-overlay');
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when dialog content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose}>
        <p>body</p>
      </Modal>,
    );

    await user.click(screen.getByText('body'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies custom width style', () => {
    render(
      <Modal open={true} onClose={() => {}} width="600px">
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.style.width).toBe('600px');
  });
});
