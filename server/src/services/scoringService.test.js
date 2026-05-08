import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./retrievalService.js', () => ({
  embedTexts: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

vi.mock('../stores/vectorStore.js', () => ({
  getVector: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { computeGroundedness } from './scoringService.js';
import { embedTexts, cosineSimilarity } from './retrievalService.js';
import * as vectorStore from '../stores/vectorStore.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('computeGroundedness', () => {
  it('returns 0 when citedChunkIds is empty', async () => {
    expect(await computeGroundedness('Some answer text here.', [])).toBe(0);
  });

  it('returns 0 when citedChunkIds is null/undefined', async () => {
    expect(await computeGroundedness('Some answer text.', null)).toBe(0);
    expect(await computeGroundedness('Some answer text.', undefined)).toBe(0);
  });

  it('returns 0 when answer has no sentences long enough', async () => {
    expect(await computeGroundedness('Short.', ['chunk-1'])).toBe(0);
  });

  it('returns 0 when no chunk vectors are found', async () => {
    vectorStore.getVector.mockReturnValue(null);
    const answer = 'This is a sentence that is definitely long enough to pass the filter.';
    expect(await computeGroundedness(answer, ['chunk-1'])).toBe(0);
  });

  it('returns 1.0 when all sentences have similarity at or above the ceiling', async () => {
    const fakeVec = new Float32Array([1, 0, 0]);
    vectorStore.getVector.mockReturnValue(fakeVec);
    embedTexts.mockResolvedValue([new Float32Array([1, 0, 0])]);
    cosineSimilarity.mockReturnValue(0.70);

    const answer = 'This sentence is long enough to be included in the analysis.';
    const score = await computeGroundedness(answer, ['chunk-1']);
    expect(score).toBe(1);
  });

  it('returns 0 when all sentences have similarity at or below the floor', async () => {
    const fakeVec = new Float32Array([1, 0, 0]);
    vectorStore.getVector.mockReturnValue(fakeVec);
    embedTexts.mockResolvedValue([new Float32Array([0, 1, 0])]);
    cosineSimilarity.mockReturnValue(0.20);

    const answer = 'This sentence is long enough to be included in the analysis.';
    const score = await computeGroundedness(answer, ['chunk-1']);
    expect(score).toBe(0);
  });

  it('returns a value between 0 and 1 for mid-range similarity', async () => {
    const fakeVec = new Float32Array([1, 0, 0]);
    vectorStore.getVector.mockReturnValue(fakeVec);
    embedTexts.mockResolvedValue([new Float32Array([1, 0, 0])]);
    cosineSimilarity.mockReturnValue(0.50);

    const answer = 'This sentence is long enough to be included in the analysis.';
    const score = await computeGroundedness(answer, ['chunk-1']);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
    expect(score).toBeCloseTo(0.5, 1);
  });

  it('averages across multiple sentences', async () => {
    const fakeVec = new Float32Array([1, 0, 0]);
    vectorStore.getVector.mockReturnValue(fakeVec);
    embedTexts.mockResolvedValue([
      new Float32Array([1, 0, 0]),
      new Float32Array([0, 1, 0]),
    ]);
    cosineSimilarity
      .mockReturnValueOnce(0.65)
      .mockReturnValueOnce(0.35);

    const answer =
      'This is the first sentence that is long enough. This is the second sentence that is also long enough.';
    const score = await computeGroundedness(answer, ['chunk-1']);
    expect(score).toBeCloseTo(0.5, 1);
  });

  it('picks the best similarity across multiple chunk vectors', async () => {
    vectorStore.getVector
      .mockReturnValueOnce(new Float32Array([1, 0, 0]))
      .mockReturnValueOnce(new Float32Array([0, 1, 0]));
    embedTexts.mockResolvedValue([new Float32Array([1, 0, 0])]);
    cosineSimilarity
      .mockReturnValueOnce(0.40)
      .mockReturnValueOnce(0.65);

    const answer = 'This sentence is long enough to be included in the analysis.';
    const score = await computeGroundedness(answer, ['chunk-1', 'chunk-2']);
    expect(score).toBe(1);
  });

  it('strips citation markers [1] [2] before splitting sentences', async () => {
    const fakeVec = new Float32Array([1, 0, 0]);
    vectorStore.getVector.mockReturnValue(fakeVec);
    embedTexts.mockResolvedValue([new Float32Array([1, 0, 0])]);
    cosineSimilarity.mockReturnValue(0.50);

    const answer = 'The sky is blue according to science [1]. Water covers most of the earth [2].';
    await computeGroundedness(answer, ['chunk-1']);

    const embeddedTexts = embedTexts.mock.calls[0][0];
    for (const text of embeddedTexts) {
      expect(text).not.toMatch(/\[\d+\]/);
    }
  });
});
