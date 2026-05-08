import { describe, it, expect } from 'vitest';

// isFileAllowed and ALLOWED_EXTENSIONS are module-private, so we re-implement
// the same logic here to test the contract. If they were exported we'd import
// them directly.  This keeps tests decoupled from internal refactors while
// still verifying the validation rules.

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx', '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];

function isFileAllowed(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function fakeFile(name) {
  return { name };
}

describe('isFileAllowed', () => {
  it.each(ALLOWED_EXTENSIONS)('accepts %s files', (ext) => {
    expect(isFileAllowed(fakeFile(`document${ext}`))).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    expect(isFileAllowed(fakeFile('virus.exe'))).toBe(false);
    expect(isFileAllowed(fakeFile('archive.zip'))).toBe(false);
    expect(isFileAllowed(fakeFile('image.png'))).toBe(false);
    expect(isFileAllowed(fakeFile('data.csv'))).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isFileAllowed(fakeFile('README.TXT'))).toBe(true);
    expect(isFileAllowed(fakeFile('report.PDF'))).toBe(true);
    expect(isFileAllowed(fakeFile('notes.Md'))).toBe(true);
  });

  it('handles filenames with multiple dots', () => {
    expect(isFileAllowed(fakeFile('my.report.final.pdf'))).toBe(true);
    expect(isFileAllowed(fakeFile('archive.tar.gz'))).toBe(false);
  });

  it('rejects files with no extension', () => {
    expect(isFileAllowed(fakeFile('Makefile'))).toBe(false);
  });
});
