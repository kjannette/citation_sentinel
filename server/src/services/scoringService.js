'use strict';

import { embedTexts, cosineSimilarity } from './retrievalService.js';
import * as vectorStore from '../stores/vectorStore.js';
import logger from '../logger.js';

// Calibration bounds for voyage-3 cosine similarity.
// Empirically, near-direct-quote sentences top out around 0.68-0.72
// raw cosine similarity; unrelated text falls below ~0.35.
const SIM_FLOOR = 0.35;
const SIM_CEILING = 0.65;
const MIN_SENTENCE_LENGTH = 20;

function splitIntoSentences(text) {
  const cleaned = text.replace(/\[\d+\]/g, '').trim();
  const raw = cleaned.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_SENTENCE_LENGTH);
}

function calibrate(rawSim) {
  const scaled =
    (rawSim - SIM_FLOOR) / (SIM_CEILING - SIM_FLOOR);
  return Math.max(0, Math.min(1, scaled));
}

export async function computeGroundedness(
  answerText,
  citedChunkIds
) {
  if (!citedChunkIds || citedChunkIds.length === 0) return 0;

  const sentences = splitIntoSentences(answerText);
  if (sentences.length === 0) return 0;

  const sentenceEmbeddings = await embedTexts(
    sentences,
    'document'
  );

  const chunkVectors = [];
  for (const chunkId of citedChunkIds) {
    const vec = vectorStore.getVector(chunkId);
    if (vec) {
      chunkVectors.push(vec);
    } else {
      logger.debug({ chunkId }, 'no embedding found for cited chunk');
    }
  }

  if (chunkVectors.length === 0) return 0;

  let totalCalibrated = 0;

  for (let i = 0; i < sentenceEmbeddings.length; i++) {
    let bestSim = -1;
    for (const chunkVec of chunkVectors) {
      const sim = cosineSimilarity(sentenceEmbeddings[i], chunkVec);
      if (sim > bestSim) bestSim = sim;
    }
    const scored = calibrate(bestSim);
    logger.debug(
      {
        sentence: sentences[i].slice(0, 60),
        rawSim: bestSim.toFixed(3),
        calibrated: scored.toFixed(3),
      },
      'sentence groundedness'
    );
    totalCalibrated += scored;
  }

  return totalCalibrated / sentenceEmbeddings.length;
}

