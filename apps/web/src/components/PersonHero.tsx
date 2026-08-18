import { formatDate, type Memorial, type MemoryItem } from "../api";
import { quoteOfDay } from "../utils/memorial";
import { mediaUrl } from "../mediaUrl";

interface Props {
  memorial: Memorial;
  allItems: MemoryItem[];
  stats: Record<string, number>;
  onSurprise: () => void;
  onSlideshow: () => void;
  onOpenProfile?: () => void;
}

export function PersonHero({ memorial, allItems, stats, onSurprise, onSlideshow, onOpenProfile }: Props) {
  const total = stats.total ?? allItems.length;
  const sourceCount = Object.keys(stats).filter((k) => k.startsWith("source:")).length;
  const quote = quoteOfDay(allItems);
  const portraitSrc = memorial.portraitPath
    ? mediaUrl({ vaultPath: memorial.portraitPath })
    : null;

  const lifespan =
    memorial.bornAt && memorial.diedAt
      ? `${formatDate(memorial.bornAt)} — ${formatDate(memorial.diedAt)}`
      : memorial.bornAt
        ? `Born ${formatDate(memorial.bornAt)}`
        : null;

  return (
    <header className="person-hero">
      <div className="person-hero-inner">
        <div className="person-portrait">
          {portraitSrc ? (
            <img src={portraitSrc} alt={memorial.name} />
          ) : (
            <div className="person-portrait-fallback" aria-hidden="true">
              {memorial.name
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </div>
          )}
        </div>
        <div className="person-hero-text">
          <p className="eyebrow">Memorium</p>
          <h1>
            {onOpenProfile ? (
              <button type="button" className="person-name-btn" onClick={onOpenProfile}>
                {memorial.name}
              </button>
            ) : (
              memorial.name
            )}
          </h1>
          {lifespan && <p className="person-lifespan">{lifespan}</p>}
          {memorial.tribute && <p className="person-tribute">{memorial.tribute}</p>}
          <p className="person-stats-line">
            <strong>{total}</strong> memories across <strong>{sourceCount || "many"}</strong>{" "}
            sources
          </p>
          {quote && (
            <blockquote className="person-quote">
              <span className="person-quote-mark">“</span>
              {quote}
              <span className="person-quote-mark">”</span>
            </blockquote>
          )}
          <div className="person-hero-actions">
            <button type="button" className="hero-btn" onClick={onSurprise}>
              ✨ Surprise me
            </button>
            <button type="button" className="hero-btn hero-btn--secondary" onClick={onSlideshow}>
              ▶ Memory lane
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
