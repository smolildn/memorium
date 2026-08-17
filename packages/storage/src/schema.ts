export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS memorials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject_person_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  vault_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT,
  is_subject INTEGER NOT NULL DEFAULT 0,
  avatar_path TEXT,
  born_at TEXT,
  died_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  memorial_id TEXT NOT NULL REFERENCES memorials(id),
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  title TEXT,
  text TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  person_ids TEXT NOT NULL DEFAULT '[]',
  media_refs TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_items_occurred ON memory_items(occurred_at);
CREATE INDEX IF NOT EXISTS idx_items_type ON memory_items(type);
CREATE INDEX IF NOT EXISTS idx_items_source ON memory_items(source);
CREATE INDEX IF NOT EXISTS idx_items_memorial ON memory_items(memorial_id);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS memory_items_fts USING fts5(
  item_id UNINDEXED,
  title,
  text,
  content='',
  contentless_delete=1
);

CREATE TRIGGER IF NOT EXISTS memory_items_ai AFTER INSERT ON memory_items BEGIN
  INSERT INTO memory_items_fts(item_id, title, text)
  VALUES (new.id, COALESCE(new.title, ''), new.text);
END;

CREATE TRIGGER IF NOT EXISTS memory_items_ad AFTER DELETE ON memory_items BEGIN
  INSERT INTO memory_items_fts(memory_items_fts, item_id, title, text)
  VALUES ('delete', old.id, COALESCE(old.title, ''), old.text);
END;

-- Embeddings for semantic search (optional AI layer)
CREATE TABLE IF NOT EXISTS embeddings (
  item_id TEXT PRIMARY KEY REFERENCES memory_items(id),
  model TEXT NOT NULL,
  vector BLOB NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS share_grants (
  id TEXT PRIMARY KEY,
  memorial_id TEXT NOT NULL REFERENCES memorials(id),
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);
`;
