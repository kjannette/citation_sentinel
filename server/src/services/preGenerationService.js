'use strict';

import logger from '../logger.js';
import * as notebookStore from '../stores/notebookStore.js';
import * as documentCacheStore from '../stores/documentCacheStore.js';
import {
  generateStudyGuide,
  generateFaq,
  generateExecutiveBrief,
} from './documentService.js';

const MIN_SOURCES = 2;

const GENERATORS = {
  'study-guide': generateStudyGuide,
  'faq': generateFaq,
  'executive-brief': generateExecutiveBrief,
};

const DEBOUNCE_MS = 5000;

const pendingReGen = new Set();
const debounceTimers = new Map();

export function triggerPreGeneration(notebookId) {
  const notebook = notebookStore.getNotebook(notebookId);
  if (!notebook) return;

  const sources = notebookStore.getSources(notebookId);
  if (sources.length < MIN_SOURCES) return;

  if (documentCacheStore.isGenerating(notebookId)) {
    pendingReGen.add(notebookId);
    documentCacheStore.invalidate(notebookId);
    logger.debug({ notebookId }, 'pre-generation in progress, queued re-generation');
    return;
  }

  clearTimeout(debounceTimers.get(notebookId));
  debounceTimers.set(
    notebookId,
    setTimeout(() => {
      debounceTimers.delete(notebookId);
      runPreGeneration(notebookId);
    }, DEBOUNCE_MS),
  );
  logger.debug({ notebookId, debounceMs: DEBOUNCE_MS }, 'pre-generation debounced');
}

function runPreGeneration(notebookId) {
  try {
    const sources = notebookStore.getSources(notebookId);
    const chunks = notebookStore.getChunksForNotebook(notebookId);
    const sourceGroups = notebookStore.buildSourceGroups(notebookId, chunks);

    documentCacheStore.invalidate(notebookId);
    documentCacheStore.markGenerating(notebookId);

    logger.info(
      { notebookId, sourceCount: sources.length, chunkCount: chunks.length },
      'background pre-generation started',
    );

    const jobs = Object.entries(GENERATORS).map(async ([type, generator]) => {
      try {
        const document = await generator(sourceGroups);
        documentCacheStore.setCachedDocument(notebookId, type, document, sources);
        logger.info({ notebookId, type }, 'background pre-generation complete for type');
      } catch (err) {
        logger.error({ notebookId, type, err: err.message }, 'background pre-generation failed for type');
      }
    });

    Promise.all(jobs)
      .then(() => {
        logger.info({ notebookId }, 'all background pre-generation complete');
      })
      .finally(() => {
        documentCacheStore.clearGenerating(notebookId);

        if (pendingReGen.has(notebookId)) {
          pendingReGen.delete(notebookId);
          logger.info({ notebookId }, 're-triggering pre-generation for updated sources');
          runPreGeneration(notebookId);
        }
      });
  } catch (err) {
    logger.error({ notebookId, err: err.message }, 'pre-generation setup failed');
    documentCacheStore.clearGenerating(notebookId);
  }
}
