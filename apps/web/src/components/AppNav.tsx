import { useEffect, useRef, useState } from "react";

type Tab = "today" | "timeline" | "photos" | "profile" | "collections" | "map" | "import" | "ask";

interface Props {
  tab: Tab;
  tabLabels: Record<Tab, string>;
  onTabChange: (tab: Tab) => void;
}

const PRIMARY: Tab[] = ["today", "timeline", "photos", "profile"];
const SECONDARY: Tab[] = ["collections", "map", "import", "ask"];

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
    <nav className="app-nav desktop-tabs" aria-label="Main navigation">
      <div className="app-nav-primary">
        {PRIMARY.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "tab active" : "tab"}
            onClick={() => onTabChange(t)}
          >
            {tabLabels[t]}
          </button>
        ))}
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
  );
}

export type { Tab as AppTab };
