'use strict';

import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';
import * as notebookStore from '../stores/notebookStore.js';
import type { Source } from '../stores/notebookStore.js';
import { parseFile, chunkText, parseUrl, parseYoutubeUrl, isYoutubeUrl } from '../services/sourceService.js';
import type { TextChunk } from '../services/sourceService.js';
import { embedTexts, storeChunkEmbeddings } from '../services/retrievalService.js';
import { triggerPreGeneration } from '../services/preGenerationService.js';
import {
  requireNotebookId,
  requireNotebook,
  requireFile,
  requireUrl,
  type NotebookRequest,
} from '../middleware/validation.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

const TIMESTAMP_RE = /\s+\d{1,2}\.\d{2}\.\d{2}\s*[\u2018\u2019''\s]?\s*[AP]M(?=\.\w+$)/i;
function cleanFilename(name: string): string {
  return name.replace(TIMESTAMP_RE, '');
}

router.get('/', requireNotebookId, (req: NotebookRequest, res: Response) => {
  res.json(notebookStore.getSources(req.notebookId!));
});

function multerUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if ((err as multer.MulterError).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'File too large. Maximum size is 50 MB.' });
        return;
      }
      next(err);
      return;
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
  async (req: NotebookRequest, res: Response, next: NextFunction) => {
    try {
      const sourceId: string = uuidv4();
      const rawName: string = Buffer.from(req.file!.originalname, 'latin1').toString('utf-8');
      const displayName: string = cleanFilename(rawName);
      const text: string = await parseFile(req.file!.buffer, req.file!.mimetype, displayName);
      const chunks: TextChunk[] = chunkText(text, sourceId);

      logger.info(
        {
          sourceId,
          filename: displayName,
          chunkCount: chunks.length,
        },
        'parsed and chunked source'
      );

      notebookStore.addChunksToNotebook(req.notebookId!, chunks);

      const texts: string[] = chunks.map((c) => c.text);
      const embeddings: number[][] = await embedTexts(texts, 'document');
      storeChunkEmbeddings(chunks, embeddings);

      const source: Source | null = notebookStore.addSource(req.notebookId!, {
        id: sourceId,
        name: displayName,
        mimetype: req.file!.mimetype,
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString(),
      });

      triggerPreGeneration(req.notebookId!);

      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  }
);

interface UrlBody {
  url?: string;
}

router.post(
  '/url',
  requireNotebookId,
  requireNotebook,
  requireUrl,
  async (req: NotebookRequest & Request<unknown, unknown, UrlBody>, res: Response, next: NextFunction) => {
    try {
      const { url } = req.body;
      const sourceId: string = uuidv4();
      const isYT: boolean = isYoutubeUrl(url!);
      const displayName: string = isYT ? `YouTube: ${url}` : url!.replace(/^https?:\/\//, '').slice(0, 60);

      logger.info({ sourceId, url, isYT }, 'processing URL source');

      const text: string = isYT ? await parseYoutubeUrl(url!) : await parseUrl(url!);
      const chunks: TextChunk[] = chunkText(text, sourceId);

      if (chunks.length === 0) {
        res.status(422).json({ error: 'No usable text could be extracted from the URL' });
        return;
      }

      notebookStore.addChunksToNotebook(req.notebookId!, chunks);

      const texts: string[] = chunks.map((c) => c.text);
      const embeddings: number[][] = await embedTexts(texts, 'document');
      storeChunkEmbeddings(chunks, embeddings);

      const source: Source | null = notebookStore.addSource(req.notebookId!, {
        id: sourceId,
        name: displayName,
        mimetype: isYT ? 'video/youtube' : 'text/html',
        chunkCount: chunks.length,
        uploadedAt: new Date().toISOString(),
      });

      triggerPreGeneration(req.notebookId!);

      res.status(201).json(source);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
