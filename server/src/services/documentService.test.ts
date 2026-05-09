import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

vi.mock('../logger.js', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  generateStudyGuide,
  generateFaq,
  generateExecutiveBrief,
  type SourceGroup,
  type StudyGuide,
  type Faq,
  type ExecutiveBrief,
} from './documentService.js';

const SOURCE_GROUPS: SourceGroup[] = [
  { docIndex: 1, name: 'Doc A', chunks: [{ text: 'Alpha content.' }] },
  { docIndex: 2, name: 'Doc B', chunks: [{ text: 'Beta first.' }, { text: 'Beta second.' }] },
];

function apiResponse<T>(obj: T): { content: Array<{ text: string }> } {
  return { content: [{ text: JSON.stringify(obj) }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe('generateStudyGuide', () => {
  const STUDY_GUIDE: StudyGuide = {
    title: 'Test Guide',
    sections: [{ heading: 'Intro', bullets: ['b1'], keyTerms: [], reviewQuestions: [] }],
    mnemonics: ['ABC'],
  };

  it('returns the parsed API response', async () => {
    mockCreate.mockResolvedValue(apiResponse(STUDY_GUIDE));
    const result = await generateStudyGuide(SOURCE_GROUPS);
    expect(result).toEqual(STUDY_GUIDE);
  });

  it('sends source content in the prompt', async () => {
    mockCreate.mockResolvedValue(apiResponse(STUDY_GUIDE));
    await generateStudyGuide(SOURCE_GROUPS);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('[Source 1] (Doc A)');
    expect(prompt).toContain('Alpha content.');
    expect(prompt).toContain('[Source 2] (Doc B)');
    expect(prompt).toContain('Beta first.');
    expect(prompt).toContain('Beta second.');
  });

  it('separates source groups with delimiters', async () => {
    mockCreate.mockResolvedValue(apiResponse(STUDY_GUIDE));
    await generateStudyGuide(SOURCE_GROUPS);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('---');
  });
});

describe('generateFaq', () => {
  const FAQ: Faq = {
    subject: 'Testing',
    faqPairs: [{ question: 'Q?', answer: 'A.' }],
  };

  it('returns the parsed API response', async () => {
    mockCreate.mockResolvedValue(apiResponse(FAQ));
    const result = await generateFaq(SOURCE_GROUPS);
    expect(result).toEqual(FAQ);
  });

  it('sends source content in the prompt', async () => {
    mockCreate.mockResolvedValue(apiResponse(FAQ));
    await generateFaq(SOURCE_GROUPS);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('[Source 1] (Doc A)');
    expect(prompt).toContain('[Source 2] (Doc B)');
  });
});

describe('generateExecutiveBrief', () => {
  const BRIEF: ExecutiveBrief = {
    title: 'Exec Brief',
    sections: [{ subhead: 'Overview', prose: 'Some prose.' }],
  };

  it('returns the parsed API response', async () => {
    mockCreate.mockResolvedValue(apiResponse(BRIEF));
    const result = await generateExecutiveBrief(SOURCE_GROUPS);
    expect(result).toEqual(BRIEF);
  });

  it('sends source content in the prompt', async () => {
    mockCreate.mockResolvedValue(apiResponse(BRIEF));
    await generateExecutiveBrief(SOURCE_GROUPS);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('[Source 1] (Doc A)');
    expect(prompt).toContain('[Source 2] (Doc B)');
  });
});

describe('shared behaviour', () => {
  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateStudyGuide(SOURCE_GROUPS)).rejects.toThrow('ANTHROPIC_API_KEY is not set');
  });

  it('returns empty object when the API returns empty content', async () => {
    mockCreate.mockResolvedValue({ content: [{ text: '' }] });
    const result = await generateStudyGuide(SOURCE_GROUPS);
    expect(result).toEqual({});
  });

  it('truncates sources that exceed the per-source character budget', async () => {
    const longText = 'x'.repeat(35_000);
    const bigGroups: SourceGroup[] = [{ docIndex: 1, name: 'Big', chunks: [{ text: longText }] }];
    mockCreate.mockResolvedValue(apiResponse({ title: 't', sections: [], mnemonics: [] }));

    await generateStudyGuide(bigGroups);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('[...truncated]');
    expect(prompt.length).toBeLessThan(longText.length);
  });

  it('combines multiple chunks within a source with double newlines', async () => {
    const groups: SourceGroup[] = [
      { docIndex: 1, name: 'Multi', chunks: [{ text: 'AAA' }, { text: 'BBB' }] },
    ];
    mockCreate.mockResolvedValue(apiResponse({ title: 't', sections: [], mnemonics: [] }));

    await generateStudyGuide(groups);

    const prompt = (mockCreate as Mock).mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('AAA\n\nBBB');
  });
});
