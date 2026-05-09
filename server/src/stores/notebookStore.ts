'use strict';

export interface TextChunk {
  id: string;
  text: string;
  sourceId: string;
  index: number;
}

export interface Source {
  id: string;
  name: string;
  mimetype?: string;
  chunkCount?: number;
  uploadedAt?: string;
}

export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  sources: Source[];
  chunks: TextChunk[];
}

export interface NotebookMeta {
  id: string;
  name: string;
  createdAt: string;
}

export interface SourceGroup {
  docIndex: number;
  sourceId: string;
  name: string;
  chunks: TextChunk[];
}

export class NotebookStore {
  private notebooks = new Map<string, Notebook>();

  getAllNotebooks(): NotebookMeta[] {
    return Array.from(this.notebooks.values()).map(({ id, name, createdAt }) => ({
      id,
      name,
      createdAt,
    }));
  }

  getNotebook(id: string): Notebook | null {
    return this.notebooks.get(id) || null;
  }

  createNotebook(notebook: { id: string; name: string; createdAt: string }): NotebookMeta {
    const record: Notebook = { ...notebook, sources: [], chunks: [] };
    this.notebooks.set(record.id, record);
    return { id: record.id, name: record.name, createdAt: record.createdAt };
  }

  deleteNotebook(id: string): boolean {
    return this.notebooks.delete(id);
  }

  addSource(notebookId: string, source: Source): Source | null {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return null;
    notebook.sources.push(source);
    return source;
  }

  getSources(notebookId: string): Source[] {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return [];
    return notebook.sources;
  }

  addChunksToNotebook(notebookId: string, chunks: TextChunk[]): Notebook | null {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return null;
    notebook.chunks = notebook.chunks.concat(chunks);
    return notebook;
  }

  getChunksForNotebook(notebookId: string): TextChunk[] {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return [];
    return notebook.chunks;
  }

  buildSourceGroups(notebookId: string, chunks: TextChunk[]): SourceGroup[] {
    const sources = this.getSources(notebookId);
    const sourceIndexMap = new Map<string, number>();
    sources.forEach((src, i) => {
      sourceIndexMap.set(src.id, i + 1);
    });

    const groupMap = new Map<string, SourceGroup>();
    for (const chunk of chunks) {
      const docIndex = sourceIndexMap.get(chunk.sourceId) || 0;
      if (!groupMap.has(chunk.sourceId)) {
        const src = sources.find((s) => s.id === chunk.sourceId);
        groupMap.set(chunk.sourceId, {
          docIndex,
          sourceId: chunk.sourceId,
          name: src?.name || 'Unknown',
          chunks: [],
        });
      }
      groupMap.get(chunk.sourceId)!.chunks.push(chunk);
    }

    return Array.from(groupMap.values()).sort((a, b) => a.docIndex - b.docIndex);
  }
}

const defaultStore = new NotebookStore();

export const getAllNotebooks = defaultStore.getAllNotebooks.bind(defaultStore);
export const getNotebook = defaultStore.getNotebook.bind(defaultStore);
export const createNotebook = defaultStore.createNotebook.bind(defaultStore);
export const deleteNotebook = defaultStore.deleteNotebook.bind(defaultStore);
export const addSource = defaultStore.addSource.bind(defaultStore);
export const getSources = defaultStore.getSources.bind(defaultStore);
export const addChunksToNotebook = defaultStore.addChunksToNotebook.bind(defaultStore);
export const getChunksForNotebook = defaultStore.getChunksForNotebook.bind(defaultStore);
export const buildSourceGroups = defaultStore.buildSourceGroups.bind(defaultStore);
