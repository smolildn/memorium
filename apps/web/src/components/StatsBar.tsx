import { SOURCE_LABELS } from "../api";
import { SOURCE_THEMES } from "../sourceThemes";

interface Props {
  stats: Record<string, number>;
  activeSource: string;
  onSourceChange: (source: string) => void;
}

export function StatsBar({ stats, activeSource, onSourceChange }: Props) {
  const total = stats.total ?? 0;
  const sources = Object.entries(stats)
    .filter(([k]) => k.startsWith("source:"))
    .map(([k, v]) => ({
      id: k.replace("source:", ""),
      count: v,
      label: SOURCE_LABELS[k.replace("source:", "")] ?? k.replace("source:", ""),
      color: SOURCE_THEMES[k.replace("source:", "")]?.accentColor,
    }))
    .sort((a, b) => b.count - a.count);

  if (total === 0) return null;

  return (
    <div className="stats-bar" role="group" aria-label="Filter by source">
      <button
        type="button"
        className={`stat-pill stat-pill-btn ${activeSource === "" ? "active" : ""}`}
        onClick={() => onSourceChange("")}
        aria-pressed={activeSource === ""}
      >
        <strong>{total}</strong> all
      </button>
      {sources.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`stat-pill stat-pill-btn ${activeSource === s.id ? "active" : ""}`}
          style={
            activeSource === s.id && s.color
              ? { background: s.color, borderColor: s.color }
              : s.color
                ? { borderColor: s.color }
                : undefined
          }
          onClick={() => onSourceChange(activeSource === s.id ? "" : s.id)}
          aria-pressed={activeSource === s.id}
        >
          {s.label} · {s.count}
        </button>
      ))}
    </div>
  );
}
