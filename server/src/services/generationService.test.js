import { describe, it, expect } from 'vitest';
import { buildPrompt } from './generationService.js';

describe('buildPrompt', () => {
  const sourceGroups = [
    {
      docIndex: 1,
      name: 'Weather Facts',
      chunks: [{ text: 'The sky is blue.' }],
    },
    {
      docIndex: 2,
      name: 'Water Science',
      chunks: [
        { text: 'Water is wet.' },
        { text: 'Water boils at 100°C.' },
      ],
    },
  ];

  it('includes the user query', () => {
    const prompt = buildPrompt('Why is the sky blue?', sourceGroups);
    expect(prompt).toContain('Why is the sky blue?');
  });

  it('labels each source with [Source N] and its name', () => {
    const prompt = buildPrompt('test', sourceGroups);
    expect(prompt).toContain('[Source 1] (Weather Facts)');
    expect(prompt).toContain('[Source 2] (Water Science)');
  });

  it('includes all chunk texts within their source groups', () => {
    const prompt = buildPrompt('test', sourceGroups);
    expect(prompt).toContain('The sky is blue.');
    expect(prompt).toContain('Water is wet.');
    expect(prompt).toContain('Water boils at 100°C.');
  });

  it('instructs citation format using numeric source references', () => {
    const prompt = buildPrompt('test', sourceGroups);
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('[2]');
  });

  it('separates source groups with delimiters', () => {
    const prompt = buildPrompt('test', sourceGroups);
    expect(prompt).toContain('---');
  });

  it('works with a single source group', () => {
    const prompt = buildPrompt('test', [sourceGroups[0]]);
    expect(prompt).toContain('[Source 1] (Weather Facts)');
    expect(prompt).not.toContain('[Source 2]');
  });

  it('combines multiple chunks within a single source group', () => {
    const prompt = buildPrompt('test', [sourceGroups[1]]);
    expect(prompt).toContain('Water is wet.');
    expect(prompt).toContain('Water boils at 100°C.');
  });

  it('includes today date', () => {
    const prompt = buildPrompt('test', sourceGroups);
    expect(prompt).toMatch(/Today's date is .+\d{4}/);
  });
});
