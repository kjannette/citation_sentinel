'use strict';

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import logger from '../logger.js';

const execFileAsync = promisify(execFile);

const CHARS_PER_CHUNK = 2000;
const OVERLAP_CHARS = 200;

const AUDIO_MIMETYPES = new Set<string>([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
]);

export function isAudioMimetype(mimetype: string): boolean {
  return AUDIO_MIMETYPES.has(mimetype);
}

export async function parseFile(
  buffer: Buffer,
  mimetype: string,
  filename?: string
): Promise<string> {
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename?.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (isAudioMimetype(mimetype)) {
    return transcribeAudio(buffer, filename);
  }

  return buffer.toString('utf-8');
}

const WHISPER_MAX_BYTES = 25 * 1024 * 1024;

async function transcribeAudio(buffer: Buffer, filename?: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required for audio transcription');

  if (buffer.length > WHISPER_MAX_BYTES) {
    throw new Error('Audio file exceeds 25 MB Whisper API limit');
  }

  const client = new OpenAI({ apiKey: key });

  const ext = filename?.split('.').pop()?.toLowerCase() || 'mp3';
  const file = new File([new Uint8Array(buffer)], `audio.${ext}`, { type: `audio/${ext}` });

  logger.info({ filename, bytes: buffer.length }, 'transcribing audio with Whisper');

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
  });

  return response.text;
}

const BLOCKED_IP_RANGES: RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
];

function isBlockedIp(ip: string): boolean {
  return BLOCKED_IP_RANGES.some((re) => re.test(ip));
}

async function validateUrl(raw: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  const hostname = parsed.hostname;

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error('URLs pointing to private/internal networks are not allowed');
    }
  } else {
    const { address } = await dns.lookup(hostname);
    if (isBlockedIp(address)) {
      throw new Error('URLs pointing to private/internal networks are not allowed');
    }
  }

  return parsed.href;
}

export async function parseUrl(url: string): Promise<string> {
  const safeUrl = await validateUrl(url);
  logger.info({ url: safeUrl }, 'fetching URL content');

  const res = await fetch(safeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NotebookClone/1.0)',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  const body = await res.text();

  if (contentType.includes('text/plain')) {
    return body;
  }

  const $ = cheerio.load(body);
  $('script, style, nav, footer, header, iframe, noscript').remove();

  const article = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
  const text = article.text().replace(/\s+/g, ' ').trim();

  if (!text) {
    throw new Error('Could not extract meaningful text from URL');
  }

  return text;
}

const YT_URL_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

export function isYoutubeUrl(url: string): boolean {
  return YT_URL_RE.test(url);
}

export function extractVideoId(url: string): string | null {
  const match = url.match(YT_URL_RE);
  return match ? match[1] : null;
}

interface YouTubeSubtitleEvent {
  segs?: Array<{ utf8?: string }>;
}

interface YouTubeSubtitleData {
  events?: YouTubeSubtitleEvent[];
}

export async function parseYoutubeUrl(url: string): Promise<string> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Could not extract YouTube video ID from URL');
  }

  logger.info({ videoId }, 'fetching YouTube subtitles via yt-dlp');

  const tmpDir = mkdtempSync(join(tmpdir(), 'yt-'));
  try {
    const { stderr } = await execFileAsync(
      'yt-dlp',
      [
        '--skip-download',
        '--write-auto-sub',
        '--write-sub',
        '--sub-lang',
        'en',
        '--sub-format',
        'json3',
        '--no-warnings',
        '-o',
        join(tmpDir, '%(id)s'),
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 20000 }
    );

    if (stderr) {
      logger.warn({ videoId, stderr: stderr.slice(0, 500) }, 'yt-dlp stderr output');
    }

    const files = readdirSync(tmpDir);
    const subFile = files.find((f) => f.endsWith('.json3'));
    if (!subFile) {
      throw new Error('No English subtitles available for this YouTube video');
    }

    const data: YouTubeSubtitleData = JSON.parse(readFileSync(join(tmpDir, subFile), 'utf-8'));
    const events = (data.events || []).filter((e) => e.segs);
    const text = events
      .map((e) => e.segs!.map((s) => s.utf8 || '').join(''))
      .join(' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      throw new Error('Subtitles were empty');
    }

    logger.info({ videoId, textLength: text.length }, 'YouTube subtitles extracted');
    return text;
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { killed?: boolean; stderr?: string };
    if (error.code === 'ENOENT') {
      throw new Error('YouTube support requires yt-dlp to be installed (brew install yt-dlp)');
    }
    if (error.killed) {
      throw new Error('yt-dlp timed out fetching subtitles');
    }
    if (error.message?.startsWith('No English') || error.message?.startsWith('Subtitles')) {
      throw error;
    }
    const detail = error.stderr?.slice(0, 300) || error.message;
    throw new Error(`Failed to extract YouTube subtitles: ${detail}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export interface TextChunk {
  id: string;
  text: string;
  sourceId: string;
  index: number;
}

export function chunkText(text: string, sourceId: string): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + CHARS_PER_CHUNK, cleaned.length);
    let sliceEnd = end;

    if (end < cleaned.length) {
      const lastNewline = cleaned.lastIndexOf('\n', end);
      const lastPeriod = cleaned.lastIndexOf('. ', end);
      const breakAt = Math.max(lastNewline, lastPeriod);
      if (breakAt > start + CHARS_PER_CHUNK * 0.5) {
        sliceEnd = breakAt + 1;
      }
    }

    chunks.push({
      id: uuidv4(),
      text: cleaned.slice(start, sliceEnd),
      sourceId,
      index,
    });

    index++;
    if (sliceEnd >= cleaned.length) break;
    start = sliceEnd - OVERLAP_CHARS;
    if (start < 0) start = 0;
    if (start >= sliceEnd) break;
  }

  return chunks;
}
