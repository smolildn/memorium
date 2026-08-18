import { MEMORY_COLLECTIONS, itemsForCollection } from "../utils/memorial";
import { SOURCE_LABELS, TYPE_LABELS, type MemoryItem } from "../api";
import { MemoryCard } from "./MemoryCard";

interface Props {
  allItems: MemoryItem[];
  activeCollection: string;
  onCollectionChange: (id: string) => void;
}

export function CollectionsView({ allItems, activeCollection, onCollectionChange }: Props) {
  const active = MEMORY_COLLECTIONS.find((c) => c.id === activeCollection) ?? MEMORY_COLLECTIONS[0]!;
  const items = itemsForCollection(allItems, active.id);

  return (
    <div className="collections-view">
      <div className="collections-chips">
        {MEMORY_COLLECTIONS.map((c) => {
          const count = itemsForCollection(allItems, c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className={`collection-chip ${activeCollection === c.id ? "active" : ""}`}
              onClick={() => onCollectionChange(c.id)}
            >
              {c.emoji} {c.title} · {count}
            </button>
          );
        })}
      </div>
      <div className="collections-header">
        <h2>{active.emoji} {active.title}</h2>
        <p>{active.description}</p>
      </div>
      {items.length === 0 ? (
        <p className="collections-empty">No memories match this collection yet.</p>
      ) : (
        <div className="collections-feed">
          {items.map((item) => (
            <div key={item.id} id={`memory-${item.id}`} className="memory-anchor fade-in">
              <MemoryCard
                item={item}
                sourceLabel={SOURCE_LABELS[item.source] ?? item.source}
                typeLabel={TYPE_LABELS[item.type] ?? item.type}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
