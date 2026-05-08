import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listSources, uploadSource, addUrlSource } from './sources.js';

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

describe('sources API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listSources', () => {
    it('fetches GET /api/sources with notebookId query param', async () => {
      const data = [{ id: 's1', name: 'file.pdf' }];
      fetch.mockResolvedValue(okResponse(data));

      const result = await listSources('nb-42');

      expect(fetch).toHaveBeenCalledWith('/api/sources?notebookId=nb-42');
      expect(result).toEqual(data);
    });
  });

  describe('uploadSource', () => {
    it('sends POST with FormData containing file and notebookId', async () => {
      const source = { id: 's2', name: 'doc.pdf' };
      fetch.mockResolvedValue(okResponse(source));

      const fakeFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const result = await uploadSource('nb-1', fakeFile);

      expect(fetch).toHaveBeenCalledWith('/api/sources', {
        method: 'POST',
        body: expect.any(FormData),
      });

      const formData = fetch.mock.calls[0][1].body;
      expect(formData.get('notebookId')).toBe('nb-1');
      expect(formData.get('file')).toBeInstanceOf(File);
      expect(result).toEqual(source);
    });
  });

  describe('addUrlSource', () => {
    it('sends POST to /api/sources/url with JSON body', async () => {
      const source = { id: 's3', name: 'example.com' };
      fetch.mockResolvedValue(okResponse(source));

      const result = await addUrlSource('nb-5', 'https://example.com');

      expect(fetch).toHaveBeenCalledWith('/api/sources/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId: 'nb-5', url: 'https://example.com' }),
      });
      expect(result).toEqual(source);
    });
  });

  it('throws on non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    });

    await expect(listSources('nb-1')).rejects.toThrow('Bad request');
  });
});
