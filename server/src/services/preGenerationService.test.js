import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../stores/notebookStore.js', () => ({
  getNotebook: vi.fn(),
  getSources: vi.fn(),
  getChunksForNotebook: vi.fn(),
  buildSourceGroups: vi.fn(),
}));

vi.mock('../stores/documentCacheStore.js', () => ({
  isGenerating: vi.fn(),
  invalidate: vi.fn(),
  markGenerating: vi.fn(),
  clearGenerating: vi.fn(),
  setCachedDocument: vi.fn(),
}));

vi.mock('./documentService.js', () => ({
  generateStudyGuide: vi.fn(),
  generateFaq: vi.fn(),
  generateExecutiveBrief: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { triggerPreGeneration } from './preGenerationService.js';
import * as notebookStore from '../stores/notebookStore.js';
import * as documentCacheStore from '../stores/documentCacheStore.js';
import {
  generateStudyGuide,
  generateFaq,
  generateExecutiveBrief,
} from './documentService.js';

function setupNotebook(id) {
  notebookStore.getNotebook.mockReturnValue({ id });
  notebookStore.getSources.mockReturnValue([{ id: 's1' }, { id: 's2' }]);
  notebookStore.getChunksForNotebook.mockReturnValue([{ id: 'c1', text: 'hello' }]);
  notebookStore.buildSourceGroups.mockReturnValue([
    { docIndex: 1, name: 'Doc', chunks: [{ text: 'hello' }] },
  ]);
}

function stubGeneratorsOk() {
  generateStudyGuide.mockResolvedValue({ title: 'guide' });
  generateFaq.mockResolvedValue({ subject: 'topic' });
  generateExecutiveBrief.mockResolvedValue({ title: 'brief' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('triggerPreGeneration guards', () => {
  it('does nothing if the notebook does not exist', () => {
    notebookStore.getNotebook.mockReturnValue(null);
    triggerPreGeneration('nb-missing');
    expect(notebookStore.getSources).not.toHaveBeenCalled();
  });

  it('does nothing if fewer than 2 sources', () => {
    notebookStore.getNotebook.mockReturnValue({ id: 'nb-few' });
    notebookStore.getSources.mockReturnValue([{ id: 's1' }]);
    triggerPreGeneration('nb-few');
    expect(documentCacheStore.markGenerating).not.toHaveBeenCalled();
  });
});

describe('queuing when already generating', () => {
  it('invalidates cache and skips runPreGeneration', () => {
    setupNotebook('nb-q');
    documentCacheStore.isGenerating.mockReturnValue(true);

    triggerPreGeneration('nb-q');

    expect(documentCacheStore.invalidate).toHaveBeenCalledWith('nb-q');
    expect(documentCacheStore.markGenerating).not.toHaveBeenCalled();
  });
});

describe('debounce', () => {
  it('does not run generation immediately', () => {
    setupNotebook('nb-debounce');
    documentCacheStore.isGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-debounce');

    expect(documentCacheStore.markGenerating).not.toHaveBeenCalled();
  });

  it('runs generation after the debounce delay', async () => {
    setupNotebook('nb-delay');
    documentCacheStore.isGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-delay');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(documentCacheStore.clearGenerating).toHaveBeenCalledWith('nb-delay');
    });

    expect(documentCacheStore.markGenerating).toHaveBeenCalledWith('nb-delay');
  });

  it('resets the timer on repeated calls, running generation only once', async () => {
    setupNotebook('nb-batch');
    documentCacheStore.isGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(3000);
    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(3000);
    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(documentCacheStore.clearGenerating).toHaveBeenCalled();
    });

    expect(documentCacheStore.markGenerating).toHaveBeenCalledTimes(1);
  });
});

describe('runPreGeneration (via triggerPreGeneration)', () => {
  it('runs all three generators and caches results', async () => {
    setupNotebook('nb-happy');
    documentCacheStore.isGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-happy');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(documentCacheStore.clearGenerating).toHaveBeenCalledWith('nb-happy');
    });

    expect(generateStudyGuide).toHaveBeenCalled();
    expect(generateFaq).toHaveBeenCalled();
    expect(generateExecutiveBrief).toHaveBeenCalled();
    expect(documentCacheStore.setCachedDocument).toHaveBeenCalledTimes(3);
  });

  it('marks generating before starting and clears it after', async () => {
    setupNotebook('nb-flag');
    documentCacheStore.isGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-flag');
    await vi.advanceTimersByTimeAsync(5000);

    expect(documentCacheStore.markGenerating).toHaveBeenCalledWith('nb-flag');

    await vi.waitFor(() => {
      expect(documentCacheStore.clearGenerating).toHaveBeenCalledWith('nb-flag');
    });
  });

  it('still clears generating flag when a generator fails', async () => {
    setupNotebook('nb-partial');
    documentCacheStore.isGenerating.mockReturnValue(false);
    generateStudyGuide.mockRejectedValue(new Error('boom'));
    generateFaq.mockResolvedValue({ subject: 'ok' });
    generateExecutiveBrief.mockResolvedValue({ title: 'ok' });

    triggerPreGeneration('nb-partial');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(documentCacheStore.clearGenerating).toHaveBeenCalledWith('nb-partial');
    });

    expect(documentCacheStore.setCachedDocument).toHaveBeenCalledTimes(2);
  });
});

describe('re-trigger for queued notebooks', () => {
  it('runs a second generation cycle after the first finishes', async () => {
    setupNotebook('nb-re');
    documentCacheStore.isGenerating
      .mockReturnValueOnce(false)   // first trigger → debounced
      .mockReturnValueOnce(true);   // second trigger → queues

    let resolveFirst;
    generateStudyGuide
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValue({ title: 'guide' });
    generateFaq.mockResolvedValue({ subject: 'topic' });
    generateExecutiveBrief.mockResolvedValue({ title: 'brief' });

    triggerPreGeneration('nb-re');
    await vi.advanceTimersByTimeAsync(5000);
    // First run is in-flight, blocked on generateStudyGuide

    triggerPreGeneration('nb-re');
    // Queued via pendingReGen since isGenerating returns true

    resolveFirst({ title: 'guide' });

    await vi.waitFor(() => {
      expect(documentCacheStore.markGenerating).toHaveBeenCalledTimes(2);
    });

    expect(documentCacheStore.clearGenerating).toHaveBeenCalledTimes(2);
    expect(documentCacheStore.setCachedDocument).toHaveBeenCalledTimes(6);
  });
});
