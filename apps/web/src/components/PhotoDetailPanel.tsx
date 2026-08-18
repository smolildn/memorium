import { useState } from "react";

import { formatDate, type MemoryItem, type Person } from "../api";
import { mediaUrl } from "../mediaUrl";
import {
  PHOTO_FILTER_CSS,
  getItemFaces,
  getItemTags,
  mergePersonIdsFromFaces,
  type PhotoFilterPreset,
} from "../utils/photos";
import {
  applyRecognitionToFaces,
  buildFaceGallery,
  detectFacesInImage,
  ensureFaceModels,
} from "../utils/faceRecognition";
import { generateId } from "../utils/id";
import type { FaceRegion } from "../utils/photos";

interface Props {
  item: MemoryItem;
  people: Person[];
  allItems: MemoryItem[];
  onClose: () => void;
  onSave: (item: MemoryItem) => void;
  onPeopleChange?: (people: Person[]) => void;
  readOnly?: boolean;
  demo?: boolean;
}

export function PhotoDetailPanel({
  item,
  people,
  allItems,
  onClose,
  onSave,
  onPeopleChange,
  readOnly = false,
  demo = false,
}: Props) {
  const ref = item.mediaRefs?.[0];
  const src = ref ? mediaUrl(ref) : "";
  const [filter, setFilter] = useState<PhotoFilterPreset>("none");
  const [tags, setTags] = useState(getItemTags(item));
  const [tagInput, setTagInput] = useState("");
  const [faces, setFaces] = useState<FaceRegion[]>(getItemFaces(item));
  const [personIds, setPersonIds] = useState(item.personIds);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingPersonForFace, setAddingPersonForFace] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState("");
  const [creatingPerson, setCreatingPerson] = useState(false);

  const canEdit = !readOnly || demo;

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? "Unknown";

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const mergedPersonIds = mergePersonIdsFromFaces(personIds, faces);
      const payload = { metadata: { tags, faces }, personIds: mergedPersonIds };

      if (demo) {
        onSave({
          ...item,
          ...payload,
          metadata: { ...item.metadata, ...payload.metadata },
        });
        return;
      }

      const { api } = await import("../client-api.js");
      const updated = await api.updateItem(item.id, payload);
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runFaceDetect = async () => {
    setDetecting(true);
    setError(null);
    try {
      const img = document.getElementById("photo-detail-img") as HTMLImageElement | null;
      if (!img) throw new Error("Image not ready");
      await ensureFaceModels();
      const detected = await detectFacesInImage(img);
      const gallery = buildFaceGallery(allItems, people);
      const recognized = applyRecognitionToFaces(detected, gallery);
      setFaces(recognized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face detection failed");
    } finally {
      setDetecting(false);
    }
  };

  const assignFace = (faceId: string, personId: string) => {
    if (personId === "__new__") {
      setAddingPersonForFace(faceId);
      setNewPersonName("");
      return;
    }
    setAddingPersonForFace(null);
    setFaces(faces.map((f) => (f.id === faceId ? { ...f, personId: personId || undefined } : f)));
    if (personId && !personIds.includes(personId)) {
      setPersonIds([...personIds, personId]);
    }
  };

  const createAndAssignPerson = async (faceId: string) => {
    const name = newPersonName.trim();
    if (!name) return;
    setCreatingPerson(true);
    setError(null);
    try {
      const { api } = await import("../client-api.js");
      const created = await api.createPerson({ name });
      const refreshed = await api.people();
      onPeopleChange?.(refreshed);
      setFaces(
        faces.map((f) =>
          f.id === faceId ? { ...f, personId: created.id, label: created.name } : f,
        ),
      );
      setPersonIds([...personIds, created.id]);
      setAddingPersonForFace(null);
      setNewPersonName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create person");
    } finally {
      setCreatingPerson(false);
    }
  };

  const addManualFace = () => {
    setFaces([
      ...faces,
      { id: generateId(), x: 0.35, y: 0.25, width: 0.3, height: 0.35 },
    ]);
  };

  const meta = item.metadata;

  return (
    <div className="photo-detail-overlay" role="dialog" aria-modal="true" aria-label="Photo details">
      <div className="photo-detail-panel">
        <button type="button" className="photo-detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="photo-detail-layout">
          <div className="photo-detail-image-wrap">
            <img
              id="photo-detail-img"
              src={src}
              alt={item.title ?? "Photo"}
              style={{ filter: PHOTO_FILTER_CSS[filter] }}
              crossOrigin="anonymous"
            />
            {faces.map((face) => (
              <div
                key={face.id}
                className={`face-box${face.personId ? " labeled" : ""}`}
                style={{
                  left: `${face.x * 100}%`,
                  top: `${face.y * 100}%`,
                  width: `${face.width * 100}%`,
                  height: `${face.height * 100}%`,
                }}
                title={face.personId ? personName(face.personId) : "Unlabeled face"}
              >
                {face.personId && <span className="face-label">{personName(face.personId)}</span>}
              </div>
            ))}
          </div>

          <div className="photo-detail-meta">
            <h2>{item.title ?? "Photo"}</h2>
            <p className="photo-detail-date">{formatDate(item.occurredAt)}</p>

            {demo && canEdit && (
              <p className="demo-inline-notice" role="status">
                Demo mode — face tags save to this session only.
              </p>
            )}

            {error && <p className="error-banner">{error}</p>}

            <section>
              <h3>Filters</h3>
              <div className="photo-filter-row">
                {(Object.keys(PHOTO_FILTER_CSS) as PhotoFilterPreset[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={filter === key ? "active" : ""}
                    onClick={() => setFilter(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <p className="hint">Preview only — original file is preserved.</p>
            </section>

            <section>
              <h3>Tags</h3>
              <div className="tag-list">
                {tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                    {!readOnly && (
                      <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {!readOnly && (
                <div className="tag-input-row">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <button type="button" onClick={addTag}>
                    Add
                  </button>
                </div>
              )}
            </section>

            <section>
              <h3>People</h3>
              <div className="photo-people-checks">
                {people.map((person) => (
                  <label key={person.id}>
                    <input
                      type="checkbox"
                      checked={personIds.includes(person.id)}
                      disabled={readOnly}
                      onChange={(e) => {
                        if (e.target.checked) setPersonIds([...personIds, person.id]);
                        else setPersonIds(personIds.filter((id) => id !== person.id));
                      }}
                    />
                    {person.name}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3>Faces</h3>
              {canEdit && (
                <div className="face-actions">
                  <button type="button" onClick={() => void runFaceDetect()} disabled={detecting}>
                    {detecting ? "Detecting…" : "Detect faces"}
                  </button>
                  <button type="button" onClick={addManualFace}>
                    Add region
                  </button>
                </div>
              )}
              {faces.length === 0 ? (
                <p className="hint">Run face detection or add a region manually, then assign names.</p>
              ) : (
                <ul className="face-assign-list">
                  {faces.map((face, idx) => (
                    <li key={face.id}>
                      <span>
                        Face {idx + 1}
                        {face.matchDistance !== undefined && face.personId && (
                          <span className="face-match-score">
                            {" "}
                            (match {(1 - face.matchDistance).toFixed(2)})
                          </span>
                        )}
                      </span>
                      {addingPersonForFace === face.id ? (
                        <div className="face-add-person-row">
                          <input
                            value={newPersonName}
                            onChange={(e) => setNewPersonName(e.target.value)}
                            placeholder="New person name…"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void createAndAssignPerson(face.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={creatingPerson || !newPersonName.trim()}
                            onClick={() => void createAndAssignPerson(face.id)}
                          >
                            {creatingPerson ? "…" : "Add"}
                          </button>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setAddingPersonForFace(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <select
                          value={face.personId ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => assignFace(face.id, e.target.value)}
                        >
                          <option value="">— Select person —</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          {canEdit && <option value="__new__">+ Add new person…</option>}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(typeof meta.camera === "string" || (typeof meta.lat === "number" && typeof meta.lng === "number")) && (
              <section>
                <h3>Metadata</h3>
                <dl className="profile-meta-dl">
                  {typeof meta.camera === "string" && (
                    <>
                      <dt>Camera</dt>
                      <dd>{meta.camera}</dd>
                    </>
                  )}
                  {typeof meta.lat === "number" && typeof meta.lng === "number" && (
                    <>
                      <dt>Location</dt>
                      <dd>
                        {typeof meta.place === "string" ? `${meta.place} · ` : ""}
                        {meta.lat.toFixed(4)}, {meta.lng.toFixed(4)}
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            {canEdit && (
              <button type="button" className="hero-btn" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
