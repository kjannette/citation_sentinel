import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateNotebookModal from './CreateNotebookModal.jsx';

describe('CreateNotebookModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <CreateNotebookModal open={false} onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal with title when open', () => {
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('New Notebook')).toBeInTheDocument();
  });

  it('renders input and buttons', () => {
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByPlaceholderText('Enter notebook name')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('disables Create button when input is empty', () => {
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Create')).toBeDisabled();
  });

  it('enables Create button when input has text', async () => {
    const user = userEvent.setup();
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText('Enter notebook name'), 'My Notebook');
    expect(screen.getByText('Create')).toBeEnabled();
  });

  it('calls onConfirm with trimmed name on submit', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CreateNotebookModal open={true} onConfirm={onConfirm} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText('Enter notebook name'), '  Research Notes  ');
    await user.click(screen.getByText('Create'));
    expect(onConfirm).toHaveBeenCalledWith('Research Notes');
  });

  it('calls onConfirm on Enter key', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CreateNotebookModal open={true} onConfirm={onConfirm} onCancel={() => {}} />);

    await user.type(screen.getByPlaceholderText('Enter notebook name'), 'Test{Enter}');
    expect(onConfirm).toHaveBeenCalledWith('Test');
  });

  it('does not call onConfirm when input is only whitespace', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CreateNotebookModal open={true} onConfirm={onConfirm} onCancel={() => {}} />);

    const input = screen.getByPlaceholderText('Enter notebook name');
    await user.type(input, '   ');
    await user.type(input, '{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('resets input when reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />,
    );

    await user.type(screen.getByPlaceholderText('Enter notebook name'), 'Old name');

    rerender(<CreateNotebookModal open={false} onConfirm={() => {}} onCancel={() => {}} />);
    rerender(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);

    expect(screen.getByPlaceholderText('Enter notebook name')).toHaveValue('');
  });

  it('auto-focuses the input when opened', async () => {
    render(<CreateNotebookModal open={true} onConfirm={() => {}} onCancel={() => {}} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter notebook name')).toHaveFocus();
    }, { timeout: 200 });
  });
});
