import type {
  ChatResponse,
  ImportResult,
  ImportSource,
  Memorial,
  SearchResult,
  TimelinePeriod,
} from "./api";
import { demoApi, isDemoMode } from "./demo-api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const liveApi = {
  memorial: () => get<Memorial>("/memorial"),
  items: (params?: { limit?: number; source?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.source) q.set("source", params.source);
    if (params?.type) q.set("type", params.type);
    const qs = q.toString();
    return get<SearchResult>(`/items${qs ? `?${qs}` : ""}`);
  },
  search: (q: string) => get<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
  timeline: () => get<TimelinePeriod[]>("/timeline"),
  today: () => get<{ date: string; items: import("./api").MemoryItem[] }>("/today"),
  stats: () => get<Record<string, number>>("/stats"),
  chat: (question: string) => post<ChatResponse>("/chat", { question }),
  importSources: () => get<ImportSource[]>("/import/sources"),
  import: async (file: File, source: string): Promise<ImportResult> => {
    const form = new FormData();
    form.append("file", file);
    form.append("source", source);
    const res = await fetch(`${API_BASE}/import`, { method: "POST", body: form });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? res.statusText);
    }
    return res.json() as Promise<ImportResult>;
  },
};

/** Use static demo data on GitHub Pages; live API when running locally */
export const api = isDemoMode() ? demoApi : liveApi;

export { isDemoMode };
