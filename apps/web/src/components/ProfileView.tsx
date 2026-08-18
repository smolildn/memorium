import { useState } from "react";

import { api, formatDate, isDemoMode, type Memorial, type Person } from "../api";
import { mediaUrl } from "../mediaUrl";
import { ensureFaceModels, learnFaceFromPortrait } from "../utils/faceRecognition";

interface Props {
  memorial: Memorial;
  people: Person[];
  onUpdated: (memorial: Memorial, people: Person[]) => void;
}

export function ProfileView({ memorial, people, onUpdated }: Props) {
  const demo = isDemoMode();
  const subject = people.find((p) => p.isSubject) ?? people[0];
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(memorial.name);
  const [tribute, setTribute] = useState(memorial.tribute ?? "");
  const [bornAt, setBornAt] = useState(memorial.bornAt?.slice(0, 10) ?? "");
  const [diedAt, setDiedAt] = useState(memorial.diedAt?.slice(0, 10) ?? "");
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRel, setNewPersonRel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portraitSrc = memorial.portraitPath
    ? mediaUrl({ vaultPath: memorial.portraitPath })
    : null;

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateMemorial({
        name,
        tribute,
        bornAt: bornAt ? new Date(bornAt).toISOString() : undefined,
        diedAt: diedAt ? new Date(diedAt).toISOString() : undefined,
      });
      const refreshedPeople = await api.people();
      onUpdated(updated, refreshedPeople);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadPortrait = async (file: File) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.uploadPortrait(file);
      const refreshedPeople = await api.people();
      onUpdated(updated, refreshedPeople);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portrait upload failed");
    } finally {
      setSaving(false);
    }
  };

  const learnFaceForPerson = async (person: Person) => {
    if (!person.avatarPath) {
      setError(`Upload a portrait for ${person.name} first.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ensureFaceModels();
      const embedding = await learnFaceFromPortrait(person);
      if (!embedding) {
        setError(`No face detected in ${person.name}'s portrait. Try a clearer front-facing photo.`);
        return;
      }
      await api.updatePerson(person.id, { faceEmbedding: embedding });
      const refreshedPeople = await api.people();
      onUpdated(memorial, refreshedPeople);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face learning failed");
    } finally {
      setSaving(false);
    }
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPerson({ name: newPersonName.trim(), relationship: newPersonRel.trim() || undefined });
      const refreshedPeople = await api.people();
      onUpdated(memorial, refreshedPeople);
      setNewPersonName("");
      setNewPersonRel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-view">
      {demo && (
        <p className="demo-inline-notice" role="status">
          Demo mode — profile editing requires the local app.
        </p>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <div className="profile-header">
        <div className="profile-portrait-wrap">
          {portraitSrc ? (
            <img src={portraitSrc} alt={memorial.name} className="profile-portrait" />
          ) : (
            <div className="profile-portrait-fallback">{memorial.name.slice(0, 2)}</div>
          )}
          {!demo && (
            <label className="profile-portrait-upload">
              Change photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPortrait(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div className="profile-main">
          {!editing ? (
            <>
              <h2>{memorial.name}</h2>
              {memorial.bornAt && (
                <p className="profile-lifespan">
                  {formatDate(memorial.bornAt)}
                  {memorial.diedAt ? ` — ${formatDate(memorial.diedAt)}` : ""}
                </p>
              )}
              {memorial.tribute && <p className="profile-tribute">{memorial.tribute}</p>}
              {!demo && (
                <button type="button" className="hero-btn" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              )}
            </>
          ) : (
            <form
              className="profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                void saveProfile();
              }}
            >
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Tribute
                <textarea value={tribute} onChange={(e) => setTribute(e.target.value)} rows={4} />
              </label>
              <div className="profile-form-row">
                <label>
                  Born
                  <input type="date" value={bornAt} onChange={(e) => setBornAt(e.target.value)} />
                </label>
                <label>
                  Died
                  <input type="date" value={diedAt} onChange={(e) => setDiedAt(e.target.value)} />
                </label>
              </div>
              <div className="profile-form-actions">
                <button type="submit" className="hero-btn" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="hero-btn hero-btn--secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <section className="profile-people">
        <h3>People in this archive</h3>
        <p className="profile-people-hint">
          Tag people in photos to find every memory they appear in. Face detection helps locate faces; you confirm who they are.
        </p>
        <ul className="profile-people-list">
          {people.map((person) => (
            <li key={person.id} className={person.isSubject ? "profile-person subject" : "profile-person"}>
              <strong>{person.name}</strong>
              {person.isSubject && <span className="profile-badge">Subject</span>}
              {person.relationship && <span className="profile-rel">{person.relationship}</span>}
              {person.faceEmbedding?.length === 128 && (
                <span className="profile-badge profile-badge--face">Face learned</span>
              )}
              {!demo && person.avatarPath && (
                <button
                  type="button"
                  className="link-btn profile-learn-face"
                  disabled={saving}
                  onClick={() => void learnFaceForPerson(person)}
                >
                  Learn face from photo
                </button>
              )}
            </li>
          ))}
        </ul>
        {!demo && (
          <form
            className="profile-add-person"
            onSubmit={(e) => {
              e.preventDefault();
              void addPerson();
            }}
          >
            <input
              placeholder="Name (e.g. Maria)"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
            />
            <input
              placeholder="Relationship (optional)"
              value={newPersonRel}
              onChange={(e) => setNewPersonRel(e.target.value)}
            />
            <button type="submit" disabled={saving || !newPersonName.trim()}>
              Add person
            </button>
          </form>
        )}
      </section>

      {subject && (
        <section className="profile-about">
          <h3>About this memorial</h3>
          <dl className="profile-meta-dl">
            <dt>Created</dt>
            <dd>{formatDate(memorial.createdAt)}</dd>
            <dt>Memorial ID</dt>
            <dd className="mono">{memorial.id.slice(0, 8)}…</dd>
          </dl>
        </section>
      )}
    </div>
  );
}
