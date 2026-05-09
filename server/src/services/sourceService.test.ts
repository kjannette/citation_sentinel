import { describe, it, expect } from 'vitest';
import {
  chunkText,
  parseFile,
  isYoutubeUrl,
  extractVideoId,
  parseUrl,
  type TextChunk,
} from './sourceService.js';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const chunks: TextChunk[] = chunkText('Hello world.', 'src-1');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Hello world.');
    expect(chunks[0].sourceId).toBe('src-1');
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].id).toBeTruthy();
  });

  it('returns an empty array for empty text', () => {
    expect(chunkText('', 'src-1')).toEqual([]);
    expect(chunkText('   ', 'src-1')).toEqual([]);
  });

  it('splits long text into multiple chunks', () => {
    const text = 'A'.repeat(5000);
    const chunks = chunkText(text, 'src-2');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('assigns sequential indices', () => {
    const text = 'word '.repeat(2000);
    const chunks = chunkText(text, 'src-3');
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i);
    });
  });

  it('generates unique ids per chunk', () => {
    const text = 'word '.repeat(2000);
    const chunks = chunkText(text, 'src-4');
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
  });

  it('includes overlap between consecutive chunks', () => {
    const text = 'word '.repeat(2000);
    const chunks = chunkText(text, 'src-5');
    if (chunks.length >= 2) {
      const end0 = chunks[0].text.slice(-100);
      const hasOverlap = chunks[1].text.includes(end0.slice(-50));
      expect(hasOverlap).toBe(true);
    }
  });
});

describe('parseFile', () => {
  it('passes through plain text from a buffer', async () => {
    const buf = Buffer.from('Hello, plain text.');
    const result = await parseFile(buf, 'text/plain');
    expect(result).toBe('Hello, plain text.');
  });

  it('passes through markdown from a buffer', async () => {
    const buf = Buffer.from('# Heading\n\nSome markdown.');
    const result = await parseFile(buf, 'text/markdown');
    expect(result).toBe('# Heading\n\nSome markdown.');
  });
});

describe('isYoutubeUrl', () => {
  it('recognizes standard watch URLs', () => {
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('recognizes short youtu.be URLs', () => {
    expect(isYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('recognizes embed URLs', () => {
    expect(isYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects non-YouTube URLs', () => {
    expect(isYoutubeUrl('https://example.com/watch?v=abc')).toBe(false);
  });

  it('rejects URLs with wrong video ID length', () => {
    expect(isYoutubeUrl('https://youtube.com/watch?v=short')).toBe(false);
  });

  it('rejects plain text that is not a URL', () => {
    expect(isYoutubeUrl('not a url')).toBe(false);
  });
});

describe('extractVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID with extra query params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractVideoId('https://example.com/page')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('https://youtu.be/Ab-_cd12EfG')).toBe('Ab-_cd12EfG');
  });
});

describe('parseUrl – validation & SSRF prevention', () => {
  it('rejects non-URL strings', async () => {
    await expect(parseUrl('not a url')).rejects.toThrow('Invalid URL');
  });

  it('rejects ftp:// scheme', async () => {
    await expect(parseUrl('ftp://example.com/file.txt')).rejects.toThrow('Only http and https');
  });

  it('rejects file:// scheme', async () => {
    await expect(parseUrl('file:///etc/passwd')).rejects.toThrow('Only http and https');
  });

  it('rejects data: scheme', async () => {
    await expect(parseUrl('data:text/html,<h1>hi</h1>')).rejects.toThrow('Only http and https');
  });

  it('rejects localhost IP (127.0.0.1)', async () => {
    await expect(parseUrl('http://127.0.0.1/admin')).rejects.toThrow('private/internal');
  });

  it('rejects private 10.x range', async () => {
    await expect(parseUrl('http://10.0.0.1/secrets')).rejects.toThrow('private/internal');
  });

  it('rejects private 192.168.x range', async () => {
    await expect(parseUrl('http://192.168.1.1/')).rejects.toThrow('private/internal');
  });

  it('rejects link-local 169.254.x range', async () => {
    await expect(parseUrl('http://169.254.169.254/metadata')).rejects.toThrow('private/internal');
  });

  it('rejects 0.0.0.0', async () => {
    await expect(parseUrl('http://0.0.0.0/')).rejects.toThrow('private/internal');
  });
});
