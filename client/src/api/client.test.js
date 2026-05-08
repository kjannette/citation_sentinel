import { describe, it, expect } from 'vitest';
import { handleResponse } from './client.js';

function fakeResponse(status, body, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('handleResponse', () => {
  it('returns parsed JSON on success', async () => {
    const data = { id: 1, name: 'test' };
    const result = await handleResponse(fakeResponse(200, data));
    expect(result).toEqual(data);
  });

  it('throws with body.error when present', async () => {
    const res = fakeResponse(400, { error: 'Bad input' }, false);
    await expect(handleResponse(res)).rejects.toThrow('Bad input');
  });

  it('throws with status code when body has no error field', async () => {
    const res = fakeResponse(500, {}, false);
    await expect(handleResponse(res)).rejects.toThrow('Request failed: 500');
  });

  it('throws with status code when body JSON parsing fails', async () => {
    const res = {
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('parse error')),
    };
    await expect(handleResponse(res)).rejects.toThrow('Request failed: 502');
  });

  it('returns empty object body on success', async () => {
    const result = await handleResponse(fakeResponse(200, {}));
    expect(result).toEqual({});
  });

  it('returns array body on success', async () => {
    const data = [1, 2, 3];
    const result = await handleResponse(fakeResponse(200, data));
    expect(result).toEqual([1, 2, 3]);
  });
});
