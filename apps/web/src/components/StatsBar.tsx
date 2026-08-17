interface Props {
  stats: Record<string, number>;
}

export function StatsBar({ stats }: Props) {
  const total = stats.total ?? 0;
  const sources = Object.entries(stats)
    .filter(([k]) => k.startsWith("source:"))
    .map(([k, v]) => ({ name: k.replace("source:", ""), count: v }));

  if (total === 0) return null;

  return (
    <div className="stats-bar">
      <span className="stat-pill">
        <strong>{total}</strong> memories
      </span>
      {sources.map((s) => (
        <span key={s.name} className="stat-pill muted">
          {s.name.replace("meta_", "").replace("_", " ")} · {s.count}
        </span>
      ))}
    </div>
  );
}
