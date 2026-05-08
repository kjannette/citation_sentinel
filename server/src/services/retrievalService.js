'use strict';

import logger from '../logger.js';
import * as vectorStore from '../stores/vectorStore.js';
import * as notebookStore from '../stores/notebookStore.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1';
const EMBED_MODEL = 'voyage-3';
const RERANK_MODEL = 'rerank-2';

function getApiKey() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set');
  return key;
}

export async function embedTexts(texts, inputType = 'document') {
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

  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

export function storeChunkEmbeddings(chunks, embeddings) {
  for (let i = 0; i < chunks.length; i++) {
    vectorStore.storeVector(chunks[i].id, embeddings[i]);
  }
  logger.debug({ count: chunks.length }, 'stored chunk embeddings');
}

export function search(queryEmbedding, notebookId, topK = 10) {
  const chunks = notebookStore.getChunksForNotebook(notebookId);
  if (chunks.length === 0) return [];

  const scored = [];
  for (const chunk of chunks) {
    const vec = vectorStore.getVector(chunk.id);
    if (!vec) continue;
    scored.push({ chunk, score: cosineSimilarity(queryEmbedding, vec) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function rerank(query, chunks) {
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

  const json = await res.json();
  return json.data.map((item) => ({
    chunk: chunks[item.index],
    relevanceScore: item.relevance_score,
  }));
}

// Computes cosine similarity between two vectors `a` and `b`.
// Cosine similarity measures how similar two vectors' *directions* are,
// ignoring their magnitudes. It returns a value from -1 (opposite) to 1 (identical direction).
// Formula: cos(θ) = (a · b) / (||a|| * ||b||)
function cosineSimilarity(a, b) {
  // Accumulator for the dot product (a · b): the sum of element-wise products.
  // The dot product captures how much the two vectors "agree" — it grows
  // when corresponding elements point the same way and shrinks when they oppose.
  let dot = 0;

  // Accumulator for the squared magnitude of vector `a` (sum of a[i]²).
  // After the loop, Math.sqrt(normA) will give ||a||, the Euclidean length of `a`.
  // This is needed for the denominator, which normalizes out each vector's magnitude
  // so the result reflects only directional similarity, not scale.
  let normA = 0;

  // Same as above, but for vector `b`. Together with normA, these two values
  // will form the denominator ||a|| * ||b|| that scales the dot product into
  // the -1..1 cosine similarity range.
  let normB = 0;

  // Walk through every dimension of the two vectors in lockstep.
  for (let i = 0; i < a.length; i++) {
    // Multiply the i-th elements of `a` and `b` and add to the running dot product.
    // Each term a[i]*b[i] contributes positively when both components share the same
    // sign (both positive or both negative) and negatively when they differ.
    dot += a[i] * b[i];

    // Square the i-th element of `a` and accumulate it toward `a`'s squared magnitude.
    // Squaring ensures every component contributes positively regardless of sign.
    normA += a[i] * a[i];

    // Same for vector `b` — accumulate toward `b`'s squared magnitude.
    normB += b[i] * b[i];
  }

  // Compute the denominator: the product of the two vectors' Euclidean lengths.
  // Taking the square root of each accumulated sum-of-squares converts them from
  // squared magnitudes back into actual magnitudes (lengths).
  const denom = Math.sqrt(normA) * Math.sqrt(normB);

  // If either vector has zero magnitude (all zeros), the denominator is 0 and
  // division would produce NaN, so we return 0 (no meaningful similarity).
  // Otherwise, dividing the dot product by the combined magnitudes yields the
  // cosine of the angle between the vectors — our similarity score.
  return denom === 0 ? 0 : dot / denom;
}

export { cosineSimilarity };
