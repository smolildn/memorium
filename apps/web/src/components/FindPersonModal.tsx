import { useState } from "react";

import { formatDate, type MemoryItem, type Person } from "../api";
import {
  findPersonInArchive,
  getPersonReferenceEmbedding,
  type FindPersonResult,
} from "../utils/faceRecognition";

interface Props {
  person: Person;
  allItems: MemoryItem[];
  onClose: () => void;
  onSaved: (items: MemoryItem[]) => void;
  demo?: boolean;
}

export function FindPersonModal({ person, allItems, onClose, onSaved, demo = false }: Props) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<FindPersonResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reference = getPersonReferenceEmbedding(person, allItems);
  const hasReference = reference !== null;

  const runScan = async () => {
    if (!reference) {
      setError("No face reference for this person. Learn from portrait or tag a face in a photo first.");
      return;
    }
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const scanResult = await findPersonInArchive(
        allItems,
        person.id,
        reference,
        (current, total) => setProgress(`Scanning ${current} / ${total}…`),
      );
      setResult(scanResult);
      setSelectedIds(new Set(scanResult.updates.map((u) => u.id)));
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setProgress("");
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const saveSelected = async () => {
    if (!result) return;
    const toSave = result.updates.filter((u) => selectedIds.has(u.id));
    if (toSave.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const { api } = await import("../client-api.js");
      const saved: MemoryItem[] = [];
      for (const item of toSave) {
        const updated = await api.updateItem(item.id, {
          metadata: item.metadata,
          personIds: item.personIds,
        });
        saved.push(updated);
      }
      const merged = allItems.map((i) => {
        const match = saved.find((s) => s.id === i.id);
        return match ?? i;
      });
      onSaved(merged);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const itemLabel = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return itemId.slice(0, 8);
    return item.title ?? formatDate(item.occurredAt);
  };

  const matchesByPhoto = result
    ? result.matches.reduce<Map<string, typeof result.matches>>((map, m) => {
        const list = map.get(m.itemId) ?? [];
        list.push(m);
        map.set(m.itemId, list);
        return map;
      }, new Map())
    : null;

  return (
    <div className="find-person-overlay" role="dialog" aria-modal="true" aria-label={`Find ${person.name} in photos`}>
      <div className="find-person-panel">
        <button type="button" className="photo-detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Find {person.name} in all photos</h2>
        <p className="hint">
          Scans every photo in the archive, detects faces, and matches them against{" "}
          {person.faceEmbedding?.length === 128 ? "the learned portrait" : "a tagged face reference"}.
          Review matches before saving.
        </p>

        {demo && (
          <p className="demo-inline-notice" role="status">
            Demo mode — matches save to this session only.
          </p>
        )}

        {error && <p className="error-banner">{error}</p>}

        {!hasReference && (
          <p className="error-banner">
            No face reference yet. Use &ldquo;Learn face from photo&rdquo; on Profile, or tag {person.name} on a face
            in any photo first.
          </p>
        )}

        {!result && (
          <div className="find-person-actions">
            <button
              type="button"
              className="hero-btn"
              disabled={scanning || !hasReference}
              onClick={() => void runScan()}
            >
              {scanning ? progress || "Scanning…" : "Scan all photos"}
            </button>
            <button type="button" className="hero-btn hero-btn--secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}

        {result && (
          <>
            <p className="find-person-summary" role="status">
              Scanned {result.photosScanned} photos — {result.facesMatched} new face
              {result.facesMatched === 1 ? "" : "s"} matched across {result.updates.length} photo
              {result.updates.length === 1 ? "" : "s"}.
            </p>

            {result.updates.length === 0 ? (
              <p className="hint">No new matches found. Try learning the face from a clearer portrait.</p>
            ) : (
              <ul className="find-person-results">
                {[...(matchesByPhoto?.entries() ?? [])].map(([itemId, faceMatches]) => (
                  <li key={itemId}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(itemId)}
                        onChange={() => toggleItem(itemId)}
                      />
                      <span>
                        {itemLabel(itemId)}
                        <span className="face-match-score">
                          {" "}
                          — {faceMatches.length} face{faceMatches.length === 1 ? "" : "s"}
                          {faceMatches[0] && ` (match ${(1 - faceMatches[0].distance).toFixed(2)})`}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="find-person-actions">
              {result.updates.length > 0 && (
                <button
                  type="button"
                  className="hero-btn"
                  disabled={saving || selectedIds.size === 0}
                  onClick={() => void saveSelected()}
                >
                  {saving ? "Saving…" : `Tag ${selectedIds.size} photo${selectedIds.size === 1 ? "" : "s"}`}
                </button>
              )}
              <button type="button" className="hero-btn hero-btn--secondary" onClick={onClose}>
                {result.updates.length > 0 ? "Cancel" : "Close"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
