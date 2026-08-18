import type {
  ChatResponse,
  ImportResult,
  ImportSource,
  Memorial,
  MemoryItem,
  SearchResult,
  TimelinePeriod,
} from "./api";
import {
  demoImportSources,
  demoItems,
  demoMemorial,
  demoStats,
  demoTimeline,
} from "./generated/demo-data";

let cache: {
  memorial: Memorial;
  items: MemoryItem[];
  timeline: TimelinePeriod[];
  stats: Record<string, number>;
  importSources: ImportSource[];
} | null = null;

async function loadDemo() {
  if (cache) return cache;

  cache = {
    memorial: demoMemorial,
    items: demoItems,
    timeline: demoTimeline,
    stats: demoStats,
    importSources: demoImportSources,
  };
  return cache;
}

function filterItems(
  items: MemoryItem[],
  params?: { source?: string; type?: string; limit?: number; offset?: number },
): SearchResult {
  let filtered = items;
  if (params?.source) filtered = filtered.filter((i) => i.source === params.source);
  if (params?.type) filtered = filtered.filter((i) => i.type === params.type);

  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 100;
  const slice = filtered.slice(offset, offset + limit);
  return { items: slice, total: filtered.length };
}

function onThisDay(items: MemoryItem[]): MemoryItem[] {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const pattern = `-${month}-${day}`;

  return items
    .filter((i) => i.occurredAt.includes(pattern))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

function searchItems(items: MemoryItem[], q: string): SearchResult {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = items.filter((item) => {
    const haystack = [item.title, item.text, item.source, item.type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
  return { items: matched, total: matched.length };
}

export const demoApi = {
  memorial: async () => (await loadDemo()).memorial,

  items: async (params?: { limit?: number; source?: string; type?: string; offset?: number }) => {
    const { items } = await loadDemo();
    return filterItems(items, params);
  },

  search: async (q: string, source?: string) => {
    const { items } = await loadDemo();
    const result = searchItems(items, q);
    if (!source) return result;
    const filtered = result.items.filter((i) => i.source === source);
    return { items: filtered, total: filtered.length };
  },

  timeline: async () => (await loadDemo()).timeline,

  today: async () => {
    const { items } = await loadDemo();
    return { date: new Date().toISOString().slice(0, 10), items: onThisDay(items) };
  },

  stats: async () => (await loadDemo()).stats,

  importSources: async () => (await loadDemo()).importSources,

  chat: async (): Promise<ChatResponse> => {
    throw new Error(
      "AI chat requires the local app. Clone the repo and run: npm run poc",
    );
  },

  import: async (): Promise<ImportResult> => {
    throw new Error(
      "File import requires the local app. Clone the repo and run: npm run poc",
    );
  },
};

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}
