import type { AIProvider, ChatMessage, ChatResponse, MemoryItem } from "@memorium/core";

import { extractCitations } from "../context.js";

export interface OllamaConfig {
  baseUrl?: string;
  embeddingModel?: string;
  chatModel?: string;
}

/**
 * Ollama-backed provider for fully local AI (no cloud).
 * Requires Ollama running: https://ollama.com
 */
export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private embeddingModel: string;
  private chatModel: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = (config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
    this.embeddingModel = config.embeddingModel ?? process.env.MEMORIUM_EMBEDDING_MODEL ?? "nomic-embed-text";
    this.chatModel = config.chatModel ?? process.env.MEMORIUM_CHAT_MODEL ?? "llama3.2";
  }

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.embeddingModel, prompt: text }),
      });
      if (!response.ok) {
        throw new Error(`Ollama embeddings failed: ${response.status} ${await response.text()}`);
      }
      const data = (await response.json()) as { embedding: number[] };
      vectors.push(data.embedding);
    }
    return vectors;
  }

  async chat(messages: ChatMessage[], context: MemoryItem[]): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.chatModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: { temperature: 0.4 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    const content = data.message.content ?? "";
    return {
      content,
      citations: extractCitations(content, context),
    };
  }
}

export function createOllamaProviderFromEnv(): OllamaProvider | null {
  if (process.env.MEMORIUM_AI_PROVIDER !== "ollama") return null;
  return new OllamaProvider();
}
