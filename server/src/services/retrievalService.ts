'use strict';

import logger from '../logger.js';
import * as vectorStore from '../stores/vectorStore.js';
import * as notebookStore from '../stores/notebookStore.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1';
const EMBED_MODEL = 'voyage-3';
const RERANK_MODEL = 'rerank-2';

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set');
  return key;
}

export interface TextChunk {
  id: string;
  text: string;
  sourceId: string;
  index: number;
}

interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

interface VoyageRerankResponse {
  data: Array<{ index: number; relevance_score: number }>;
}

export interface ScoredChunk {
  chunk: TextChunk;
  score: number;
}

export interface RankedChunk {
  chunk: TextChunk;
  relevanceScore: number;
}

export async function embedTexts(
  texts: string[],
  inputType: 'document' | 'query' = 'document'
): Promise<number[][]> {
  const res = await fetch(`${VOYAGE_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embed failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageEmbeddingResponse;
  return json.data.map((d) => d.embedding);
}

export function storeChunkEmbeddings(chunks: TextChunk[], embeddings: number[][]): void {
  for (let i = 0; i < chunks.length; i++) {
    vectorStore.storeVector(chunks[i].id, embeddings[i]);
  }
  logger.debug({ count: chunks.length }, 'stored chunk embeddings');
}

export function search(queryEmbedding: number[], notebookId: string, topK = 10): ScoredChunk[] {
  const chunks = notebookStore.getChunksForNotebook(notebookId) as TextChunk[];
  if (chunks.length === 0) return [];

  const scored: ScoredChunk[] = [];
  for (const chunk of chunks) {
    const vec = vectorStore.getVector(chunk.id);
    if (!vec) continue;
    scored.push({ chunk, score: cosineSimilarity(queryEmbedding, vec) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function rerank(query: string, chunks: TextChunk[]): Promise<RankedChunk[]> {
  if (chunks.length === 0) return [];

  const res = await fetch(`${VOYAGE_API_URL}/rerank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query,
      documents: chunks.map((c) => c.text),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage rerank failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as VoyageRerankResponse;
  return json.data.map((item) => ({
    chunk: chunks[item.index],
    relevanceScore: item.relevance_score,
  }));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
