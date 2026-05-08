'use strict';

import Anthropic from '@anthropic-ai/sdk';
import logger from '../logger.js';

const MODEL = 'claude-sonnet-4-5-20250929';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

const MAX_SOURCE_CHARS = 30000;

function buildSourceBlock(sourceGroups) {
  const perSourceBudget = Math.floor(MAX_SOURCE_CHARS / (sourceGroups.length || 1));

  return sourceGroups
    .map((g) => {
      const combined = g.chunks.map((c) => c.text).join('\n\n');
      const trimmed =
        combined.length > perSourceBudget
          ? combined.slice(0, perSourceBudget) + '\n[...truncated]'
          : combined;
      return `[Source ${g.docIndex}] (${g.name})\n${trimmed}`;
    })
    .join('\n\n---\n\n');
}

const STUDY_GUIDE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A concise title for the study guide' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' }, description: 'Key points as bullet items' },
          keyTerms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                term: { type: 'string' },
                definition: { type: 'string' },
              },
              required: ['term', 'definition'],
              additionalProperties: false,
            },
          },
          reviewQuestions: { type: 'array', items: { type: 'string' }, description: 'Self-test questions for this section' },
        },
        required: ['heading', 'bullets', 'keyTerms', 'reviewQuestions'],
        additionalProperties: false,
      },
    },
    mnemonics: {
      type: 'array',
      items: { type: 'string' },
      description: 'Memory aids, simplified restatements, or mnemonic devices for the hardest concepts',
    },
  },
  required: ['title', 'sections', 'mnemonics'],
  additionalProperties: false,
};

export async function generateStudyGuide(sourceGroups) {
  const client = getClient();
  const sources = buildSourceBlock(sourceGroups);
  const start = Date.now();

  const prompt = `You are an expert educator. Given the source documents below, produce a comprehensive study guide. Follow these rules:

1. Create a structured outline of the main ideas organized into logical sections.
2. For each section, provide: bullet-point key concepts, key terms with definitions, and 2-3 self-review questions.
3. At the end, provide mnemonic devices or simplified restatements to help memorize the hardest concepts.
4. Be concise but thorough. Use simple, clear language.

--- SOURCE DOCUMENTS ---

${sources}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: STUDY_GUIDE_SCHEMA } },
  });

  const parsed = JSON.parse(message.content[0]?.text || '{}');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info({ sections: parsed.sections?.length, elapsedSec: elapsed }, 'study guide generated');
  return parsed;
}

const FAQ_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string', description: 'The identified common subject/theme across all sources' },
    faqPairs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
      description: '8-15 frequently asked questions with concise answers',
    },
  },
  required: ['subject', 'faqPairs'],
  additionalProperties: false,
};

export async function generateFaq(sourceGroups) {
  const client = getClient();
  const sources = buildSourceBlock(sourceGroups);
  const start = Date.now();

  const prompt = `You are a subject-matter expert. Given the source documents below, perform two tasks:

1. IDENTIFY THE SUBJECT: Analyze all sources and determine the common subject, theme, or topic they share. Do NOT ask the user — infer it from the semantic overlap across the documents.
2. GENERATE FAQ: Produce 8-15 frequently asked questions that someone studying or researching this subject would likely ask, along with concise, accurate answers grounded in the source material.

Make the questions range from foundational ("What is...") to more advanced/nuanced. Answers should be 2-4 sentences each.

--- SOURCE DOCUMENTS ---

${sources}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: FAQ_SCHEMA } },
  });

  const parsed = JSON.parse(message.content[0]?.text || '{}');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info({ subject: parsed.subject, pairs: parsed.faqPairs?.length, elapsedSec: elapsed }, 'FAQ generated');
  return parsed;
}

const EXEC_BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'The main subject header for the brief' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subhead: { type: 'string' },
          prose: { type: 'string', description: 'Well-written prose paragraph(s) for this section' },
        },
        required: ['subhead', 'prose'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'sections'],
  additionalProperties: false,
};

export async function generateExecutiveBrief(sourceGroups) {
  const client = getClient();
  const sources = buildSourceBlock(sourceGroups);
  const start = Date.now();

  const prompt = `You are a senior analyst writing an executive brief. Given the source documents below, produce a highly organized, prose-form summary. Follow these rules:

1. Identify the overarching subject and use it as the main title/header.
2. Organize the information into logical sections, each with a clear subheading.
3. Write in polished prose — NO bullet points, NO lists. Use well-structured paragraphs.
4. Condense the source material to the equivalent of approximately 3 pages. Prioritize the most important findings, arguments, and conclusions.
5. Maintain an authoritative, professional tone suitable for executive-level readers.

--- SOURCE DOCUMENTS ---

${sources}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: EXEC_BRIEF_SCHEMA } },
  });

  const parsed = JSON.parse(message.content[0]?.text || '{}');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  logger.info({ title: parsed.title, sections: parsed.sections?.length, elapsedSec: elapsed }, 'executive brief generated');
  return parsed;
}
