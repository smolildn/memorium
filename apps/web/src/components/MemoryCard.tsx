import { formatDate, type MemoryItem } from "../api";
import { mediaUrl } from "../mediaUrl";
import { ArchiveBadge } from "./ArchiveBadge";

interface Props {
  item: MemoryItem;
  sourceLabel: string;
  typeLabel: string;
  onImageClick?: (src: string, alt: string) => void;
}

export function MemoryCard({ item, sourceLabel, typeLabel, onImageClick }: Props) {
  const sender =
    typeof item.metadata.sender === "string" ? item.metadata.sender : null;

  return (
    <article className="memory-card">
      <header className="memory-header">
        <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
        <div className="badges">
          <ArchiveBadge date={item.occurredAt} />
          <span className="badge source">{sourceLabel}</span>
          <span className="badge type">{typeLabel}</span>
        </div>
      </header>
      {item.title && <h3>{item.title}</h3>}
      {sender && <p className="sender">From {sender}</p>}
      {item.mediaRefs && item.mediaRefs.length > 0 && (
        <div className="memory-media">
          {item.mediaRefs.map((ref) => (
            <button
              key={ref.id ?? ref.vaultPath ?? ref.path}
              type="button"
              className="memory-media-btn"
              onClick={() => onImageClick?.(mediaUrl(ref), item.title ?? "Memory photo")}
            >
              <img
                src={mediaUrl(ref)}
                alt={item.title ?? "Memory photo"}
                loading="lazy"
                width={ref.width}
                height={ref.height}
              />
            </button>
          ))}
        </div>
      )}
      {item.text && <p className="memory-text">{item.text}</p>}
    </article>
  );
}
