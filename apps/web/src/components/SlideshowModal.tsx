import { useCallback, useEffect, useState } from "react";

import { formatDate, SOURCE_LABELS, type MemoryItem } from "../api";
import { mediaUrl } from "../mediaUrl";

interface Props {
  items: MemoryItem[];
  subjectName: string;
  startItemId?: string;
  onClose: () => void;
}

export function SlideshowModal({ items, subjectName, startItemId, onClose }: Props) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const initialIndex = startItemId
    ? Math.max(0, sorted.findIndex((i) => i.id === startItemId))
    : 0;
  const [index, setIndex] = useState(initialIndex);

  const current = sorted[index];

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, sorted.length - 1));
  }, [sorted.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  if (!current) return null;

  const imageRef = current.mediaRefs?.[0];

  return (
    <div
      className="slideshow-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Memory lane slideshow"
      onClick={onClose}
    >
      <button type="button" className="slideshow-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <div className="slideshow-content" onClick={(e) => e.stopPropagation()}>
        <p className="slideshow-progress">
          {index + 1} / {sorted.length}
        </p>
        {imageRef ? (
          <img
            className="slideshow-image"
            src={mediaUrl(imageRef)}
            alt={current.title ?? "Memory"}
          />
        ) : (
          <div className="slideshow-text-only">
            <p>{current.text.slice(0, 400)}</p>
          </div>
        )}
        <div className="slideshow-meta">
          <time dateTime={current.occurredAt}>{formatDate(current.occurredAt)}</time>
          <span>{SOURCE_LABELS[current.source] ?? current.source}</span>
        </div>
        {current.text && imageRef && <p className="slideshow-caption">{current.text}</p>}
        <p className="slideshow-subject">Memories of {subjectName}</p>
      </div>
      <div className="slideshow-nav" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={prev} disabled={index === 0}>
          ← Prev
        </button>
        <button type="button" onClick={next} disabled={index >= sorted.length - 1}>
          Next →
        </button>
      </div>
    </div>
  );
}
