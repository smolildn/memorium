import type { ChatMessage, ChatResponse, MemoryItem } from "@memorium/core";

const MEMORIAL_SYSTEM_PROMPT = `You are a reflective memorial assistant helping family members explore memories of a loved one.

RULES:
- Ground every response in the provided source material. Cite specific memories.
- Never impersonate the deceased or claim to be them.
- Be gentle, respectful, and honest about gaps in the archive.
- If asked something not covered by the sources, say so clearly.
- Include crisis resources (988 Suicide & Crisis Lifeline) if the user expresses acute grief distress.`;

export function buildMemorialContext(items: MemoryItem[]): string {
  return items
    .map((item) => {
      const date = item.occurredAt.slice(0, 10);
      const header = `[${date}] ${item.type}/${item.source}${item.title ? `: ${item.title}` : ""}`;
      const body = item.text.slice(0, 800);
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");
}

export function buildChatMessages(
  userMessage: string,
  contextItems: MemoryItem[],
  history: ChatMessage[] = [],
): ChatMessage[] {
  const context = buildMemorialContext(contextItems);

  return [
    { role: "system", content: MEMORIAL_SYSTEM_PROMPT },
    {
      role: "system",
      content: `Relevant memories from the archive:\n\n${context}`,
    },
    ...history,
    { role: "user", content: userMessage },
  ];
}

export function extractCitations(
  _response: string,
  items: MemoryItem[],
): ChatResponse["citations"] {
  return items.slice(0, 5).map((item) => ({
    itemId: item.id,
    excerpt: item.text.slice(0, 200) || item.title || "(media)",
  }));
}
