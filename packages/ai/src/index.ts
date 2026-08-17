import type { AIProvider, ChatMessage, ChatResponse, MemoryItem } from "@memorium/core";

export { OpenAIProvider, createProviderFromEnv } from "./providers/openai.js";
export { MemorialChat } from "./chat.js";
export { indexVault, semanticSearch } from "./indexer.js";
export { buildMemorialContext, buildChatMessages, extractCitations } from "./context.js";

export interface AIConfig {
  provider: AIProvider;
  embeddingModel: string;
  chatModel: string;
}

/** Chunk text for embedding */
export function chunkText(text: string, maxChars = 500): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

export interface EmbedStore {
  storeEmbedding(
    itemId: string,
    model: string,
    vector: Float32Array,
    chunkIndex: number,
    chunkText: string,
  ): void;
}

export function vectorToBlob(vector: number[]): Buffer {
  const arr = new Float32Array(vector);
  return Buffer.from(arr.buffer);
}

export function blobToVector(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createEmbedStore(vault: import("@memorium/storage").Vault): EmbedStore {
  const db = vault.getDb();

  return {
    storeEmbedding(itemId, model, vector, chunkIndex, chunkText) {
      db.prepare(
        `INSERT OR REPLACE INTO embeddings (item_id, model, vector, chunk_index, chunk_text)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        itemId,
        model,
        vectorToBlob(Array.from(vector)),
        chunkIndex,
        chunkText,
      );
    },
  };
}
