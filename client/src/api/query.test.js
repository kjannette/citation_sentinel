import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendQuery } from './query.js';

const okResponse = (body) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

describe('sendQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to /api/query with notebookId and question', async () => {
    const data = { answer: 'The answer', citations: [] };
    fetch.mockResolvedValue(okResponse(data));

    const result = await sendQuery('nb-1', 'What is AI?');

    expect(fetch).toHaveBeenCalledWith('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebookId: 'nb-1', question: 'What is AI?' }),
    });
    expect(result).toEqual(data);
  });

  it('returns data without calling onCitationDetails when no citations', async () => {
    const data = { answer: 'Answer', citations: [] };
    fetch.mockResolvedValue(okResponse(data));
    const onCitationDetails = vi.fn();

    await sendQuery('nb-1', 'Q?', onCitationDetails);

    expect(onCitationDetails).not.toHaveBeenCalled();
  });

  it('returns data without calling onCitationDetails when citations is null', async () => {
    const data = { answer: 'Answer', citations: null };
    fetch.mockResolvedValue(okResponse(data));
    const onCitationDetails = vi.fn();

    await sendQuery('nb-1', 'Q?', onCitationDetails);

    expect(onCitationDetails).not.toHaveBeenCalled();
  });

  it('fetches citation details and calls onCitationDetails', async () => {
    const queryData = {
      answer: 'The answer [1]',
      citations: [
        { sourceIndex: 1, name: 'doc.pdf', chunkTexts: ['chunk A'] },
        { sourceIndex: 2, name: 'doc2.pdf', chunkTexts: ['chunk B'] },
      ],
    };
    const detailA = { citedSentence: 'A', topicSummary: 'T1' };
    const detailB = { citedSentence: 'B', topicSummary: 'T2' };

    fetch
      .mockResolvedValueOnce(okResponse(queryData))
      .mockResolvedValueOnce(okResponse(detailA))
      .mockResolvedValueOnce(okResponse(detailB));

    const onCitationDetails = vi.fn();
    const result = await sendQuery('nb-1', 'Q?', onCitationDetails);

    expect(result).toEqual(queryData);

    // Citation detail fetches happen async — wait for the promise
    await vi.waitFor(() => {
      expect(onCitationDetails).toHaveBeenCalledOnce();
    });

    const details = onCitationDetails.mock.calls[0][0];
    expect(details).toHaveLength(2);
    expect(details[0]).toEqual({ sourceIndex: 1, ...detailA });
    expect(details[1]).toEqual({ sourceIndex: 2, ...detailB });
  });

  it('sends correct body for each citation detail request', async () => {
    const queryData = {
      answer: 'Answer text',
      citations: [
        { sourceIndex: 1, name: 'src.pdf', chunkTexts: ['c1', 'c2'] },
      ],
    };
    const detail = { citedSentence: 'S' };

    fetch
      .mockResolvedValueOnce(okResponse(queryData))
      .mockResolvedValueOnce(okResponse(detail));

    const onCitationDetails = vi.fn();
    await sendQuery('nb-1', 'Q?', onCitationDetails);

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    expect(fetch).toHaveBeenCalledWith('/api/citation-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chunkTexts: ['c1', 'c2'],
        sourceName: 'src.pdf',
        answer: 'Answer text',
        citationIndex: 1,
      }),
    });
  });

  it('does not fetch citation details when no callback provided', async () => {
    const queryData = {
      answer: 'Answer',
      citations: [{ sourceIndex: 1, name: 'x', chunkTexts: ['c'] }],
    };
    fetch.mockResolvedValue(okResponse(queryData));

    await sendQuery('nb-1', 'Q?');

    // Only 1 fetch call (the query itself), no citation detail fetches
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on non-ok response from query endpoint', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal error' }),
    });

    await expect(sendQuery('nb-1', 'Q?')).rejects.toThrow('Internal error');
  });
});
