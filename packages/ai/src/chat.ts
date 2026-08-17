import type { AIProvider, ChatMessage, ChatResponse, MemoryItem } from "@memorium/core";

import { buildChatMessages, extractCitations } from "./context.js";

export interface MemorialChatOptions {
  provider: AIProvider;
  subjectName: string;
}

/**
 * Reflective Q&A grounded in archive content.
 * Does NOT impersonate the deceased — helps family explore memories.
 */
export class MemorialChat {
  private provider: AIProvider;
  private subjectName: string;
  private history: ChatMessage[] = [];

  constructor(options: MemorialChatOptions) {
    this.provider = options.provider;
    this.subjectName = options.subjectName;
  }

  async ask(
    question: string,
    relevantItems: MemoryItem[],
  ): Promise<ChatResponse> {
    const messages = buildChatMessages(question, relevantItems, this.history);

    const response = await this.provider.chat(messages, relevantItems);

    this.history.push({ role: "user", content: question });
    this.history.push({ role: "assistant", content: response.content });

    return {
      content: response.content,
      citations: response.citations.length > 0
        ? response.citations
        : extractCitations(response.content, relevantItems),
    };
  }

  clearHistory(): void {
    this.history = [];
  }
}
