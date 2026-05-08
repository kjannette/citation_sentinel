import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listNotebooks, createNotebook, deleteNotebook } from './notebooks.js';

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

describe('notebooks API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listNotebooks', () => {
    it('fetches GET /api/notebooks', async () => {
      const data = [{ id: '1', name: 'NB' }];
      fetch.mockResolvedValue(okResponse(data));

      const result = await listNotebooks();

      expect(fetch).toHaveBeenCalledWith('/api/notebooks');
      expect(result).toEqual(data);
    });
  });

  describe('createNotebook', () => {
    it('sends POST with name in JSON body', async () => {
      const nb = { id: '2', name: 'New' };
      fetch.mockResolvedValue(okResponse(nb));

      const result = await createNotebook('New');

      expect(fetch).toHaveBeenCalledWith('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      });
      expect(result).toEqual(nb);
    });
  });

  describe('deleteNotebook', () => {
    it('sends DELETE to /api/notebooks/:id', async () => {
      fetch.mockResolvedValue(okResponse({}));

      await deleteNotebook('abc-123');

      expect(fetch).toHaveBeenCalledWith('/api/notebooks/abc-123', {
        method: 'DELETE',
      });
    });
  });

  it('throws on non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server down' }),
    });

    await expect(listNotebooks()).rejects.toThrow('Server down');
  });
});
