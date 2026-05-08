'use strict';

import { Router } from 'express';
import logger from '../logger.js';
import { generateCitationDetail } from '../services/generationService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { chunkTexts, sourceName, answer, citationIndex } = req.body;

    if (!chunkTexts?.length || !answer || citationIndex == null) {
      return res.status(400).json({
        error: 'chunkTexts, answer, and citationIndex are required',
      });
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
