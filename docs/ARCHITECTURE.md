# Memorium Architecture

## Design goals

1. **Source-agnostic core** — every piece of content becomes a normalized `MemoryItem`
2. **Local-first vault** — SQLite index + filesystem media store; no cloud required
3. **Pluggable ingest** — each platform is an adapter implementing `SourceAdapter`
4. **Queryable by default** — FTS5 full-text search, timeline views, person tags
5. **AI as a layer** — embeddings and RAG sit on top; vault works without them
6. **Shareable** — export bundles, read-only share tokens, family roles

## Core data model

```
Memorial (vault)
  └── Person (the loved one, + tagged people in photos)
  └── MemoryItem (atomic unit of content)
        ├── type: post | message | email | photo | video | note | story
        ├── source: meta_facebook | meta_instagram | email | sms | manual
        ├── occurredAt: ISO timestamp
        ├── text: searchable body
        ├── mediaRefs: paths into vault media store
        ├── metadata: source-specific JSON
        └── people: tagged person IDs
  └── Embedding (optional, for semantic search)
  └── ShareGrant (family access tokens)
```

## Ingest pipeline

```
Export file(s)
    │
    ▼
SourceAdapter.detect()     ── Can this adapter handle this input?
    │
    ▼
SourceAdapter.parse()      ── Stream raw records from export
    │
    ▼
SourceAdapter.normalize()  ── Map each record → MemoryItem[]
    │
    ▼
Vault.store()              ── Dedupe, copy media, index text
    │
    ▼
AI.index() [optional]      ── Chunk, embed, store vectors
```

## Source adapters

### MetaAdapter (Facebook + Instagram)

Handles Meta's "Download Your Information" JSON export:
- `your_posts__check_ins__photos_and_videos_*.json`
- `message_*.json` (Messenger)
- `photos/` and `videos/` directories
- Instagram `content/` and `media/` folders

Reference implementations: [Demetafy](https://github.com/judicael-s/Demetafy), [ByeByeMeta](https://github.com/rubillos/ByeByeMeta)

### EmailAdapter

- `.mbox` files (Gmail Takeout, Thunderbird)
- Directories of `.eml` files
- Extracts: from, to, subject, body (text/html), date, attachments

### SmsAdapter (planned)

- iMessage: `chat.db` export or SMS Backup & Restore XML
- Android: SMS Backup & Restore XML/JSON

### ImageAdapter

- Walk a folder of photos/videos
- Extract EXIF date, GPS, camera info
- Generate thumbnails

## Storage layout

```
data/vault/
├── vault.db              SQLite (items, people, FTS, embeddings)
├── media/
│   ├── photos/
│   ├── videos/
│   └── attachments/
├── exports/              Generated share bundles
└── config.json           Memorial metadata
```

## Query layer

- **Full-text search** — SQLite FTS5 over `text` + `title` fields
- **Timeline** — filter by date range, source, type
- **People** — filter by tagged person
- **Semantic search** (AI) — cosine similarity over stored embeddings
- **"On this day"** — memories matching month/day across years

## AI layer

Three modes, all optional:

| Mode | Use case | Implementation |
|------|----------|----------------|
| **Semantic search** | "Find messages about the beach house" | Embed items → vector search |
| **Summarization** | "Summarize 2019" | RAG over date-filtered items |
| **Memorial chat** | Reflective Q&A grounded in their words | RAG + system prompt with consent guardrails |

AI never impersonates. Responses are grounded in retrieved source material with citations.

## Sharing model

```
ShareGrant
  ├── token: UUID (read-only URL)
  ├── role: viewer | contributor | admin
  ├── expiresAt: optional
  └── scope: all | dateRange | sources[]
```

Export bundles are self-contained ZIPs: `index.html` + media + JSON manifest. Hostable anywhere.

## Tech stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Runtime | Node.js 20+ | Cross-platform, good for file I/O |
| Language | TypeScript | Type safety across packages |
| Database | SQLite + FTS5 | Local-first, zero-config, portable |
| Validation | Zod | Runtime schema checks on ingest |
| CLI | Commander | Standard, composable |
| API | Hono | Lightweight, fast, TypeScript-native |
| AI | OpenAI API (pluggable) | Embeddings + chat; swap for Ollama/local |
| Monorepo | npm workspaces | Simple, no extra tooling |

## Feasibility assessment

| Component | Effort | Risk |
|-----------|--------|------|
| Meta export parsing | Medium | Meta changes export format occasionally |
| Email parsing | Low | Well-documented formats |
| SMS/iMessage | Medium-High | Platform-specific, credential access |
| Local vault + search | Low | SQLite FTS5 is battle-tested |
| Web UI | Medium | Standard CRUD + timeline view |
| AI semantic search | Low-Medium | Embedding API + sqlite-vec or brute-force |
| Memorial chat | Medium | Prompt engineering + consent UX |
| Family sharing | Medium | Auth tokens, export bundles |

**Overall: highly feasible as a self-hosted/local tool.** The hardest parts are (1) getting exports before accounts are memorialized/deleted, and (2) SMS access on iOS. Everything else has prior art.

## Competitive positioning

Memorium is **not** trying to be another grief chatbot or subscription memorial page. It's:

> **The open, local-first infrastructure** that ingests every format, normalizes it, makes it searchable, and optionally powers AI — without lock-in.

Build the vault first. Layer AI second. Share when ready.
