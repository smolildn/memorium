import type { AIProvider } from "@memorium/core";

import { createOllamaProviderFromEnv } from "./ollama.js";
import { createProviderFromEnv as createOpenAIProviderFromEnv } from "./openai.js";

/** Resolve AI provider: Ollama (local) when MEMORIUM_AI_PROVIDER=ollama, else OpenAI */
export function resolveProviderFromEnv(): AIProvider | null {
  const ollama = createOllamaProviderFromEnv();
  if (ollama) return ollama;
  return createOpenAIProviderFromEnv();
}
