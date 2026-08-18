import { useState } from "react";

import { PlatformFeed } from "./PlatformFeed";
import { InstagramGrid } from "./InstagramGrid";
import type { MemoryItem } from "../api";
import type { SourceTheme } from "../sourceThemes";

interface Props {
  items: MemoryItem[];
  theme: SourceTheme;
  subjectName: string;
}

export function InstagramPlatformView({ items, theme, subjectName }: Props) {
  const [view, setView] = useState<"grid" | "feed">("grid");
  const [focusId, setFocusId] = useState<string | null>(null);

  const sorted = [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <>
      <div className="instagram-view-toggle">
        <button
          type="button"
          className={view === "grid" ? "active" : ""}
          onClick={() => setView("grid")}
        >
          Grid
        </button>
        <button
          type="button"
          className={view === "feed" ? "active" : ""}
          onClick={() => {
            setFocusId(null);
            setView("feed");
          }}
        >
          Feed
        </button>
      </div>
      {view === "grid" ? (
        <InstagramGrid
          items={sorted}
          onSelect={(item) => {
            setFocusId(item.id);
            setView("feed");
          }}
        />
      ) : (
        <PlatformFeed
          items={focusId ? sorted.filter((i) => i.id === focusId) : sorted}
          theme={theme}
          subjectName={subjectName}
        />
      )}
    </>
  );
}
