'use strict';

import { Router, type Request, type Response, type NextFunction } from 'express';
import logger from '../logger.js';
import { embedTexts, search, rerank } from '../services/retrievalService.js';
import type { ScoredChunk, RankedChunk, TextChunk } from '../services/retrievalService.js';
import { generate } from '../services/generationService.js';
import type { GenerationResult } from '../services/generationService.js';
import { computeGroundedness } from '../services/scoringService.js';
import * as notebookStore from '../stores/notebookStore.js';
import type { SourceGroup } from '../stores/notebookStore.js';

const TOP_K_SEARCH = 20;
const TOP_K_RERANK = 5;

const router = Router();

interface QueryBody {
  notebookId?: string;
  question?: string;
}

interface Citation {
  sourceIndex: number;
  sourceId: string | null;
  name: string | null;
  chunkTexts: string[];
}

interface QueryResponse {
  answer: string;
  citations: Citation[];
  groundednessScore: number | null;
  followUpQuestions: string[];
}

router.post('/', async (req: Request<unknown, unknown, QueryBody>, res: Response, next: NextFunction) => {
  try {
    const { notebookId, question } = req.body;
    if (!notebookId || !question) {
      res.status(400).json({ error: 'notebookId and question are required' });
      return;
    }

    logger.info({ notebookId, question }, 'query received');

    const [queryEmbedding]: number[][] = await embedTexts([question], 'query');

    const searchResults: ScoredChunk[] = search(queryEmbedding, notebookId, TOP_K_SEARCH);
    if (searchResults.length === 0) {
      res.json({
        answer: 'No sources found for this notebook. Upload some documents first.',
        citations: [],
        groundednessScore: null,
        followUpQuestions: [],
      });
      return;
    }

    const candidateChunks: TextChunk[] = searchResults.map((r) => r.chunk);
    const reranked: RankedChunk[] = await rerank(question, candidateChunks);
    const topChunks: TextChunk[] = reranked.slice(0, TOP_K_RERANK).map((r) => r.chunk);

    logger.debug(
      {
        searchHits: searchResults.length,
        rerankedTop: topChunks.length,
      },
      'retrieval complete'
    );

    const sourceGroups: SourceGroup[] = notebookStore.buildSourceGroups(notebookId, topChunks);

    const { answer, citedSourceIndices, followUpQuestions }: GenerationResult = await generate(question, sourceGroups);

    const citedChunkIds: string[] = [];
    for (const idx of citedSourceIndices) {
      const group: SourceGroup | undefined = sourceGroups.find((g) => g.docIndex === idx);
      if (group) {
        citedChunkIds.push(...group.chunks.map((c) => c.id));
      }
    }

    const groundednessScore: number = await computeGroundedness(answer, citedChunkIds);

    logger.info({ groundednessScore: groundednessScore.toFixed(3) }, 'query complete');

    const citations: Citation[] = citedSourceIndices.map((idx) => {
      const group: SourceGroup | undefined = sourceGroups.find((g) => g.docIndex === idx);
      return group
        ? {
            sourceIndex: idx,
            sourceId: group.sourceId,
            name: group.name,
            chunkTexts: group.chunks.map((c) => c.text),
          }
        : { sourceIndex: idx, sourceId: null, name: null, chunkTexts: [] as string[] };
    });

    const response: QueryResponse = {
      answer,
      citations,
      groundednessScore,
      followUpQuestions,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
