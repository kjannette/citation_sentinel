'use strict';

const cache = new Map();

function buildSourceHash(sources) {
  return sources
    .map((s) => s.id)
    .sort()
    .join('|');
}

export function getCachedDocument(notebookId, type) {
  const entry = cache.get(`${notebookId}:${type}`);
  if (!entry) return null;
  return entry;
}

export function setCachedDocument(notebookId, type, document, sources) {
  const key = `${notebookId}:${type}`;
  cache.set(key, {
    document,
    sourceHash: buildSourceHash(sources),
    createdAt: Date.now(),
  });
}

export function isFresh(notebookId, type, currentSources) {
  const entry = cache.get(`${notebookId}:${type}`);
  if (!entry) return false;
  return entry.sourceHash === buildSourceHash(currentSources);
}

export function invalidate(notebookId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${notebookId}:`)) {
      cache.delete(key);
    }
  }
}

export function markGenerating(notebookId) {
  const key = `${notebookId}:__generating`;
  cache.set(key, true);
}

export function clearGenerating(notebookId) {
  cache.delete(`${notebookId}:__generating`);
}

export function isGenerating(notebookId) {
  return cache.get(`${notebookId}:__generating`) === true;
}
