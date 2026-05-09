'use strict';

import Anthropic from '@anthropic-ai/sdk';
import logger from '../logger.js';

const MODEL = 'claude-opus-4-6';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      description:
        'The answer with inline numeric citations like [1], [2] matching the source document numbers provided',
    },
    citedSourceIndices: {
      type: 'array',
      items: { type: 'integer' },
      description: 'The document numbers cited in the answer',
    },
    followUpQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly 3 follow-up questions the user might ask',
    },
  },
  required: ['answer', 'citedSourceIndices', 'followUpQuestions'],
  additionalProperties: false,
} as const;

export interface SourceChunk {
  text: string;
}

export interface SourceGroup {
  docIndex: number;
  name: string;
  chunks: SourceChunk[];
}

export interface GenerationResult {
  answer: string;
  citedSourceIndices: number[];
  followUpQuestions: string[];
}

export interface CitationDetailParams {
  chunkTexts: string[];
  sourceName: string;
  answer: string;
  citationIndex: number;
}

export interface RelevantLink {
  title: string;
  url: string;
}

export interface CitationDetail {
  citedSentence: string;
  topicSummary: string;
  additionalInsight: string;
  relevantLinks: RelevantLink[];
}

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export function buildPrompt(query: string, sourceGroups: SourceGroup[]): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sources = sourceGroups
    .map((g) => {
      const combined = g.chunks.map((c) => c.text).join('\n\n');
      return `[Source ${g.docIndex}] (${g.name})\n${combined}`;
    })
    .join('\n\n---\n\n');

  return `You are a research assistant. Today's date is ${today}. Answer the user's question using ONLY the source documents provided below. Follow these rules strictly:

1. Ground every claim in a specific source document. Cite sources inline using numeric notation like [1], [2], etc., matching the source document numbers below.
2. If the sources do not contain enough information to answer, say so honestly.
3. After your answer, suggest exactly 3 follow-up questions the user might ask based on the sources.

--- SOURCE DOCUMENTS ---

${sources}

--- USER QUESTION ---

${query}`;
}

export async function generate(query: string, sourceGroups: SourceGroup[]): Promise<GenerationResult> {
  const client = getClient();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(query, sourceGroups) }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: RESPONSE_SCHEMA,
      },
    },
  });

  const textBlock = message.content[0];
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
  logger.debug({ rawLength: raw.length }, 'claude response received');

  const parsed = JSON.parse(raw) as {
    answer?: string;
    citedSourceIndices?: number[];
    followUpQuestions?: string[];
  };

  const validIndices = new Set(sourceGroups.map((g) => g.docIndex));
  const citedSourceIndices = [
    ...new Set((parsed.citedSourceIndices || []).filter((idx) => validIndices.has(idx))),
  ];

  return {
    answer: parsed.answer || '',
    citedSourceIndices,
    followUpQuestions: parsed.followUpQuestions || [],
  };
}

const CITATION_DETAIL_SCHEMA = {
  type: 'object',
  properties: {
    citedSentence: {
      type: 'string',
      description: 'The exact sentence or passage from the source material that the citation refers to',
    },
    topicSummary: {
      type: 'string',
      description: 'A concise summary of the broader topic/context surrounding the cited passage',
    },
    additionalInsight: {
      type: 'string',
      description:
        'Additional expert insight, analysis, or context on the subject beyond what the source states',
    },
    relevantLinks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Descriptive link title' },
          url: { type: 'string', description: 'Full URL to the resource' },
        },
        required: ['title', 'url'],
        additionalProperties: false,
      },
      description: 'Up to 3 relevant web resources for further reading on the topic',
    },
  },
  required: ['citedSentence', 'topicSummary', 'additionalInsight', 'relevantLinks'],
  additionalProperties: false,
} as const;

export async function generateCitationDetail({
  chunkTexts,
  sourceName,
  answer,
  citationIndex,
}: CitationDetailParams): Promise<CitationDetail> {
  const client = getClient();

  const sourceText = chunkTexts.join('\n\n');

  const prompt = `You are a research assistant. A user is reading a research response and wants to dive deeper into a specific citation. Below is the full answer they are reading, followed by the source material for citation [${citationIndex}] from "${sourceName}".

Your task:
1. Identify the specific sentence or passage from the source material that citation [${citationIndex}] refers to in the answer.
2. Summarize the broader topic/context surrounding that passage in the source material.
3. Provide additional expert insight or analysis on this subject that would help the reader understand it more deeply.
4. Suggest up to 3 relevant, real web resources (articles, papers, official sites) where the reader can learn more about this specific topic. Only include links you are highly confident are real and accessible.

--- ANSWER THE USER WAS READING ---

${answer}

--- SOURCE MATERIAL FOR [${citationIndex}] (${sourceName}) ---

${sourceText}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1536,
    messages: [{ role: 'user', content: prompt }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: CITATION_DETAIL_SCHEMA,
      },
    },
  });

  const textBlock = message.content[0];
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '';
  logger.debug({ citationIndex, rawLength: raw.length }, 'citation detail response received');

  return JSON.parse(raw) as CitationDetail;
}
