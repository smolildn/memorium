import { useEffect, useState } from "react";

import { SOURCE_LABELS } from "../api";
import { SOURCE_THEMES } from "../sourceThemes";
import type { Person, TimelinePeriod } from "../api";

interface Props {
  stats: Record<string, number>;
  timeline: TimelinePeriod[];
  people: Person[];
  messageSenders: string[];
  sourceFilter: string;
  personFilter: string;
  periodFilter: string;
  query: string;
  onSourceChange: (source: string) => void;
  onPersonFilterChange: (person: string) => void;
  onPeriodChange: (period: string) => void;
  onQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function BrowseSidebar({
  stats,
  timeline,
  people,
  messageSenders,
  sourceFilter,
  personFilter,
  periodFilter,
  query,
  onSourceChange,
  onPersonFilterChange,
  onPeriodChange,
  onQueryChange,
  onSearch,
  mobileOpen = false,
  onMobileClose,
}: Props) {
  const total = stats.total ?? 0;
  const sources = Object.entries(stats)
    .filter(([k]) => k.startsWith("source:"))
    .map(([k, v]) => ({
      id: k.replace("source:", ""),
      count: v,
      label: SOURCE_LABELS[k.replace("source:", "")] ?? k.replace("source:", ""),
      color: SOURCE_THEMES[k.replace("source:", "")]?.accentColor,
      platform: SOURCE_THEMES[k.replace("source:", "")]?.layout !== "default",
    }))
    .sort((a, b) => b.count - a.count);

  const activeFilters =
    (sourceFilter ? 1 : 0) + (personFilter ? 1 : 0) + (periodFilter ? 1 : 0);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);

  useEffect(() => {
    setPeriodOpen(!!periodFilter);
  }, [periodFilter]);

  useEffect(() => {
    setSourceOpen(!!sourceFilter);
  }, [sourceFilter]);

  useEffect(() => {
    setPeopleOpen(!!personFilter);
  }, [personFilter]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close filters"
          onClick={onMobileClose}
        />
      )}
      <aside className={`browse-sidebar${mobileOpen ? " browse-sidebar--open" : ""}`}>
        <div className="browse-sidebar-header">
          <h2>Explore</h2>
          {activeFilters > 0 && (
            <button
              type="button"
              className="link-btn sidebar-clear"
              onClick={() => {
                onSourceChange("");
                onPersonFilterChange("");
                onPeriodChange("");
              }}
            >
              Clear ({activeFilters})
            </button>
          )}
          {mobileOpen && onMobileClose && (
            <button type="button" className="sidebar-close" onClick={onMobileClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        <form className="sidebar-search" onSubmit={onSearch}>
          <input
            type="search"
            placeholder="Search memories…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search memories"
          />
          <button type="submit">Go</button>
        </form>

        <details
          className="sidebar-section"
          open={periodOpen}
          onToggle={(e) => setPeriodOpen(e.currentTarget.open)}
        >
          <summary>
            Through the years
            {periodFilter && (
              <span className="sidebar-active-tag">{formatPeriod(periodFilter)}</span>
            )}
          </summary>
          <ul className="sidebar-period-list">
            <li>
              <button
                type="button"
                className={periodFilter === "" ? "active" : ""}
                onClick={() => onPeriodChange("")}
              >
                <span>All dates</span>
                <span className="count">{total}</span>
              </button>
            </li>
            {timeline.map((p) => (
              <li key={p.period}>
                <button
                  type="button"
                  className={periodFilter === p.period ? "active" : ""}
                  onClick={() => onPeriodChange(periodFilter === p.period ? "" : p.period)}
                >
                  <span>{formatPeriod(p.period)}</span>
                  <span className="count">{p.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>

        <details
          className="sidebar-section"
          open={sourceOpen}
          onToggle={(e) => setSourceOpen(e.currentTarget.open)}
        >
          <summary>
            Sources
            {sourceFilter && (
              <span className="sidebar-active-tag">{SOURCE_LABELS[sourceFilter] ?? sourceFilter}</span>
            )}
          </summary>
          <div className="sidebar-pills">
            <button
              type="button"
              className={`sidebar-pill${sourceFilter === "" ? " active" : ""}`}
              onClick={() => onSourceChange("")}
            >
              All · {total}
            </button>
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sidebar-pill${sourceFilter === s.id ? " active" : ""}`}
                style={
                  sourceFilter === s.id && s.color
                    ? { background: s.color, borderColor: s.color, color: "#fff" }
                    : s.color
                      ? { borderColor: s.color }
                      : undefined
                }
                onClick={() => onSourceChange(sourceFilter === s.id ? "" : s.id)}
              >
                {s.label} · {s.count}
                {s.platform && <span className="sidebar-pill-hint"> view</span>}
              </button>
            ))}
          </div>
        </details>

        {(people.length > 0 || messageSenders.length > 0) && (
          <details
            className="sidebar-section"
            open={peopleOpen}
            onToggle={(e) => setPeopleOpen(e.currentTarget.open)}
          >
            <summary>
              People
              {personFilter && <span className="sidebar-active-tag">{personFilter}</span>}
            </summary>
            <ul className="sidebar-people-list">
              <li>
                <button
                  type="button"
                  className={personFilter === "" ? "active" : ""}
                  onClick={() => onPersonFilterChange("")}
                >
                  Everyone
                </button>
              </li>
              {people.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={personFilter === p.name ? "active" : ""}
                    onClick={() => onPersonFilterChange(personFilter === p.name ? "" : p.name)}
                  >
                    {p.name}
                    {p.isSubject && <span className="sidebar-person-badge">Subject</span>}
                  </button>
                </li>
              ))}
              {messageSenders
                .filter((name) => !people.some((p) => p.name === name))
                .map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      className={personFilter === name ? "active" : ""}
                      onClick={() => onPersonFilterChange(personFilter === name ? "" : name)}
                    >
                      {name}
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </aside>
    </>
  );
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
