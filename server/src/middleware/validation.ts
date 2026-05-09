'use strict';

import type { Request, Response, NextFunction } from 'express';
import * as notebookStore from '../stores/notebookStore.js';
import type { Notebook } from '../stores/notebookStore.js';

export interface NotebookRequest extends Request {
  notebookId?: string;
  notebook?: Notebook;
}

export function requireNotebookId(req: NotebookRequest, res: Response, next: NextFunction): void {
  const notebookId = (req.body?.notebookId ?? req.query?.notebookId) as string | undefined;
  if (!notebookId) {
    res.status(400).json({ error: 'notebookId is required' });
    return;
  }
  req.notebookId = notebookId;
  next();
}

export function requireNotebook(req: NotebookRequest, res: Response, next: NextFunction): void {
  const notebook = notebookStore.getNotebook(req.notebookId!);
  if (!notebook) {
    res.status(404).json({ error: 'notebook not found' });
    return;
  }
  req.notebook = notebook;
  next();
}

export function requireFile(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  next();
}

export function requireUrl(req: Request, res: Response, next: NextFunction): void {
  if (!req.body?.url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  next();
}
