'use strict';

interface Source {
  id: string;
}

interface CacheEntry {
  document: unknown;
  sourceHash: string;
  createdAt: number;
}

const cache = new Map<string, CacheEntry | boolean>();

function buildSourceHash(sources: Source[]): string {
  return sources
    .map((s) => s.id)
    .sort()
    .join('|');
}

export function getCachedDocument(notebookId: string, type: string): CacheEntry | null {
  const entry = cache.get(`${notebookId}:${type}`);
  if (!entry || typeof entry === 'boolean') return null;
  return entry;
}

export function setCachedDocument(
  notebookId: string,
  type: string,
  document: unknown,
  sources: Source[]
): void {
  const key = `${notebookId}:${type}`;
  cache.set(key, {
    document,
    sourceHash: buildSourceHash(sources),
    createdAt: Date.now(),
  });
}

export function isFresh(notebookId: string, type: string, currentSources: Source[]): boolean {
  const entry = cache.get(`${notebookId}:${type}`);
  if (!entry || typeof entry === 'boolean') return false;
  return entry.sourceHash === buildSourceHash(currentSources);
}

export function invalidate(notebookId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${notebookId}:`)) {
      cache.delete(key);
    }
  }
}

export function markGenerating(notebookId: string): void {
  const key = `${notebookId}:__generating`;
  cache.set(key, true);
}

export function clearGenerating(notebookId: string): void {
  cache.delete(`${notebookId}:__generating`);
}

export function isGenerating(notebookId: string): boolean {
  return cache.get(`${notebookId}:__generating`) === true;
}
