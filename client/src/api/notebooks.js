'use strict';

import { handleResponse } from './client.js';

const BASE = '/api/notebooks';

export async function listNotebooks() {
  const res = await fetch(BASE);
  return handleResponse(res);
}

export async function createNotebook(name) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function deleteNotebook(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}
