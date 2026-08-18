import { useCallback, useEffect, useMemo, useState } from "react";

import {
  api,
  formatDate,
  isDemoMode,
  SOURCE_LABELS,
  TYPE_LABELS,
  type MemoryItem,
  type Memorial,
  type Person,
  type TimelinePeriod,
} from "./api";
import { AiConsentModal } from "./components/AiConsentModal";
import { AppNav } from "./components/AppNav";
import { BrowseSidebar } from "./components/BrowseSidebar";
import { ChatPanel } from "./components/ChatPanel";
import { CollectionsView } from "./components/CollectionsView";
import { ImportPanel } from "./components/ImportPanel";
import { InstagramPlatformView } from "./components/InstagramPlatformView";
import { Lightbox } from "./components/Lightbox";
import { MapView, extractMapPins } from "./components/MapView";
import { MemoryCard } from "./components/MemoryCard";
import { MobileNav } from "./components/MobileNav";
import { OnboardingModal } from "./components/OnboardingModal";
import { OnThisDayView } from "./components/OnThisDayView";
import { PersonHero } from "./components/PersonHero";
import { PhotosView } from "./components/PhotosView";
import { ProfileView } from "./components/ProfileView";
import { PlatformChrome, PlatformFeed } from "./components/PlatformFeed";
import { SlideshowModal } from "./components/SlideshowModal";
import { useLocalFlag } from "./hooks/useLocalFlag";
import { getSourceTheme } from "./sourceThemes";
import { extractPeople, randomMemory } from "./utils/memorial";
import { getItemFaces } from "./utils/photos";

type Tab = "today" | "timeline" | "photos" | "profile" | "collections" | "map" | "import" | "ask";

