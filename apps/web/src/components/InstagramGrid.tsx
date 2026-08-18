import { mediaUrl } from "../mediaUrl";
import type { MemoryItem } from "../api";

interface Props {
  items: MemoryItem[];
  onSelect: (item: MemoryItem) => void;
}

export function InstagramGrid({ items, onSelect }: Props) {
  const withMedia = items.filter((i) => i.mediaRefs && i.mediaRefs.length > 0);

  return (
    <div className="instagram-grid">
      {withMedia.map((item) => {
        const ref = item.mediaRefs![0]!;
        return (
          <button
            key={item.id}
            type="button"
            className="instagram-grid-cell"
            onClick={() => onSelect(item)}
            aria-label={item.title ?? "Instagram photo"}
          >
            <img src={mediaUrl(ref)} alt="" loading="lazy" />
          </button>
        );
      })}
    </div>
  );
}
