import type {
  ChatResponse,
  ImportResult,
  ImportSource,
  Memorial,
  MemoryItem,
  SearchResult,
  TimelinePeriod,
} from "./api";

const demoRoot = `${import.meta.env.BASE_URL}demo/`;

let cache: {
  memorial: Memorial;
  items: MemoryItem[];
  timeline: TimelinePeriod[];
  stats: Record<string, number>;
  importSources: ImportSource[];
} | null = null;

async function loadDemo() {
  if (cache) return cache;

  const [memorial, itemsRes, timeline, stats, importSources] = await Promise.all([
    fetch(`${demoRoot}memorial.json`).then((r) => r.json() as Promise<Memorial>),
    fetch(`${demoRoot}items.json`).then((r) => r.json() as Promise<SearchResult>),
    fetch(`${demoRoot}timeline.json`).then((r) => r.json() as Promise<TimelinePeriod[]>),
    fetch(`${demoRoot}stats.json`).then((r) => r.json() as Promise<Record<string, number>>),
    fetch(`${demoRoot}import-sources.json`).then((r) => r.json() as Promise<ImportSource[]>),
  ]);

  cache = {
    memorial,
    items: itemsRes.items,
    timeline,
    stats,
    importSources,
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

  search: async (q: string) => {
    const { items } = await loadDemo();
    return searchItems(items, q);
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
