import { describe, it, expect } from 'vitest';
import {
  getCachedDocument,
  setCachedDocument,
  isFresh,
  invalidate,
  markGenerating,
  isGenerating,
  clearGenerating,
} from './documentCacheStore.js';

describe('documentCacheStore', () => {

  describe('getCachedDocument / setCachedDocument', () => {
    it('returns null for an uncached entry', () => {
      expect(getCachedDocument('miss-1', 'faq')).toBeNull();
    });

    it('round-trips a cached document', () => {
      const doc = { title: 'Guide' };
      const sources = [{ id: 's1' }, { id: 's2' }];
      setCachedDocument('rt-1', 'study-guide', doc, sources);

      const entry = getCachedDocument('rt-1', 'study-guide');
      expect(entry.document).toEqual(doc);
      expect(entry.sourceHash).toBe('s1|s2');
      expect(entry.createdAt).toBeTypeOf('number');
    });

    it('overwrites an existing entry for the same key', () => {
      setCachedDocument('ow-1', 'faq', { v: 1 }, [{ id: 'a' }]);
      setCachedDocument('ow-1', 'faq', { v: 2 }, [{ id: 'b' }]);
      expect(getCachedDocument('ow-1', 'faq').document).toEqual({ v: 2 });
    });

    it('keeps entries for different types separate', () => {
      setCachedDocument('sep-1', 'faq', { kind: 'faq' }, [{ id: 'x' }]);
      setCachedDocument('sep-1', 'study-guide', { kind: 'sg' }, [{ id: 'x' }]);
      expect(getCachedDocument('sep-1', 'faq').document.kind).toBe('faq');
      expect(getCachedDocument('sep-1', 'study-guide').document.kind).toBe('sg');
    });
  });

  describe('isFresh', () => {
    it('returns false when nothing is cached', () => {
      expect(isFresh('fresh-miss', 'faq', [{ id: 'a' }])).toBe(false);
    });

    it('returns true when source IDs match regardless of order', () => {
      setCachedDocument('fresh-match', 'faq', {}, [{ id: 'b' }, { id: 'a' }]);
      expect(isFresh('fresh-match', 'faq', [{ id: 'a' }, { id: 'b' }])).toBe(true);
    });

    it('returns false when source IDs differ', () => {
      setCachedDocument('fresh-diff', 'faq', {}, [{ id: 'a' }]);
      expect(isFresh('fresh-diff', 'faq', [{ id: 'a' }, { id: 'b' }])).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('removes all entries for a notebook', () => {
      setCachedDocument('inv-1', 'faq', { a: 1 }, [{ id: 'x' }]);
      setCachedDocument('inv-1', 'study-guide', { b: 2 }, [{ id: 'x' }]);
      invalidate('inv-1');
      expect(getCachedDocument('inv-1', 'faq')).toBeNull();
      expect(getCachedDocument('inv-1', 'study-guide')).toBeNull();
    });

    it('does not affect other notebooks', () => {
      setCachedDocument('inv-a', 'faq', { a: 1 }, [{ id: 'x' }]);
      setCachedDocument('inv-b', 'faq', { b: 2 }, [{ id: 'x' }]);
      invalidate('inv-a');
      expect(getCachedDocument('inv-a', 'faq')).toBeNull();
      expect(getCachedDocument('inv-b', 'faq').document).toEqual({ b: 2 });
    });
  });

  describe('generating flag', () => {
    it('defaults to not generating', () => {
      expect(isGenerating('gen-default')).toBe(false);
    });

    it('can be set and cleared', () => {
      markGenerating('gen-cycle');
      expect(isGenerating('gen-cycle')).toBe(true);
      clearGenerating('gen-cycle');
      expect(isGenerating('gen-cycle')).toBe(false);
    });

    it('is cleared when the notebook is invalidated', () => {
      markGenerating('gen-inv');
      invalidate('gen-inv');
      expect(isGenerating('gen-inv')).toBe(false);
    });
  });
});
