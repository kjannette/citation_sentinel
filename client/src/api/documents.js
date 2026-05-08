'use strict';

import { handleResponse } from './client.js';

const BASE = '/api/documents';

export async function generateDocument(notebookId, type) {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notebookId, type }),
  });
  return handleResponse(res);
}
