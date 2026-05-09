'use strict';

const vectors = new Map<string, Float32Array>();

export function storeVector(chunkId: string, embedding: number[]): void {
  vectors.set(chunkId, new Float32Array(embedding));
}

export function getVector(chunkId: string): Float32Array | null {
  return vectors.get(chunkId) || null;
}

export function getAllVectors(): Map<string, Float32Array> {
  return vectors;
}

export function deleteVectorsForChunks(chunkIds: string[]): void {
  for (const id of chunkIds) {
    vectors.delete(id);
  }
}
