import { useEffect, useRef, useState } from "react";

type Tab = "today" | "timeline" | "photos" | "profile" | "collections" | "map" | "import" | "ask";

interface Props {
  tab: Tab;
  tabLabels: Record<Tab, string>;
  onTabChange: (tab: Tab) => void;
}

const PRIMARY: Tab[] = ["today", "timeline", "photos", "profile"];
const SECONDARY: Tab[] = ["collections", "map", "import", "ask"];

const TAB_ICONS: Partial<Record<Tab, string>> = {
  today: "☀",
  timeline: "☰",
  photos: "🖼",
  profile: "◉",
};

export function AppNav({ tab, tabLabels, onTabChange }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [moreOpen]);

  const secondaryActive = SECONDARY.includes(tab);

  return (
    <header className="app-nav-shell">
      {moreOpen && (
        <div
          className="app-nav-backdrop"
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <nav className="app-nav" aria-label="Main navigation">
        <div className="app-nav-scroll">
          <div className="app-nav-primary">
            {PRIMARY.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab${tab === t ? " active" : ""}${t === "profile" ? " tab--profile" : ""}`}
                onClick={() => onTabChange(t)}
                aria-current={tab === t ? "page" : undefined}
              >
                {TAB_ICONS[t] && <span className="tab-icon" aria-hidden="true">{TAB_ICONS[t]}</span>}
                {tabLabels[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="app-nav-more" ref={moreRef}>
          <button
            type="button"
            className={`tab app-nav-more-btn${secondaryActive ? " active" : ""}`}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((o) => !o)}
          >
            More{secondaryActive ? `: ${tabLabels[tab]}` : ""} ▾
          </button>
          {moreOpen && (
            <div className="app-nav-dropdown" role="menu">
              {SECONDARY.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="menuitem"
                  className={tab === t ? "active" : ""}
                  onClick={() => {
                    onTabChange(t);
                    setMoreOpen(false);
                  }}
                >
                  {tabLabels[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export type { Tab as AppTab };