export function App() {
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [allItems, setAllItems] = useState<MemoryItem[]>([]);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [todayItems, setTodayItems] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>("today");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

      let p: Person[] = [];
      try {
        p = await api.people();
      } catch {
        p = [
          {
            id: "subject-fallback",
            name: m.name,
            isSubject: true,
            bornAt: m.bornAt,
            diedAt: m.diedAt,
            avatarPath: m.portraitPath,
          },
        ];
      }

      setMemorial(m);
      setPeople(p);
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
    setSidebarOpen(false);
  };

  const handlePersonFilterChange = (person: string) => {
    setPersonFilter(person);
    setSidebarOpen(false);
  };

  const handlePeriodChange = (period: string) => {
    setPeriodFilter(period);
    if (period && tab === "today") setTab("timeline");
    setSidebarOpen(false);
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
    if (periodFilter) list = list.filter((i) => i.occurredAt.startsWith(periodFilter));
    if (personFilter) {
      const registryPerson = people.find((p) => p.name === personFilter);
      list = list.filter((i) => {
        if (typeof i.metadata.sender === "string" && i.metadata.sender === personFilter) return true;
        if (registryPerson && i.personIds.includes(registryPerson.id)) return true;
        if (registryPerson && getItemFaces(i).some((f) => f.personId === registryPerson.id)) return true;
        return false;
      });
    }
    return list;
  }, [baseItems, sourceFilter, periodFilter, personFilter, people]);

  const messageSenders = useMemo(() => extractPeople(allItems), [allItems]);
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

  const mapPins = useMemo(() => extractMapPins(allItems), [allItems]);

  const tabLabels: Record<Tab, string> = {
    today: "On This Day",
    timeline: "Browse",
    photos: "Photos",
    profile: "Profile",
    collections: "Themes",
    map: "Places",
    import: "Import",
    ask: "Ask",
  };

  const showBrowseChrome = tab === "today" || tab === "timeline";
  const activeFilterCount =
    (sourceFilter ? 1 : 0) + (personFilter ? 1 : 0) + (periodFilter ? 1 : 0);

  const sidebarProps = {
    stats,
    timeline,
    people,
    messageSenders,
    sourceFilter,
    personFilter,
    periodFilter,
    query,
    onSourceChange: handleSourceChange,
    onPersonFilterChange: handlePersonFilterChange,
    onPeriodChange: handlePeriodChange,
    onQueryChange: setQuery,
    onSearch: handleSearch,
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
          onOpenProfile={() => setTab("profile")}
        />
      )}

      {isDemoMode() && (
        <div className="demo-banner wrap" role="status">
          Demo mode — browse sample data here. For import, AI, and your own vault,{" "}
          <a href="https://github.com/smolildn/memorium#quick-start-poc">run locally</a>.
        </div>
      )}

      <AppNav tab={tab} tabLabels={tabLabels} onTabChange={setTab} />

      {showBrowseChrome && (
        <div className="browse-toolbar-mobile">
          <button
            type="button"
            className="hero-btn hero-btn--secondary filter-toggle-btn"
            onClick={() => setSidebarOpen(true)}
          >
            Explore & filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
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
        ) : tab === "photos" ? (
          <PhotosView
            allItems={allItems}
            people={people}
            onItemsChange={setAllItems}
          />
        ) : tab === "profile" ? (
          memorial ? (
            <ProfileView
              memorial={memorial}
              people={people}
              onUpdated={(m, p) => {
                setMemorial(m);
                setPeople(p);
              }}
            />
          ) : (
            <p className="loading">Loading profile…</p>
          )
        ) : tab === "map" ? (
          <MapView
            pins={mapPins}
            onSelect={(item) => scrollToMemory(item.id)}
          />
        ) : showBrowseChrome ? (
          <div className="browse-layout">
            <BrowseSidebar
              {...sidebarProps}
              mobileOpen={sidebarOpen}
              onMobileClose={() => setSidebarOpen(false)}
            />
            <div className="browse-content">
              {loading ? (
                <p className="loading">Loading memories…</p>
              ) : tab === "today" ? (
                <OnThisDayView
                  items={sourceFilter || personFilter || periodFilter ? displayItems : todayItems}
                  dateLabel={todayLabel}
                />
              ) : displayItems.length === 0 ? (
                <div className="empty">
                  <h2>No memories match</h2>
                  <p>Try clearing filters in the sidebar or import more data.</p>
                </div>
              ) : (
                <>
                  {searchResults !== null && (
                    <p className="search-results-label">
                      {displayItems.length} result{displayItems.length === 1 ? "" : "s"} for “{query}”
                      {sourceFilter && ` in ${SOURCE_LABELS[sourceFilter]}`}
                      <button type="button" className="link-btn" onClick={() => { setSearchResults(null); setQuery(""); }}>
                        Clear
                      </button>
                    </p>
                  )}
                  {usePlatformView && activeTheme ? (
                    <>
                      <p className="platform-view-label">
                        Viewing as <strong>{activeTheme.label}</strong>
                      </p>
                      <div className={`platform-shell ${activeTheme.themeClass}`}>
                        <PlatformChrome theme={activeTheme} subjectName={subjectName} />
                        <div className="platform-scroll">
                          {sourceFilter === "meta_instagram" ? (
                            <InstagramPlatformView
                              items={displayItems}
                              theme={activeTheme}
                              subjectName={subjectName}
                            />
                          ) : (
                            <PlatformFeed
                              items={displayItems}
                              theme={activeTheme}
                              subjectName={subjectName}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    displayItems.map((item) => (
                      <div key={item.id} id={`memory-${item.id}`} className="memory-anchor fade-in">
                        <MemoryCard
                          item={item}
                          sourceLabel={SOURCE_LABELS[item.source] ?? item.source}
                          typeLabel={TYPE_LABELS[item.type] ?? item.type}
                          onImageClick={(src, alt) => setLightbox({ src, alt })}
                        />
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <MobileNav tab={tab} onTabChange={setTab} />

      <footer className="footer">
        <p>Local-first · Your data stays on your machine · Export anytime</p>
      </footer>
    </div>
  );
}
