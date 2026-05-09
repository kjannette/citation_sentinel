'use strict';

import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import logger from './logger.js';
import notebookRoutes from './routes/notebooks.js';
import sourceRoutes from './routes/sources.js';
import queryRoutes from './routes/query.js';
import citationDetailRoutes from './routes/citationDetail.js';
import documentRoutes from './routes/documents.js';

const PORT = process.env.PORT || 8080;

const REQUIRED_KEYS = ['ANTHROPIC_API_KEY', 'VOYAGE_API_KEY', 'OPENAI_API_KEY'];
for (const key of REQUIRED_KEYS) {
  if (!process.env[key]) {
    logger.warn(`${key} is not set — API calls that need it will fail`);
  }
}

const app = express();

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});

app.get('/.well-known/healthcheck', (_req: Request, res: Response) => {
  res.json({
    service: 'notebook-clone',
    status: 'ok',
    uptime: process.uptime(),
  });
});

app.use('/api/notebooks', notebookRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/citation-detail', citationDetailRoutes);
app.use('/api/documents', documentRoutes);

interface ErrorWithStatus extends Error {
  status?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, method: req.method, url: req.originalUrl });
  res.status(err.status || 500).json({
    error: err.message || 'internal server error',
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'server listening');
});

export default app;
