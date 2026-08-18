import { useCallback, useEffect, useMemo, useState } from "react";

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
import { AiConsentModal } from "./components/AiConsentModal";
import { ChatPanel } from "./components/ChatPanel";
import { CollectionsView } from "./components/CollectionsView";
import { ImportPanel } from "./components/ImportPanel";
import { Lightbox } from "./components/Lightbox";
import { MemoryCard } from "./components/MemoryCard";
import { MobileNav } from "./components/MobileNav";
import { OnboardingModal } from "./components/OnboardingModal";
import { OnThisDayView } from "./components/OnThisDayView";
import { PersonHero } from "./components/PersonHero";
import { PlatformChrome, PlatformFeed } from "./components/PlatformFeed";
import { SlideshowModal } from "./components/SlideshowModal";
import { StatsBar } from "./components/StatsBar";
import { useLocalFlag } from "./hooks/useLocalFlag";
import { getSourceTheme, SOURCE_THEMES } from "./sourceThemes";
import { extractPeople, randomMemory } from "./utils/memorial";

type Tab = "today" | "timeline" | "collections" | "import" | "ask";

export function App() {
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [allItems, setAllItems] = useState<MemoryItem[]>([]);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [todayItems, setTodayItems] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("today");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [collectionId, setCollectionId] = useState("kitchen");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowStart, setSlideshowStart] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [onboardingDone, markOnboardingDone] = useLocalFlag("memorium-onboarding-v1");
  const [aiConsent, markAiConsent] = useLocalFlag("memorium-ai-consent-v1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, i, t, td, s] = await Promise.all([
        api.memorial(),
        api.items({ limit: 500 }),
        api.timeline(),
        api.today(),
        api.stats(),
      ]);
      setMemorial(m);
      setAllItems(i.items);
      setTimeline(t);
      setTodayItems(td.items);
      setStats(s);
      setSearchResults(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach Memorium API. Run: npm run poc",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
    setQuery("");
    setSearchResults(null);
    if (source && tab === "today") setTab("timeline");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    try {
      const result = await api.search(query.trim(), sourceFilter || undefined);
      setSearchResults(result.items);
      setTab("timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const baseItems = useMemo(() => {
    if (searchResults !== null) return searchResults;
    return tab === "today" ? todayItems : allItems;
  }, [searchResults, tab, todayItems, allItems]);

  const displayItems = useMemo(() => {
    let list = baseItems;
    if (sourceFilter) list = list.filter((i) => i.source === sourceFilter);
    if (personFilter) {
      list = list.filter(
        (i) => typeof i.metadata.sender === "string" && i.metadata.sender === personFilter,
      );
    }
    return list;
  }, [baseItems, sourceFilter, personFilter]);

  const people = useMemo(() => extractPeople(allItems), [allItems]);
  const subjectName = memorial?.name ?? "Rose Martinez";
  const activeTheme = sourceFilter ? getSourceTheme(sourceFilter) : null;
  const usePlatformView =
    activeTheme !== null &&
    activeTheme.layout !== "default" &&
    tab === "timeline" &&
    searchResults === null;

  const scrollToMemory = (itemId: string) => {
    setTab("timeline");
    setSourceFilter("");
    setSearchResults(null);
    setTimeout(() => {
      document.getElementById(`memory-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleSurprise = () => {
    const pick = randomMemory(allItems);
    if (pick) scrollToMemory(pick.id);
  };

  const handleSlideshow = (startId?: string) => {
    const idx = startId ? allItems.findIndex((i) => i.id === startId) : 0;
    setSlideshowStart(Math.max(idx, 0));
    setSlideshowOpen(true);
  };

  const todayLabel = formatDate(new Date().toISOString());

  const tabLabels: Record<Tab, string> = {
    today: "On This Day",
    timeline: "Browse",
    collections: "Themes",
    import: "Import",
    ask: "Ask",
  };

  return (
    <div className="app">
      {!onboardingDone && <OnboardingModal onComplete={markOnboardingDone} />}
      {showAiConsent && !aiConsent && (
        <AiConsentModal
          onAccept={() => {
            markAiConsent();
            setShowAiConsent(false);
          }}
          onDecline={() => setShowAiConsent(false)}
        />
      )}
      {slideshowOpen && (
        <SlideshowModal
          items={allItems}
          subjectName={subjectName}
          startIndex={slideshowStart}
          onClose={() => setSlideshowOpen(false)}
        />
      )}
      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}

      {memorial && (
        <PersonHero
          memorial={memorial}
          allItems={allItems}
          stats={stats}
          onSurprise={handleSurprise}
          onSlideshow={() => handleSlideshow()}
        />
      )}

      {isDemoMode() && (
        <div className="demo-banner wrap" role="status">
          Demo mode — browse sample data here. For import, AI, and your own vault,{" "}
          <a href="https://github.com/smolildn/memorium#quick-start-poc">run locally</a>.
        </div>
      )}

      <StatsBar stats={stats} activeSource={sourceFilter} onSourceChange={handleSourceChange} />

      <nav className="tabs desktop-tabs">
        {(["today", "timeline", "collections", "import", "ask"] as Tab[]).map((t) => (
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

      {tab !== "ask" && tab !== "import" && tab !== "collections" && (
        <section className="toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder={sourceFilter ? `Search in ${SOURCE_LABELS[sourceFilter] ?? "source"}…` : "Search memories…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <select
            value={sourceFilter}
            onChange={(e) => handleSourceChange(e.target.value)}
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
                {SOURCE_THEMES[k]?.layout !== "default" ? " — platform view" : ""}
              </option>
            ))}
          </select>
          {people.length > 0 && (
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              aria-label="Filter by person"
            >
              <option value="">All people</option>
              {people.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
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
          <ChatPanel
            subjectName={subjectName}
            hasConsent={aiConsent}
            onNeedConsent={() => setShowAiConsent(true)}
            onCitationClick={scrollToMemory}
          />
        ) : tab === "collections" ? (
          <CollectionsView
            allItems={allItems}
            activeCollection={collectionId}
            onCollectionChange={setCollectionId}
          />
        ) : loading ? (
          <p className="loading">Loading memories…</p>
        ) : tab === "today" ? (
          <OnThisDayView
            items={sourceFilter ? displayItems : todayItems}
            dateLabel={todayLabel}
          />
        ) : displayItems.length === 0 ? (
          <div className="empty">
            <h2>No memories yet</h2>
            <p>
              Go to the <button type="button" className="link-btn" onClick={() => setTab("import")}>Import</button> tab
              or run <code>npm run poc</code> for demo data.
            </p>
          </div>
        ) : (
          <div className={`layout ${usePlatformView ? "layout--platform" : ""}`}>
            {!usePlatformView && (
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
            )}
            <section className="feed">
              {searchResults !== null && (
                <p className="search-results-label">
                  {displayItems.length} result{displayItems.length === 1 ? "" : "s"} for “{query}”
                  {sourceFilter && ` in ${SOURCE_LABELS[sourceFilter]}`}
                  <button type="button" className="link-btn" onClick={() => { setSearchResults(null); setQuery(""); }}>
                    Clear
                  </button>
                </p>
              )}
              {usePlatformView && activeTheme && (
                <>
                  <p className="platform-view-label">
                    Viewing as <strong>{activeTheme.label}</strong> · scroll to explore all memories
                  </p>
                  <div className={`platform-shell ${activeTheme.themeClass}`}>
                    <PlatformChrome theme={activeTheme} subjectName={subjectName} />
                    <div className="platform-scroll">
                      <PlatformFeed
                        items={displayItems}
                        theme={activeTheme}
                        subjectName={subjectName}
                      />
                    </div>
                  </div>
                </>
              )}
              {!usePlatformView &&
                displayItems.map((item) => (
                  <div key={item.id} id={`memory-${item.id}`} className="memory-anchor fade-in">
                    <MemoryCard
                      item={item}
                      sourceLabel={SOURCE_LABELS[item.source] ?? item.source}
                      typeLabel={TYPE_LABELS[item.type] ?? item.type}
                      onImageClick={(src, alt) => setLightbox({ src, alt })}
                    />
                  </div>
                ))}
            </section>
          </div>
        )}
      </main>

      <MobileNav tab={tab} onTabChange={setTab} />

      <footer className="footer">
        <p>Local-first · Your data stays on your machine · Export anytime</p>
      </footer>
    </div>
  );
}
