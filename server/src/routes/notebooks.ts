'use strict';

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as notebookStore from '../stores/notebookStore.js';
import { deleteVectorsForChunks } from '../stores/vectorStore.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json(notebookStore.getAllNotebooks());
});

interface CreateNotebookBody {
  name?: string;
}

router.post('/', (req: Request<unknown, unknown, CreateNotebookBody>, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const notebook = notebookStore.createNotebook({
    id: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(notebook);
});

interface DeleteParams {
  id: string;
}

router.delete('/:id', (req: Request<DeleteParams>, res: Response) => {
  const chunks = notebookStore.getChunksForNotebook(req.params.id);
  const deleted = notebookStore.deleteNotebook(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'notebook not found' });
    return;
  }
  if (chunks.length) {
    deleteVectorsForChunks(chunks.map((c) => c.id));
  }
  res.json({ ok: true });
});

export default router;
