'use strict';

import { Router } from 'express';
import logger from '../logger.js';
import { embedTexts, search, rerank } from '../services/retrievalService.js';
import { generate } from '../services/generationService.js';
import { computeGroundedness } from '../services/scoringService.js';
import * as notebookStore from '../stores/notebookStore.js';

const TOP_K_SEARCH = 20;
const TOP_K_RERANK = 5;

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { notebookId, question } = req.body;
    if (!notebookId || !question) {
      return res.status(400).json({ error: 'notebookId and question are required' });
    }

    logger.info({ notebookId, question }, 'query received');

    const [queryEmbedding] = await embedTexts([question], 'query');

    const searchResults = search(queryEmbedding, notebookId, TOP_K_SEARCH);
    if (searchResults.length === 0) {
      return res.json({
        answer: 'No sources found for this notebook. Upload some documents first.',
        citations: [],
        groundednessScore: null,
        followUpQuestions: [],
      });
    }

    const candidateChunks = searchResults.map((r) => r.chunk);
    const reranked = await rerank(question, candidateChunks);
    const topChunks = reranked.slice(0, TOP_K_RERANK).map((r) => r.chunk);

    logger.debug({
      searchHits: searchResults.length,
      rerankedTop: topChunks.length,
    }, 'retrieval complete');

    const sourceGroups = notebookStore.buildSourceGroups(notebookId, topChunks);

    const { answer, citedSourceIndices, followUpQuestions } = await generate(
      question,
      sourceGroups,
    );

    const citedChunkIds = [];
    for (const idx of citedSourceIndices) {
      const group = sourceGroups.find((g) => g.docIndex === idx);
      if (group) {
        citedChunkIds.push(...group.chunks.map((c) => c.id));
      }
    }

    const groundednessScore = await computeGroundedness(answer, citedChunkIds);

    logger.info({ groundednessScore: groundednessScore.toFixed(3) }, 'query complete');

    const citations = citedSourceIndices.map((idx) => {
      const group = sourceGroups.find((g) => g.docIndex === idx);
      return group
        ? {
          sourceIndex: idx,
          sourceId: group.sourceId,
          name: group.name,
          chunkTexts: group.chunks.map((c) => c.text),
        }
        : { sourceIndex: idx, sourceId: null, name: null, chunkTexts: [] };
    });

    res.json({
      answer,
      citations,
      groundednessScore,
      followUpQuestions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

