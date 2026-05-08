'use strict';

import { Router } from 'express';
import logger from '../logger.js';
import * as notebookStore from '../stores/notebookStore.js';
import * as documentCacheStore from '../stores/documentCacheStore.js';
import {
  generateStudyGuide,
  generateFaq,
  generateExecutiveBrief,
} from '../services/documentService.js';

const GENERATORS = {
  'study-guide': generateStudyGuide,
  'faq': generateFaq,
  'executive-brief': generateExecutiveBrief,
};

const router = Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { notebookId, type } = req.body;

    if (!notebookId || !type) {
      return res.status(400).json({ error: 'notebookId and type are required' });
    }

    const generator = GENERATORS[type];
    if (!generator) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${Object.keys(GENERATORS).join(', ')}`,
      });
    }

    const chunks = notebookStore.getChunksForNotebook(notebookId);
    if (chunks.length === 0) {
      return res.status(422).json({ error: 'No source material available in this notebook' });
    }

    const sources = notebookStore.getSources(notebookId);
    const cached = documentCacheStore.getCachedDocument(notebookId, type);
    if (cached && documentCacheStore.isFresh(notebookId, type, sources)) {
      logger.info({ notebookId, type }, 'serving cached document');
      return res.json({ type, document: cached.document });
    }

    const sourceGroups = notebookStore.buildSourceGroups(notebookId, chunks);

    logger.info({ notebookId, type, sourceCount: sourceGroups.length, chunkCount: chunks.length }, 'document generation started');

    const document = await generator(sourceGroups);

    documentCacheStore.setCachedDocument(notebookId, type, document, sources);
    logger.info({ notebookId, type }, 'document generation complete');

    res.json({ type, document });
  } catch (err) {
    next(err);
  }
});

export default router;
