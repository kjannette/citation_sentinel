'use strict';

import { Router, type Request, type Response, type NextFunction } from 'express';
import logger from '../logger.js';
import { generateCitationDetail } from '../services/generationService.js';

const router = Router();

interface CitationDetailBody {
  chunkTexts?: string[];
  sourceName?: string;
  answer?: string;
  citationIndex?: number;
}

router.post('/', async (req: Request<unknown, unknown, CitationDetailBody>, res: Response, next: NextFunction) => {
  try {
    const { chunkTexts, sourceName, answer, citationIndex } = req.body;

    if (!chunkTexts?.length || !answer || citationIndex == null) {
      res.status(400).json({
        error: 'chunkTexts, answer, and citationIndex are required',
      });
      return;
    }

    logger.info({ citationIndex, sourceName }, 'citation detail requested');

    const detail = await generateCitationDetail({
      chunkTexts,
      sourceName: sourceName || 'Unknown',
      answer,
      citationIndex,
    });

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

export default router;
