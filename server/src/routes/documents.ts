'use strict';

import { Router, type Request, type Response, type NextFunction } from 'express';
import logger from '../logger.js';
import * as notebookStore from '../stores/notebookStore.js';
import * as documentCacheStore from '../stores/documentCacheStore.js';
import {
  generateStudyGuide,
  generateFaq,
  generateExecutiveBrief,
  type SourceGroup,
  type StudyGuide,
  type Faq,
  type ExecutiveBrief,
} from '../services/documentService.js';

type DocumentType = 'study-guide' | 'faq' | 'executive-brief';
type GeneratorFn = (sourceGroups: SourceGroup[]) => Promise<StudyGuide | Faq | ExecutiveBrief>;

const GENERATORS: Record<DocumentType, GeneratorFn> = {
  'study-guide': generateStudyGuide,
  'faq': generateFaq,
  'executive-brief': generateExecutiveBrief,
};

const router = Router();

interface GenerateBody {
  notebookId?: string;
  type?: string;
}

router.post('/generate', async (req: Request<unknown, unknown, GenerateBody>, res: Response, next: NextFunction) => {
  try {
    const { notebookId, type } = req.body;

    if (!notebookId || !type) {
      res.status(400).json({ error: 'notebookId and type are required' });
      return;
    }

    const generator = GENERATORS[type as DocumentType];
    if (!generator) {
      res.status(400).json({
        error: `Invalid type. Must be one of: ${Object.keys(GENERATORS).join(', ')}`,
      });
      return;
    }

    const chunks = notebookStore.getChunksForNotebook(notebookId);
    if (chunks.length === 0) {
      res.status(422).json({ error: 'No source material available in this notebook' });
      return;
    }

    const sources = notebookStore.getSources(notebookId);
    const cached = documentCacheStore.getCachedDocument(notebookId, type);
    if (cached && documentCacheStore.isFresh(notebookId, type, sources)) {
      logger.info({ notebookId, type }, 'serving cached document');
      res.json({ type, document: cached.document });
      return;
    }

    const sourceGroups = notebookStore.buildSourceGroups(notebookId, chunks);

    logger.info(
      { notebookId, type, sourceCount: sourceGroups.length, chunkCount: chunks.length },
      'document generation started'
    );

    const document = await generator(sourceGroups);

    documentCacheStore.setCachedDocument(notebookId, type, document, sources);
    logger.info({ notebookId, type }, 'document generation complete');

    res.json({ type, document });
  } catch (err) {
    next(err);
  }
});

export default router;
