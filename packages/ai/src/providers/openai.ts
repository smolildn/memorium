import type { AIProvider, ChatMessage, ChatResponse, MemoryItem } from "@memorium/core";

import { buildMemorialContext, extractCitations } from "../context.js";

export interface OpenAIConfig {
  apiKey: string;
  embeddingModel?: string;
  chatModel?: string;
}

/**
 * OpenAI-backed AI provider for embeddings and memorial chat.
 * Swap for OllamaProvider or LocalProvider in the future.
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private embeddingModel: string;
  private chatModel: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.embeddingModel = config.embeddingModel ?? "text-embedding-3-small";
    this.chatModel = config.chatModel ?? "gpt-4o-mini";
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };

    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  async chat(messages: ChatMessage[], context: MemoryItem[]): Promise<ChatResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.chatModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI chat failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message.content ?? "";
    return {
      content,
      citations: extractCitations(content, context),
    };
  }
}

export function createProviderFromEnv(): OpenAIProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAIProvider({
    apiKey,
    embeddingModel: process.env.MEMORIUM_EMBEDDING_MODEL,
    chatModel: process.env.MEMORIUM_CHAT_MODEL,
  });
}
