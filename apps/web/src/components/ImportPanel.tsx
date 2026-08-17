import { useCallback, useEffect, useState } from "react";

import { api, isDemoMode, type ImportResult, type ImportSource } from "../api";

interface Props {
  onImported: () => void;
}

export function ImportPanel({ onImported }: Props) {
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("auto");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.importSources().then(setSources).catch(() => {});
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.import(file, selectedSource);
      setResult(res);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const selected = sources.find((s) => s.id === selectedSource);
  const guideSources = sources.filter((s) => s.id !== "auto");

  return (
    <div className="import-panel">
      <div className="import-intro">
        <h2>Import memories</h2>
        {isDemoMode() ? (
          <p className="import-hint">
            Export guides are shown below. To actually import files, clone the repo and run{" "}
            <code>npm run poc</code> locally — GitHub Pages cannot store your data.
          </p>
        ) : (
          <p>
            Upload exports from Facebook, Instagram, email, WhatsApp, Google Messages,
            Android SMS, or iPhone iMessage. Files stay on your machine.
          </p>
        )}
      </div>

      <label className="import-label" htmlFor="source-select">
        Source type
      </label>
      <select
        id="source-select"
        className="import-select"
        value={selectedSource}
        onChange={(e) => setSelectedSource(e.target.value)}
      >
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {selected && selected.id !== "auto" && (
        <div className="export-guide-inline">
          <h4>How to export from {selected.label}</h4>
          <ol className="export-steps">
            {selected.exportSteps.map((step) => (
              <li key={step} className={step.startsWith("  ") ? "sub-step" : undefined}>
                {step.trimStart()}
              </li>
            ))}
          </ol>
          {selected.exportUrl && (
            <p className="export-link">
              <a href={selected.exportUrl} target="_blank" rel="noopener noreferrer">
                Official export page →
              </a>
            </p>
          )}
          {selected.tips && selected.tips.length > 0 && (
            <ul className="export-tips">
              {selected.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {selected?.id === "auto" && (
        <p className="import-hint">{selected.description}</p>
      )}

      <div
        className={dragging ? "drop-zone active" : "drop-zone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="drop-title">
          {file ? file.name : "Drop a file here or browse"}
        </p>
        <p className="drop-sub">
          {selected?.extensions.join(", ") ?? ".zip, .xml, .json, .txt, .csv, .db, .mbox, .eml"}
        </p>
        <label className="browse-btn">
          Choose file
          <input
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                setResult(null);
                setError(null);
              }
            }}
          />
        </label>
      </div>

      <button
        type="button"
        className="import-btn"
        disabled={!file || uploading || isDemoMode()}
        onClick={() => void handleUpload()}
      >
        {isDemoMode() ? "Import requires local app" : uploading ? "Importing…" : "Import into vault"}
      </button>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="import-result">
          <h3>Import complete</h3>
          <ul>
            <li>
              <strong>{result.stored}</strong> new memories stored
            </li>
            <li>{result.duplicates} duplicates skipped</li>
            <li>Adapter: {result.adapter}</li>
            <li>Duration: {(result.durationMs / 1000).toFixed(1)}s</li>
          </ul>
          {result.errors.length > 0 && (
            <p className="import-warn">
              {result.errors.length} warning(s): {result.errors[0]}
            </p>
          )}
        </div>
      )}

      <section className="import-guide">
        <h3>Export guides for all platforms</h3>
        <div className="guide-grid">
          {guideSources.map((source) => (
            <details key={source.id} className="guide-card" open={source.id === selectedSource}>
              <summary>{source.label}</summary>
              <p className="guide-desc">{source.description}</p>
              <ol className="export-steps">
                {source.exportSteps.map((step) => (
                  <li key={step} className={step.startsWith("  ") ? "sub-step" : undefined}>
                    {step.trimStart()}
                  </li>
                ))}
              </ol>
              {source.exportUrl && (
                <p className="export-link">
                  <a href={source.exportUrl} target="_blank" rel="noopener noreferrer">
                    Official export page →
                  </a>
                </p>
              )}
              {source.tips && source.tips.length > 0 && (
                <ul className="export-tips">
                  {source.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
              <p className="guide-ext">
                Accepts: {source.extensions.join(", ")}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
