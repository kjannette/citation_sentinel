'use strict';

import * as notebookStore from '../stores/notebookStore.js';

/**
 * Ensures notebookId is present in req.body or req.query.
 * Normalises the value onto req.notebookId for downstream handlers.
 */
export function requireNotebookId(req, res, next) {
  const notebookId = req.body?.notebookId ?? req.query?.notebookId;
  if (!notebookId) {
    return res.status(400).json({ error: 'notebookId is required' });
  }
  req.notebookId = notebookId;
  next();
}

/**
 * Must run after requireNotebookId.
 * Loads the notebook from the store and attaches it as req.notebook.
 * Returns 404 if the notebook doesn't exist.
 */
export function requireNotebook(req, res, next) {
  const notebook = notebookStore.getNotebook(req.notebookId);
  if (!notebook) {
    return res.status(404).json({ error: 'notebook not found' });
  }
  req.notebook = notebook;
  next();
}

export function requireFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'file is required' });
  }
  next();
}

export function requireUrl(req, res, next) {
  if (!req.body?.url) {
    return res.status(400).json({ error: 'url is required' });
  }
  next();
}
