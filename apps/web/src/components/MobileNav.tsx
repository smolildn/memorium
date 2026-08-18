type Tab = "today" | "timeline" | "collections" | "import" | "ask";

interface Props {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "today", label: "Today", icon: "☀" },
  { id: "timeline", label: "Browse", icon: "☰" },
  { id: "collections", label: "Themes", icon: "✦" },
  { id: "ask", label: "Ask", icon: "?" },
  { id: "import", label: "Import", icon: "↓" },
];

export function MobileNav({ tab, onTabChange }: Props) {
  return (
    <nav className="mobile-nav" aria-label="Main navigation">
      {TABS.map((t) => (
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
    </nav>
  );
}

export type { Tab as MobileTab };
