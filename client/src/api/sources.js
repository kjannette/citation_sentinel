'use strict';

import { handleResponse } from './client.js';

const BASE = '/api/sources';

export async function listSources(notebookId) {
  const res = await fetch(`${BASE}?notebookId=${notebookId}`);
  return handleResponse(res);
}

export async function uploadSource(notebookId, file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('notebookId', notebookId);
  const res = await fetch(BASE, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function addUrlSource(notebookId, url) {
  const res = await fetch(`${BASE}/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notebookId, url }),
  });
  return handleResponse(res);
}
