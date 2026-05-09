import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

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
import { generateStudyGuide, generateFaq, generateExecutiveBrief } from './documentService.js';

const mockedGetNotebook = notebookStore.getNotebook as Mock;
const mockedGetSources = notebookStore.getSources as Mock;
const mockedGetChunksForNotebook = notebookStore.getChunksForNotebook as Mock;
const mockedBuildSourceGroups = notebookStore.buildSourceGroups as Mock;
const mockedIsGenerating = documentCacheStore.isGenerating as Mock;
const mockedInvalidate = documentCacheStore.invalidate as Mock;
const mockedMarkGenerating = documentCacheStore.markGenerating as Mock;
const mockedClearGenerating = documentCacheStore.clearGenerating as Mock;
const mockedSetCachedDocument = documentCacheStore.setCachedDocument as Mock;
const mockedGenerateStudyGuide = generateStudyGuide as Mock;
const mockedGenerateFaq = generateFaq as Mock;
const mockedGenerateExecutiveBrief = generateExecutiveBrief as Mock;

function setupNotebook(id: string): void {
  mockedGetNotebook.mockReturnValue({ id });
  mockedGetSources.mockReturnValue([{ id: 's1' }, { id: 's2' }]);
  mockedGetChunksForNotebook.mockReturnValue([{ id: 'c1', text: 'hello' }]);
  mockedBuildSourceGroups.mockReturnValue([{ docIndex: 1, name: 'Doc', chunks: [{ text: 'hello' }] }]);
}

function stubGeneratorsOk(): void {
  mockedGenerateStudyGuide.mockResolvedValue({ title: 'guide' });
  mockedGenerateFaq.mockResolvedValue({ subject: 'topic' });
  mockedGenerateExecutiveBrief.mockResolvedValue({ title: 'brief' });
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
    mockedGetNotebook.mockReturnValue(null);
    triggerPreGeneration('nb-missing');
    expect(mockedGetSources).not.toHaveBeenCalled();
  });

  it('does nothing if fewer than 2 sources', () => {
    mockedGetNotebook.mockReturnValue({ id: 'nb-few' });
    mockedGetSources.mockReturnValue([{ id: 's1' }]);
    triggerPreGeneration('nb-few');
    expect(mockedMarkGenerating).not.toHaveBeenCalled();
  });
});

describe('queuing when already generating', () => {
  it('invalidates cache and skips runPreGeneration', () => {
    setupNotebook('nb-q');
    mockedIsGenerating.mockReturnValue(true);

    triggerPreGeneration('nb-q');

    expect(mockedInvalidate).toHaveBeenCalledWith('nb-q');
    expect(mockedMarkGenerating).not.toHaveBeenCalled();
  });
});

describe('debounce', () => {
  it('does not run generation immediately', () => {
    setupNotebook('nb-debounce');
    mockedIsGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-debounce');

    expect(mockedMarkGenerating).not.toHaveBeenCalled();
  });

  it('runs generation after the debounce delay', async () => {
    setupNotebook('nb-delay');
    mockedIsGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-delay');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(mockedClearGenerating).toHaveBeenCalledWith('nb-delay');
    });

    expect(mockedMarkGenerating).toHaveBeenCalledWith('nb-delay');
  });

  it('resets the timer on repeated calls, running generation only once', async () => {
    setupNotebook('nb-batch');
    mockedIsGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(3000);
    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(3000);
    triggerPreGeneration('nb-batch');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(mockedClearGenerating).toHaveBeenCalled();
    });

    expect(mockedMarkGenerating).toHaveBeenCalledTimes(1);
  });
});

describe('runPreGeneration (via triggerPreGeneration)', () => {
  it('runs all three generators and caches results', async () => {
    setupNotebook('nb-happy');
    mockedIsGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-happy');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(mockedClearGenerating).toHaveBeenCalledWith('nb-happy');
    });

    expect(mockedGenerateStudyGuide).toHaveBeenCalled();
    expect(mockedGenerateFaq).toHaveBeenCalled();
    expect(mockedGenerateExecutiveBrief).toHaveBeenCalled();
    expect(mockedSetCachedDocument).toHaveBeenCalledTimes(3);
  });

  it('marks generating before starting and clears it after', async () => {
    setupNotebook('nb-flag');
    mockedIsGenerating.mockReturnValue(false);
    stubGeneratorsOk();

    triggerPreGeneration('nb-flag');
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockedMarkGenerating).toHaveBeenCalledWith('nb-flag');

    await vi.waitFor(() => {
      expect(mockedClearGenerating).toHaveBeenCalledWith('nb-flag');
    });
  });

  it('still clears generating flag when a generator fails', async () => {
    setupNotebook('nb-partial');
    mockedIsGenerating.mockReturnValue(false);
    mockedGenerateStudyGuide.mockRejectedValue(new Error('boom'));
    mockedGenerateFaq.mockResolvedValue({ subject: 'ok' });
    mockedGenerateExecutiveBrief.mockResolvedValue({ title: 'ok' });

    triggerPreGeneration('nb-partial');
    await vi.advanceTimersByTimeAsync(5000);

    await vi.waitFor(() => {
      expect(mockedClearGenerating).toHaveBeenCalledWith('nb-partial');
    });

    expect(mockedSetCachedDocument).toHaveBeenCalledTimes(2);
  });
});

describe('re-trigger for queued notebooks', () => {
  it('runs a second generation cycle after the first finishes', async () => {
    setupNotebook('nb-re');
    mockedIsGenerating.mockReturnValueOnce(false).mockReturnValueOnce(true);

    let resolveFirst: (value: { title: string }) => void;
    mockedGenerateStudyGuide
      .mockImplementationOnce(
        () =>
          new Promise<{ title: string }>((r) => {
            resolveFirst = r;
          })
      )
      .mockResolvedValue({ title: 'guide' });
    mockedGenerateFaq.mockResolvedValue({ subject: 'topic' });
    mockedGenerateExecutiveBrief.mockResolvedValue({ title: 'brief' });

    triggerPreGeneration('nb-re');
    await vi.advanceTimersByTimeAsync(5000);

    triggerPreGeneration('nb-re');

    resolveFirst!({ title: 'guide' });

    await vi.waitFor(() => {
      expect(mockedMarkGenerating).toHaveBeenCalledTimes(2);
    });

    expect(mockedClearGenerating).toHaveBeenCalledTimes(2);
    expect(mockedSetCachedDocument).toHaveBeenCalledTimes(6);
  });
});
