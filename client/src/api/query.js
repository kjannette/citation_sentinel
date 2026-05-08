'use strict';

import { handleResponse } from './client.js';

const BASE = '/api/query';
const CITATION_DETAIL_BASE = '/api/citation-detail';

export async function sendQuery(notebookId, question, onCitationDetails) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notebookId, question }),
  });
  const data = await handleResponse(res);

  if (data.citations?.length && onCitationDetails) {
    Promise.all(
      data.citations.map((c) =>
        fetch(CITATION_DETAIL_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chunkTexts: c.chunkTexts,
            sourceName: c.name,
            answer: data.answer,
            citationIndex: c.sourceIndex,
          }),
        })
          .then((r) => handleResponse(r))
          .then((detail) => ({ sourceIndex: c.sourceIndex, ...detail }))
      )
    ).then(onCitationDetails);
  }

  return data;
}
