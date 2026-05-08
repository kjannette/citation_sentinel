'use strict';

export class NotebookStore {
  constructor() {
    this.notebooks = new Map();
  }

  getAllNotebooks() {
    return Array.from(this.notebooks.values()).map(({ chunks, ...meta }) => meta);
  }

  getNotebook(id) {
    return this.notebooks.get(id) || null;
  }

  createNotebook(notebook) {
    const record = { ...notebook, sources: [], chunks: [] };
    this.notebooks.set(record.id, record);
    return { id: record.id, name: record.name, createdAt: record.createdAt };
  }

  deleteNotebook(id) {
    return this.notebooks.delete(id);
  }

  addSource(notebookId, source) {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return null;
    notebook.sources.push(source);
    return source;
  }

  getSources(notebookId) {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return [];
    return notebook.sources;
  }

  addChunksToNotebook(notebookId, chunks) {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return null;
    notebook.chunks = notebook.chunks.concat(chunks);
    return notebook;
  }

  getChunksForNotebook(notebookId) {
    const notebook = this.notebooks.get(notebookId);
    if (!notebook) return [];
    return notebook.chunks;
  }

  buildSourceGroups(notebookId, chunks) {
    const sources = this.getSources(notebookId);
    const sourceIndexMap = new Map();
    sources.forEach((src, i) => {
      sourceIndexMap.set(src.id, i + 1);
    });

    const groupMap = new Map();
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
      groupMap.get(chunk.sourceId).chunks.push(chunk);
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
