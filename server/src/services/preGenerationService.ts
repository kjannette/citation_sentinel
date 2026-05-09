'use strict';

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
} from './documentService.js';

const MIN_SOURCES = 2;

type DocumentType = 'study-guide' | 'faq' | 'executive-brief';
type GeneratorFn = (sourceGroups: SourceGroup[]) => Promise<StudyGuide | Faq | ExecutiveBrief>;

const GENERATORS: Record<DocumentType, GeneratorFn> = {
  'study-guide': generateStudyGuide,
  'faq': generateFaq,
  'executive-brief': generateExecutiveBrief,
};

const DEBOUNCE_MS = 5000;

const pendingReGen = new Set<string>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function triggerPreGeneration(notebookId: string): void {
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

  const existingTimer = debounceTimers.get(notebookId);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
  }
  debounceTimers.set(
    notebookId,
    setTimeout(() => {
      debounceTimers.delete(notebookId);
      runPreGeneration(notebookId);
    }, DEBOUNCE_MS)
  );
  logger.debug({ notebookId, debounceMs: DEBOUNCE_MS }, 'pre-generation debounced');
}

function runPreGeneration(notebookId: string): void {
  try {
    const sources = notebookStore.getSources(notebookId);
    const chunks = notebookStore.getChunksForNotebook(notebookId);
    const sourceGroups = notebookStore.buildSourceGroups(notebookId, chunks) as SourceGroup[];

    documentCacheStore.invalidate(notebookId);
    documentCacheStore.markGenerating(notebookId);

    logger.info(
      { notebookId, sourceCount: sources.length, chunkCount: chunks.length },
      'background pre-generation started'
    );

    const jobs = (Object.entries(GENERATORS) as Array<[DocumentType, GeneratorFn]>).map(
      async ([type, generator]) => {
        try {
          const document = await generator(sourceGroups);
          documentCacheStore.setCachedDocument(notebookId, type, document, sources);
          logger.info({ notebookId, type }, 'background pre-generation complete for type');
        } catch (err) {
          const error = err as Error;
          logger.error({ notebookId, type, err: error.message }, 'background pre-generation failed for type');
        }
      }
    );

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
    const error = err as Error;
    logger.error({ notebookId, err: error.message }, 'pre-generation setup failed');
    documentCacheStore.clearGenerating(notebookId);
  }
}
