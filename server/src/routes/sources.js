'use strict';

import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';
import * as notebookStore from '../stores/notebookStore.js';
import {
  parseFile,
  chunkText,
  parseUrl,
  parseYoutubeUrl,
  isYoutubeUrl,
} from '../services/sourceService.js';
import { embedTexts, storeChunkEmbeddings } from '../services/retrievalService.js';
import { triggerPreGeneration } from '../services/preGenerationService.js';
import {
  requireNotebookId,
  requireNotebook,
  requireFile,
  requireUrl,
} from '../middleware/validation.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

const TIMESTAMP_RE = /\s+\d{1,2}\.\d{2}\.\d{2}\s*[\u2018\u2019''\s]?\s*[AP]M(?=\.\w+$)/i;
function cleanFilename(name) {
  return name.replace(TIMESTAMP_RE, '');
}

router.get('/', requireNotebookId, (req, res) => {
  res.json(notebookStore.getSources(req.notebookId));
});


function multerUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50 MB.' });
      }
      return next(err);
    }
    next();
  });
}

router.post(
  '/',
  multerUpload,
  requireNotebookId,
  requireNotebook,
  requireFile,
  async (req, res, next) => {
    try {
      const sourceId = uuidv4();
      const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
      const displayName = cleanFilename(rawName);
      const text = await parseFile(req.file.buffer, req.file.mimetype, displayName);
      const chunks = chunkText(text, sourceId);

      logger.info({
        sourceId,
        filename: displayName,
        chunkCount: chunks.length,
      }, 'parsed and chunked source');

      notebookStore.addChunksToNotebook(req.notebookId, chunks);

      const texts = chunks.map((c) => c.text);
      const embeddings = await embedTexts(texts, 'document');
      storeChunkEmbeddings(chunks, embeddings);

      const source = notebookStore.addSource(req.notebookId, {
        id: sourceId,
        name: displayName,
        mimetype: req.file.mimetype,
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString(),
      });

      triggerPreGeneration(req.notebookId);

      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/url',
  requireNotebookId,
  requireNotebook,
  requireUrl,
  async (req, res, next) => {
    try {
      const { url } = req.body;
      const sourceId = uuidv4();
      const isYT = isYoutubeUrl(url);
      const displayName = isYT
        ? `YouTube: ${url}`
        : url.replace(/^https?:\/\//, '').slice(0, 60);

      logger.info({ sourceId, url, isYT }, 'processing URL source');

      const text = isYT ? await parseYoutubeUrl(url) : await parseUrl(url);
      const chunks = chunkText(text, sourceId);

      if (chunks.length === 0) {
        return res.status(422).json({ error: 'No usable text could be extracted from the URL' });
      }

      notebookStore.addChunksToNotebook(req.notebookId, chunks);

      const texts = chunks.map((c) => c.text);
      const embeddings = await embedTexts(texts, 'document');
      storeChunkEmbeddings(chunks, embeddings);

      const source = notebookStore.addSource(req.notebookId, {
        id: sourceId,
        name: displayName,
        mimetype: isYT ? 'video/youtube' : 'text/html',
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString(),
      });

      triggerPreGeneration(req.notebookId);

      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
