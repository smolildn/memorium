import { useCallback, useEffect, useState } from "react";

import {
  api,
  formatDate,
  isDemoMode,
  SOURCE_LABELS,
  TYPE_LABELS,
  type MemoryItem,
  type Memorial,
  type TimelinePeriod,
} from "./api";
import { ChatPanel } from "./components/ChatPanel";
import { ImportPanel } from "./components/ImportPanel";
import { MemoryCard } from "./components/MemoryCard";
import { StatsBar } from "./components/StatsBar";

type Tab = "timeline" | "today" | "import" | "ask";

export function App() {
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [todayItems, setTodayItems] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("timeline");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, i, t, td, s] = await Promise.all([
        api.memorial(),
        api.items({ limit: 200, source: sourceFilter || undefined }),
        api.timeline(),
        api.today(),
        api.stats(),
      ]);
      setMemorial(m);
      setItems(i.items);
      setTimeline(t);
      setTodayItems(td.items);
      setStats(s);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach Memorium API. Run: npm run poc",
      );
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      void load();
      return;
    }
    setLoading(true);
    try {
      const result = await api.search(query.trim());
      setItems(result.items);
      setTab("timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const displayItems = tab === "today" ? todayItems : items;

  const tabLabels: Record<Tab, string> = {
    timeline: "Timeline",
    today: "On This Day",
    import: "Import",
    ask: "Ask",
  };

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Memorium</p>
        {isDemoMode() && (
          <div className="demo-banner" role="status">
            Demo mode — browse sample data here. For import, AI, and your own vault,{" "}
            <a href="https://github.com/smolildn/memorium#quick-start-poc">run locally</a>.
          </div>
        )}
        <h1>{memorial?.name ?? "Memorial Archive"}</h1>
        <p className="subtitle">
          A private place to gather, search, and share a life&apos;s digital memories.
        </p>
        <StatsBar stats={stats} />
      </header>

      <nav className="tabs">
        {(["timeline", "today", "import", "ask"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "tab active" : "tab"}
            onClick={() => setTab(t)}
          >
            {tabLabels[t]}
          </button>
        ))}
      </nav>

      {tab !== "ask" && tab !== "import" && (
        <section className="toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search memories…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </section>
      )}

      {error && tab !== "import" && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <main className="main">
        {tab === "import" ? (
          <ImportPanel onImported={() => void load()} />
        ) : tab === "ask" ? (
          <ChatPanel subjectName={memorial?.name ?? "your loved one"} />
        ) : loading ? (
          <p className="loading">Loading memories…</p>
        ) : displayItems.length === 0 ? (
          <div className="empty">
            <h2>No memories yet</h2>
            <p>
              Go to the <button type="button" className="link-btn" onClick={() => setTab("import")}>Import</button> tab
              or run <code>npm run poc</code> for demo data.
            </p>
          </div>
        ) : (
          <div className="layout">
            <aside className="sidebar">
              <h3>Through the years</h3>
              <ul className="year-list">
                {timeline.map((p) => (
                  <li key={p.period}>
                    <span>{p.period}</span>
                    <span className="count">{p.count}</span>
                  </li>
                ))}
              </ul>
            </aside>
            <section className="feed">
              {tab === "today" && (
                <p className="today-label">
                  Memories on {formatDate(new Date().toISOString())}
                </p>
              )}
              {displayItems.map((item) => (
                <MemoryCard
                  key={item.id}
                  item={item}
                  sourceLabel={SOURCE_LABELS[item.source] ?? item.source}
                  typeLabel={TYPE_LABELS[item.type] ?? item.type}
                />
              ))}
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Local-first · Your data stays on your machine · Export anytime</p>
      </footer>
    </div>
  );
}
