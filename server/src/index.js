'use strict';

import 'dotenv/config';
import express from 'express';
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

// CORS: wide-open for local dev. In production, lock this to specific origins.
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
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

app.get('/.well-known/healthcheck', (req, res) => {
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

app.use((err, req, res, _next) => {
  logger.error({ err, method: req.method, url: req.originalUrl });
  res.status(err.status || 500).json({
    error: err.message || 'internal server error',
  });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'server listening');
});

export default app;
