/**
 * Worker snapshot codec — shared by scripts/import.ts (writer) and lib/data.ts
 * (reader) so the format has one source of truth.
 *
 * Firestore bills one read per document, so the dashboard reads the whole
 * worker list from a handful of rounds/{id}/snapshot/workers_N docs instead of
 * one doc per worker. Each doc holds `{ json: "<JSON array of workers>" }`,
 * packed by byte size to stay well under Firestore's 1 MiB document limit.
 */
import type { Worker } from "./types";

/** Max JSON bytes per snapshot doc (Firestore hard limit is 1 MiB incl. overhead). */
export const SNAPSHOT_MAX_BYTES = 700_000;

const byteLen = (s: string) => Buffer.byteLength(s, "utf8");

/** Split workers into JSON-array strings, each ≤ maxBytes (a single oversized worker gets its own chunk). */
export function snapshotChunks(workers: Worker[], maxBytes = SNAPSHOT_MAX_BYTES): string[] {
  const chunks: string[] = [];
  let parts: string[] = [];
  let size = 2; // "[]"
  for (const w of workers) {
    const s = JSON.stringify(w);
    const add = byteLen(s) + (parts.length ? 1 : 0); // + comma
    if (parts.length && size + add > maxBytes) {
      chunks.push(`[${parts.join(",")}]`);
      parts = [];
      size = 2;
    }
    size += byteLen(s) + (parts.length ? 1 : 0);
    parts.push(s);
  }
  if (parts.length) chunks.push(`[${parts.join(",")}]`);
  return chunks;
}

/** Inverse of snapshotChunks: chunk docs (in index order) → one worker list. */
export function workersFromChunks(jsonChunks: string[]): Worker[] {
  return jsonChunks.flatMap((j) => JSON.parse(j) as Worker[]);
}
