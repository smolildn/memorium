import { useCallback, useMemo, useRef, useState } from "react";

import { isDemoMode, type MemoryItem, type Person } from "../api";
import { mediaUrl } from "../mediaUrl";
import { allPhotoTags, filterPhotos, photoItems, photoYears } from "../utils/photos";
import {
  buildFaceGallery,
  ensureFaceModels,
  scanPhotoForFaces,
} from "../utils/faceRecognition";
import { PhotoDetailPanel } from "./PhotoDetailPanel";

interface Props {
  allItems: MemoryItem[];
  people: Person[];
  onItemsChange: (items: MemoryItem[]) => void;
}

export function PhotosView({ allItems, people, onItemsChange }: Props) {
  const demo = isDemoMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState("");
  const [tag, setTag] = useState("");
  const [personId, setPersonId] = useState("");
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");

  const photos = useMemo(
    () => filterPhotos(allItems, { year: year || undefined, tag: tag || undefined, personId: personId || undefined }),
    [allItems, year, tag, personId],
  );

  const tags = useMemo(() => allPhotoTags(allItems), [allItems]);
  const years = useMemo(() => photoYears(allItems), [allItems]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      if (list.length === 0) return;

      setUploading(true);
      setError(null);
      try {
        const { api } = await import("../client-api.js");
        const result = await api.uploadPhotos(list);
        const refreshed = await api.items({ limit: 500 });
        onItemsChange(refreshed.items);
        if (result.count === 0) {
          setError("No new photos were added (duplicates are skipped).");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onItemsChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (demo) return;
    void uploadFiles(e.dataTransfer.files);
  };

  const handleItemSaved = (updated: MemoryItem) => {
    onItemsChange(allItems.map((i) => (i.id === updated.id ? updated : i)));
    setSelected(updated);
  };

  const scanArchive = async () => {
    if (demo) return;
    setScanning(true);
    setError(null);
    setScanProgress("Loading models…");
    try {
      await ensureFaceModels();
      const { api } = await import("../client-api.js");
      let gallery = buildFaceGallery(allItems, people);
      const targets = photoItems(allItems).filter((i) => {
        const faces = i.metadata.faces;
        return !Array.isArray(faces) || faces.length === 0;
      });

      if (targets.length === 0) {
        setError("All photos already have face data. Open a photo to re-run detection.");
        return;
      }

      let updatedItems = [...allItems];
      let labeled = 0;

      for (let i = 0; i < targets.length; i++) {
        const item = targets[i]!;
        setScanProgress(`Scanning ${i + 1} / ${targets.length}…`);
        const result = await scanPhotoForFaces(item, gallery);
        if (!result || result.facesFound === 0) continue;

        const saved = await api.updateItem(result.updated.id, {
          metadata: result.updated.metadata,
          personIds: result.updated.personIds,
        });
        updatedItems = updatedItems.map((it) => (it.id === saved.id ? saved : it));
        if (result.suggested > 0) labeled += result.suggested;
        gallery = buildFaceGallery(updatedItems, people);
      }

      onItemsChange(updatedItems);
      setScanProgress(`Done — ${labeled} face suggestion${labeled === 1 ? "" : "s"} applied. Review and save in each photo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive scan failed");
      setScanProgress("");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="photos-view">
      {!demo && (
        <div
          className={`photo-bump${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="photo-bump-title">{uploading ? "Uploading…" : "Drop photos here"}</p>
          <p className="photo-bump-hint">or</p>
          <button type="button" className="hero-btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
            Choose files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {demo && (
        <p className="demo-inline-notice" role="status">
          Demo mode — browse sample photos. Upload and tagging require the local app.
        </p>
      )}

      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <div className="photos-toolbar">
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Filter by person">
          <option value="">All people</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="photos-count">{photos.length} photos</span>
        {!demo && (
          <button
            type="button"
            className="hero-btn hero-btn--secondary photos-scan-btn"
            disabled={scanning || uploading}
            onClick={() => void scanArchive()}
          >
            {scanning ? scanProgress || "Scanning…" : "Scan archive for faces"}
          </button>
        )}
      </div>

      {scanProgress && !scanning && (
        <p className="hint scan-result" role="status">
          {scanProgress}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="empty">
          <h2>No photos yet</h2>
          <p>Upload images or import from Instagram, Facebook, or a photo folder.</p>
        </div>
      ) : (
        <div className="photos-grid">
          {photos.map((item) => {
            const ref = item.mediaRefs?.[0];
            if (!ref) return null;
            return (
              <button
                key={item.id}
                type="button"
                className="photos-grid-cell"
                onClick={() => setSelected(item)}
              >
                <img src={mediaUrl(ref)} alt={item.title ?? ""} loading="lazy" />
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <PhotoDetailPanel
          item={selected}
          people={people}
          allItems={allItems}
          onClose={() => setSelected(null)}
          onSave={handleItemSaved}
          readOnly={demo}
        />
      )}
    </div>
  );
}
