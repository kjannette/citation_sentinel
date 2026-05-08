'use strict';

const vectors = new Map();

export function storeVector(chunkId, embedding) {
  vectors.set(chunkId, new Float32Array(embedding));
}

export function getVector(chunkId) {
  return vectors.get(chunkId) || null;
}

export function getAllVectors() {
  return vectors;
}

export function deleteVectorsForChunks(chunkIds) {
  for (const id of chunkIds) {
    vectors.delete(id);
  }
}
