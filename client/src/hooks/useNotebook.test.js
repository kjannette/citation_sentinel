import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/notebooks.js', () => ({
  listNotebooks: vi.fn(),
  createNotebook: vi.fn(),
  deleteNotebook: vi.fn(),
}));

import { useNotebook } from './useNotebook.js';
import * as notebooksApi from '../api/notebooks.js';

const notebooks = [
  { id: 'nb-1', name: 'Research' },
  { id: 'nb-2', name: 'Personal' },
];

beforeEach(() => {
  vi.resetAllMocks();
  notebooksApi.listNotebooks.mockResolvedValue(notebooks);
  notebooksApi.createNotebook.mockImplementation(async (name) => ({
    id: `nb-${Date.now()}`,
    name,
  }));
  notebooksApi.deleteNotebook.mockResolvedValue({});
});

describe('useNotebook', () => {
  it('loads notebooks on mount', async () => {
    const { result } = renderHook(() => useNotebook());

    await waitFor(() => {
      expect(result.current.notebooks).toEqual(notebooks);
    });
    expect(notebooksApi.listNotebooks).toHaveBeenCalledOnce();
  });

  it('starts with no active notebook', () => {
    const { result } = renderHook(() => useNotebook());
    expect(result.current.activeNotebook).toBeNull();
  });

  it('selectNotebook sets the active notebook', async () => {
    const { result } = renderHook(() => useNotebook());

    await waitFor(() => {
      expect(result.current.notebooks).toHaveLength(2);
    });

    act(() => {
      result.current.selectNotebook('nb-2');
    });

    expect(result.current.activeNotebook).toEqual({ id: 'nb-2', name: 'Personal' });
  });

  it('selectNotebook sets null for unknown id', async () => {
    const { result } = renderHook(() => useNotebook());

    await waitFor(() => {
      expect(result.current.notebooks).toHaveLength(2);
    });

    act(() => {
      result.current.selectNotebook('nb-2');
    });
    expect(result.current.activeNotebook).not.toBeNull();

    act(() => {
      result.current.selectNotebook('nonexistent');
    });
    expect(result.current.activeNotebook).toBeNull();
  });

  it('createNotebook calls API and adds to list', async () => {
    const newNb = { id: 'nb-new', name: 'New One' };
    notebooksApi.createNotebook.mockResolvedValue(newNb);

    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    await act(async () => {
      await result.current.createNotebook('New One');
    });

    expect(notebooksApi.createNotebook).toHaveBeenCalledWith('New One');
    expect(result.current.notebooks).toHaveLength(3);
    expect(result.current.notebooks[2]).toEqual(newNb);
    expect(result.current.activeNotebook).toEqual(newNb);
  });

  it('createNotebook does nothing for empty name', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    await act(async () => {
      await result.current.createNotebook('');
    });

    expect(notebooksApi.createNotebook).not.toHaveBeenCalled();
    expect(result.current.notebooks).toHaveLength(2);
  });

  it('deleteNotebook removes from list', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    await act(async () => {
      await result.current.deleteNotebook('nb-1');
    });

    expect(notebooksApi.deleteNotebook).toHaveBeenCalledWith('nb-1');
    expect(result.current.notebooks).toHaveLength(1);
    expect(result.current.notebooks[0].id).toBe('nb-2');
  });

  it('deleteNotebook clears activeNotebook if it was the deleted one', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    act(() => {
      result.current.selectNotebook('nb-1');
    });
    expect(result.current.activeNotebook?.id).toBe('nb-1');

    await act(async () => {
      await result.current.deleteNotebook('nb-1');
    });

    expect(result.current.activeNotebook).toBeNull();
  });

  it('deleteNotebook preserves activeNotebook if different one deleted', async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    act(() => {
      result.current.selectNotebook('nb-2');
    });

    await act(async () => {
      await result.current.deleteNotebook('nb-1');
    });

    expect(result.current.activeNotebook).toEqual({ id: 'nb-2', name: 'Personal' });
  });

  it('deleteNotebook does not remove from list on API error', async () => {
    notebooksApi.deleteNotebook.mockRejectedValue(new Error('Server error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.notebooks).toHaveLength(2));

    await act(async () => {
      await result.current.deleteNotebook('nb-1');
    });

    expect(result.current.notebooks).toHaveLength(2);
    console.error.mockRestore();
  });

  it('handles listNotebooks API failure gracefully', async () => {
    notebooksApi.listNotebooks.mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNotebook());

    await waitFor(() => {
      expect(notebooksApi.listNotebooks).toHaveBeenCalled();
    });

    expect(result.current.notebooks).toEqual([]);
    console.error.mockRestore();
  });
});
