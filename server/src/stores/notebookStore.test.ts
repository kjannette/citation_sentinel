import { describe, it, expect, beforeEach } from 'vitest';
import { NotebookStore } from './notebookStore.js';

describe('notebookStore', () => {
  let store: NotebookStore;

  beforeEach(() => {
    store = new NotebookStore();
  });

  it('creates and retrieves a notebook', () => {
    const nb = store.createNotebook({ id: 'nb-1', name: 'Test', createdAt: '2026-01-01' });
    expect(nb.id).toBe('nb-1');
    expect(nb.name).toBe('Test');

    const found = store.getNotebook('nb-1');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Test');
  });

  it('lists all notebooks without chunks', () => {
    store.createNotebook({ id: 'nb-1', name: 'A', createdAt: '2026-01-01' });
    store.createNotebook({ id: 'nb-2', name: 'B', createdAt: '2026-01-02' });
    const all = store.getAllNotebooks();
    expect(all).toHaveLength(2);
    expect(all[0]).not.toHaveProperty('chunks');
  });

  it('deletes a notebook', () => {
    store.createNotebook({ id: 'nb-1', name: 'A', createdAt: '2026-01-01' });
    expect(store.deleteNotebook('nb-1')).toBe(true);
    expect(store.getNotebook('nb-1')).toBeNull();
  });

  it('returns false when deleting a non-existent notebook', () => {
    expect(store.deleteNotebook('nope')).toBe(false);
  });

  it('adds and retrieves sources', () => {
    store.createNotebook({ id: 'nb-1', name: 'A', createdAt: '2026-01-01' });
    store.addSource('nb-1', { id: 's-1', name: 'doc.pdf' });
    const sources = store.getSources('nb-1');
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('doc.pdf');
  });

  it('returns empty sources for non-existent notebook', () => {
    expect(store.getSources('nope')).toEqual([]);
  });

  it('adds and retrieves chunks', () => {
    store.createNotebook({ id: 'nb-1', name: 'A', createdAt: '2026-01-01' });
    store.addChunksToNotebook('nb-1', [
      { id: 'c-1', text: 'chunk one', sourceId: 's-1', index: 0 },
      { id: 'c-2', text: 'chunk two', sourceId: 's-1', index: 1 },
    ]);
    const chunks = store.getChunksForNotebook('nb-1');
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe('chunk one');
  });

  it('returns empty chunks for non-existent notebook', () => {
    expect(store.getChunksForNotebook('nope')).toEqual([]);
  });
});
