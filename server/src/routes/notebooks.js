'use strict';

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as notebookStore from '../stores/notebookStore.js';
import { deleteVectorsForChunks } from '../stores/vectorStore.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(notebookStore.getAllNotebooks());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const notebook = notebookStore.createNotebook({
    id: uuidv4(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(notebook);
});

router.delete('/:id', (req, res) => {
  const chunks = notebookStore.getChunksForNotebook(req.params.id);
  const deleted = notebookStore.deleteNotebook(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'notebook not found' });
  }
  if (chunks.length) {
    deleteVectorsForChunks(chunks.map((c) => c.id));
  }
  res.json({ ok: true });
});

export default router;

