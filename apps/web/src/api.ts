export interface Memorial {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface MemoryItem {
  id: string;
  type: string;
  source: string;
  title?: string;
  text: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  items: MemoryItem[];
  total: number;
}

export interface TimelinePeriod {
  period: string;
  count: number;
}

export interface ChatResponse {
  content: string;
  citations: Array<{ itemId: string; excerpt: string }>;
}

export interface ImportSource {
  id: string;
  label: string;
  description: string;
  extensions: string[];
  exportSteps: string[];
  exportUrl?: string;
  tips?: string[];
}

export interface ImportResult {
  ok: boolean;
  filename: string;
  source: string;
  adapter: string;
  stored: number;
  duplicates: number;
  itemsImported: number;
  errors: string[];
  durationMs: number;
  progress: string[];
}

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
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
  today: () => get<{ date: string; items: MemoryItem[] }>("/today"),
  stats: () => get<Record<string, number>>("/stats"),
  chat: (question: string) => post<ChatResponse>("/chat", { question }),
  importSources: () => get<ImportSource[]>("/import/sources"),
  import: async (file: File, source: string): Promise<ImportResult> => {
    const form = new FormData();
    form.append("file", file);
    form.append("source", source);
    const res = await fetch(`${BASE}/import`, { method: "POST", body: form });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? res.statusText);
    }
    return res.json() as Promise<ImportResult>;
  },
};

export const SOURCE_LABELS: Record<string, string> = {
  meta_facebook: "Facebook",
  meta_instagram: "Instagram",
  meta_messenger: "Messenger",
  email: "Email",
  whatsapp: "WhatsApp",
  google_messages: "Google Messages",
  sms: "Android SMS",
  imessage: "iMessage",
  manual: "Archive",
  unknown: "Other",
};

export const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  message: "Message",
  email: "Email",
  photo: "Photo",
  video: "Video",
  note: "Note",
  story: "Story",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}
