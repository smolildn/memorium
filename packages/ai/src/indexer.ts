import type { MemoryItem } from "@memorium/core";
import type { Vault } from "@memorium/storage";

import {
  blobToVector,
  chunkText,
  cosineSimilarity,
  createEmbedStore,
  type AIConfig,
} from "./index.js";

export async function indexVault(
  vault: Vault,
  config: AIConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ indexed: number; skipped: number }> {
  const db = vault.getDb();
  const rows = db
    .prepare("SELECT id, text, title FROM memory_items")
    .all() as Array<{ id: string; text: string; title: string | null }>;

  const store = createEmbedStore(vault);
  let indexed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const fullText = [row.title, row.text].filter(Boolean).join("\n");
    if (!fullText.trim()) {
      skipped++;
      continue;
    }

    const chunks = chunkText(fullText);
    const embeddings = await config.provider.embed(chunks);

    for (let j = 0; j < chunks.length; j++) {
      const vector = embeddings[j];
      if (!vector) continue;
      store.storeEmbedding(
        row.id,
        config.embeddingModel,
        new Float32Array(vector),
        j,
        chunks[j]!,
      );
    }

    indexed++;
    onProgress?.(i + 1, rows.length);
  }

  return { indexed, skipped };
}

export async function semanticSearch(
  vault: Vault,
  config: AIConfig,
  query: string,
  limit = 10,
): Promise<Array<{ item: MemoryItem; score: number; excerpt: string }>> {
  const [queryVector] = await config.provider.embed([query]);
  if (!queryVector) return [];

  const queryArr = new Float32Array(queryVector);
  const db = vault.getDb();

  const embeddings = db
    .prepare(
      `SELECT e.item_id, e.vector, e.chunk_text, m.*
       FROM embeddings e
       JOIN memory_items m ON m.id = e.item_id
       WHERE e.model = ?`,
    )
    .all(config.embeddingModel) as Array<{
      item_id: string;
      vector: Buffer;
      chunk_text: string;
      id: string;
      memorial_id: string;
      type: string;
      source: string;
      source_id: string | null;
      title: string | null;
      text: string;
      occurred_at: string;
      imported_at: string;
      person_ids: string;
      media_refs: string;
      metadata: string;
      content_hash: string;
    }>;

  const scored = embeddings.map((row) => ({
    item: {
      id: row.id,
      memorialId: row.memorial_id,
      type: row.type as MemoryItem["type"],
      source: row.source as MemoryItem["source"],
      sourceId: row.source_id ?? undefined,
      title: row.title ?? undefined,
      text: row.text,
      occurredAt: row.occurred_at,
      importedAt: row.imported_at,
      personIds: JSON.parse(row.person_ids) as string[],
      mediaRefs: JSON.parse(row.media_refs) as MemoryItem["mediaRefs"],
      metadata: JSON.parse(row.metadata) as Record<string, unknown>,
      contentHash: row.content_hash,
    },
    score: cosineSimilarity(queryArr, blobToVector(row.vector)),
    excerpt: row.chunk_text,
  }));

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: Array<{ item: MemoryItem; score: number; excerpt: string }> = [];

  for (const entry of scored) {
    if (seen.has(entry.item.id)) continue;
    seen.add(entry.item.id);
    results.push(entry);
    if (results.length >= limit) break;
  }

  return results;
}
