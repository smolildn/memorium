import { SOURCE_LABELS, TYPE_LABELS, type MemoryItem } from "../api";
import { MemoryCard } from "./MemoryCard";

interface Props {
  items: MemoryItem[];
  dateLabel: string;
}

export function OnThisDayView({ items, dateLabel }: Props) {
  if (items.length === 0) {
    return (
      <div className="empty on-this-day-empty">
        <h2>Quiet day in the archive</h2>
        <p>No memories on {dateLabel} yet. As you import more, past years will appear here.</p>
      </div>
    );
  }

  const byYear = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const year = item.occurredAt.slice(0, 4);
    const list = byYear.get(year) ?? [];
    list.push(item);
    byYear.set(year, list);
  }

  const years = [...byYear.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="on-this-day-view">
      <div className="on-this-day-header">
        <h2>On this day</h2>
        <p>{dateLabel} · {items.length} {items.length === 1 ? "memory" : "memories"} across {years.length} {years.length === 1 ? "year" : "years"}</p>
      </div>
      <div className="on-this-day-years">
        {years.map(([year, yearItems]) => (
          <section key={year} className="on-this-day-year">
            <h3 className="on-this-day-year-label">{year}</h3>
            <div className="on-this-day-cards">
              {yearItems.map((item) => (
                <div key={item.id} id={`memory-${item.id}`} className="memory-anchor fade-in">
                  <MemoryCard
                    item={item}
                    sourceLabel={SOURCE_LABELS[item.source] ?? item.source}
                    typeLabel={TYPE_LABELS[item.type] ?? item.type}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
