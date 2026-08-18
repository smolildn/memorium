import { useEffect, useRef, useState } from "react";

type Tab = "today" | "timeline" | "photos" | "profile" | "collections" | "map" | "import" | "ask";

interface Props {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const PRIMARY: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "today", label: "Today", icon: "☀" },
  { id: "timeline", label: "Browse", icon: "☰" },
  { id: "photos", label: "Photos", icon: "🖼" },
  { id: "profile", label: "Profile", icon: "◉" },
];

const SECONDARY: Array<{ id: Tab; label: string }> = [
  { id: "collections", label: "Themes" },
  { id: "map", label: "Places" },
  { id: "import", label: "Import" },
  { id: "ask", label: "Ask" },
];

export function MobileNav({ tab, onTabChange }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const secondaryActive = SECONDARY.some((t) => t.id === tab);

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

  return (
    <>
      {moreOpen && (
        <div
          className="mobile-nav-backdrop"
          aria-hidden="true"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <nav className="mobile-nav" aria-label="Main navigation">
        {PRIMARY.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "mobile-nav-btn active" : "mobile-nav-btn"}
            onClick={() => onTabChange(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span className="mobile-nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <div className="mobile-nav-more" ref={moreRef}>
          <button
            type="button"
            className={`mobile-nav-btn${secondaryActive ? " active" : ""}`}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((o) => !o)}
          >
            <span className="mobile-nav-icon">⋯</span>
            <span>More</span>
          </button>
          {moreOpen && (
            <div className="mobile-nav-dropdown" role="menu">
              {SECONDARY.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  className={tab === t.id ? "active" : ""}
                  onClick={() => {
                    onTabChange(t.id);
                    setMoreOpen(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

export type { Tab as MobileTab };
