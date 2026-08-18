# Memorium

A **local-first memorial repository** that centralizes a loved one's digital life — photos, texts, emails, Facebook, Instagram — into one searchable, shareable vault with an optional AI layer for reflection and discovery.

**Live demo:** https://smolildn.github.io/memorium/

## Why Memorium?

Existing tools fall into three buckets, none of which fully solve this:

| Category | Examples | Gap |
|----------|----------|-----|
| **Commercial memorial SaaS** | E-Memory, BrainCopy, Heirloomify, Aeternum | Subscription lock-in, cloud-only, limited source control |
| **AI grief chatbots** | Kinship Memory, Lasting Memory, SayAgain | Focus on conversation, not archival/query infrastructure |
| **Open-source parsers** | Demetafy, ByeByeMeta, Memento Mori | Single-platform viewers, no unified model or sharing |

Memorium is the **infrastructure layer**: ingest everything, normalize it, query it, share it — then optionally layer AI on top.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Sources          Ingest           Vault           Surface  │
│  ───────          ──────           ─────           ───────  │
│  Facebook  ──►  MetaAdapter  ──►                              │
│  Instagram ──►  MetaAdapter  ──►  SQLite +     ──►  CLI     │
│  Email     ──►  EmailAdapter ──►  media files  ──►  REST API │
│  SMS/iMsg  ──►  SmsAdapter   ──►  embeddings   ──►  Web UI │
│  Photos    ──►  ImageAdapter ──►               ──►  Share links│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  AI Layer (opt.) │
                    │  embed · RAG · Q │
                    └──────────────────┘
```

## Quick start (local)

```bash
git clone https://github.com/smolildn/memorium.git
cd memorium
npm install
npm run build
npm run poc
```

Open **http://127.0.0.1:5173** — browse the demo vault, import your own exports, or ask questions with AI.

### Import via web UI

1. Open the **Import** tab
2. Choose source (or Auto-detect)
3. Drop or browse for your export file
4. Click **Import into vault**

### Import via CLI

```bash
npm run cli -- seed-demo --reset   # Load demo data
npm run cli -- import meta ./downloads/facebook-instagram-export.zip
npm run cli -- import email ./archives/inbox.mbox
npm run cli -- search "birthday party 2019"
```

## Local deployment guide

Memorium is designed to run **entirely on your machine**. Nothing leaves your computer unless you configure cloud AI or share a read-only link.

### 1. Prerequisites

- **Node.js 20+** and npm
- **Optional — local AI:** [Ollama](https://ollama.com) with models such as `llama3.2` and `nomic-embed-text`
- **Optional — cloud AI:** OpenAI API key

### 2. Environment variables

Create a `.env` file in the project root (or export in your shell):

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEMORIUM_VAULT_PATH` | `./data/vault` | SQLite vault + media directory |
| `MEMORIUM_API_HOST` | `127.0.0.1` | API bind address (keep local unless you know what you're doing) |
| `MEMORIUM_API_PORT` | `3847` | API port |
| `MEMORIUM_API_TOKEN` | *(unset)* | Bearer token for write access (import, chat, share creation) |
| `MEMORIUM_MAX_UPLOAD_MB` | `100` | Max upload size for imports |
| `OPENAI_API_KEY` | *(unset)* | Cloud AI (embeddings + chat) |
| `MEMORIUM_AI_PROVIDER` | *(auto)* | Set to `ollama` for fully local AI |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama server URL |
| `MEMORIUM_EMBEDDING_MODEL` | `text-embedding-3-small` / `nomic-embed-text` | Embedding model |
| `MEMORIUM_CHAT_MODEL` | `gpt-4o-mini` / `llama3.2` | Chat model |
| `VITE_API_BASE` | `/api` | Web UI → API URL (dev proxy handles this) |
| `VITE_API_TOKEN` | *(unset)* | Send bearer token from the web UI when API auth is enabled |

### 3. Run the full stack

```bash
npm run poc
```

This starts:

- **API** at http://127.0.0.1:3847
- **Web UI** at http://127.0.0.1:5173

Or run services separately:

```bash
npm run dev:api    # API only
npm run dev:web    # Web UI only
```

### 4. Initialize your own vault

```bash
npm run cli -- init --name "Jane Doe"
npm run cli -- import meta ./path/to/export.zip
```

### 5. Local AI with Ollama

```bash
ollama pull llama3.2
ollama pull nomic-embed-text

export MEMORIUM_AI_PROVIDER=ollama
npm run cli -- index-ai
npm run poc
```

Open the **Ask** tab in the web UI, or use the CLI:

```bash
npm run cli -- ask "What did she love to cook?"
```

### 6. Secure the API (recommended for LAN sharing)

When exposing the API beyond localhost, set a bearer token:

```bash
export MEMORIUM_API_TOKEN="your-long-random-secret"
export VITE_API_TOKEN="your-long-random-secret"
npm run poc
```

Write operations (import, chat, share creation) require the token. Read-only browsing can use **share tokens** instead (see below).

### 7. Share read-only access with family

Create a 30-day read-only link from the API:

```bash
curl -X POST http://127.0.0.1:3847/share \
  -H "Authorization: Bearer $MEMORIUM_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Family view"}'
```

Share the returned URL (includes `?token=...`). Recipients can browse memories without import or write access. The web UI stores the token in session storage automatically.

### 8. Export your archive

```bash
# JSON bundle (ZIP)
npm run cli -- export -o ./memorium-export.zip

# ZIP + print-ready HTML book
npm run cli -- export -o ./memorium-export.zip --html ./memorial-book.html
```

Open `memorial-book.html` in a browser and print to PDF for a physical keepsake.

### 9. Preview the GitHub Pages build locally

```bash
npm run build:pages
npm run preview:pages
# Open http://127.0.0.1:4173/memorium/
```

## Deploy to GitHub Pages

The web UI can be deployed as a **static demo** (browse sample data + export guides). Import and AI require the local app.

1. Enable **GitHub Actions** as Pages source in repo Settings → Pages
2. Push to `main` — CI deploys automatically
3. Live at **https://smolildn.github.io/memorium/**

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment details.

## Roadmap

Memorium separates **three profile concepts** so the UI stays clear:

| Concept | Purpose | Status |
|---------|---------|--------|
| **Memorial subject** | The person being remembered (name, dates, tribute, portrait) | Hero header today; full profile page planned |
| **People in the archive** | Family and friends who appear in photos and messages | Schema ready (`people`, `personIds`); CRUD + tagging planned |
| **Vault operator** | You, managing imports and settings | Local-first; no cloud account required |

### Phased delivery

```
Upload / photo bump ──► Ingest + EXIF ──► Photos tab + filters ──► Tags + people ──► Face assist (opt-in)
```

#### Phase 1 — Profile + photos foundation

- Memorial profile page (edit name, dates, tribute, portrait)
- People registry (add relatives, relationships, avatars)
- **Photos** tab — grid, lightbox, filter by date / source / tag
- Web **photo bump** (single upload + caption) and bulk photo upload
- EXIF extraction on ingest (date, GPS, camera)
- Normalize media into the vault and serve via the API

**Deploy:** standard local stack (`npm run poc`). No AI required.

#### Phase 2 — Tagging and person links

- Manual person tags on any memory (“who is in this photo?”)
- Tag taxonomy (events, places, themes)
- Filter timeline and gallery by person or tag
- Wire `personIds` into search (schema already supports this)

**Deploy:** local stack only. Optional AI for tag *suggestions* via the wrapper (see below).

#### Phase 3 — Face assist (opt-in)

- Face **detection** in the browser (bounding boxes, no identity yet)
- Manual assignment to a person in the registry
- Optional **local** recognition suggestions after enough labeled examples
- Consent UI: face matching runs on-device; nothing leaves the machine unless cloud AI is enabled

**Deploy:** browser-local ML (e.g. face-api.js / MediaPipe) by default. Cloud vision APIs only with explicit opt-in.

#### Phase 4 — Polish

- Per-person photo grids (“all photos with Maria”)
- Bulk re-tag and merge duplicate people
- Person-specific album export (HTML / print)

**Deploy:** same as Phase 1–2; export uses existing `memorium export --html`.

### Design constraints (memorial context)

- **Never auto-publish face labels** — human confirmation required
- **Living vs deceased** — optional restrictions when sharing read-only links
- **Share tokens** — read-only; no unconfirmed face suggestions exposed
- **Profile tone** — tribute archive, not a social network

---

## AI wrapper

The `@memorium/ai` package is an **optional layer** on top of the vault. Search, timeline, import, and export work without it. When enabled, a single provider interface powers embeddings, semantic search, and memorial chat.

### How the wrapper resolves a provider

```
resolveProviderFromEnv()
    │
    ├─ MEMORIUM_AI_PROVIDER=ollama ──► OllamaProvider (local)
    │
    └─ else OPENAI_API_KEY set ──────► OpenAIProvider (cloud)
```

| Component | Role |
|-----------|------|
| `resolveProviderFromEnv()` | Picks Ollama or OpenAI from env (`packages/ai/src/providers/factory.ts`) |
| `indexVault()` | Chunks memories, calls `provider.embed()`, stores vectors in SQLite |
| `semanticSearch()` | Embeds the question, cosine-similarity against stored vectors |
| `MemorialChat` | RAG chat with citations over retrieved memories |

Used by: **CLI** (`index-ai`, `ask`), **API** (`POST /chat`), and (roadmap) tag/ caption suggestions.

### Deployment by AI mode

| Mode | When to use | Setup | Data leaves machine? |
|------|-------------|-------|----------------------|
| **No AI** | Browse, import, FTS search, export only | `npm run poc` — no extra env | No |
| **Ollama (local)** | Private memorial chat + semantic search at home | Install [Ollama](https://ollama.com), pull models, set `MEMORIUM_AI_PROVIDER=ollama`, run `index-ai` | No |
| **OpenAI (cloud)** | Best quality chat/embeddings when local GPU is unavailable | Set `OPENAI_API_KEY`, run `index-ai` | Yes — text chunks sent for embed/chat |
| **Hybrid (future)** | Local vault + cloud only for Ask tab | Vault local; `OPENAI_API_KEY` for chat only | Partial |

### End-to-end deploy with AI enabled

**1. Base stack (always local)**

```bash
npm install && npm run build
npm run cli -- init --name "Jane Doe"    # or seed-demo / import
npm run poc
```

**2. Enable local AI (recommended for real archives)**

```bash
ollama pull llama3.2
ollama pull nomic-embed-text

export MEMORIUM_AI_PROVIDER=ollama
export MEMORIUM_EMBEDDING_MODEL=nomic-embed-text
export MEMORIUM_CHAT_MODEL=llama3.2

npm run cli -- index-ai    # one-time (re-run after large imports)
npm run poc
```

**3. Enable cloud AI (alternative)**

```bash
export OPENAI_API_KEY=sk-...
export MEMORIUM_EMBEDDING_MODEL=text-embedding-3-small
export MEMORIUM_CHAT_MODEL=gpt-4o-mini

npm run cli -- index-ai
npm run poc
```

**4. Secure LAN or family sharing with AI**

```bash
export MEMORIUM_API_HOST=0.0.0.0          # listen on LAN (use with care)
export MEMORIUM_API_TOKEN=<long-secret>
export VITE_API_TOKEN=<long-secret>
# Keep AI provider vars from step 2 or 3
npm run poc
```

Family read-only links use share tokens (`POST /share`); AI chat still requires the bearer token and your configured provider.

**5. GitHub Pages (demo only — no AI, no vault)**

Pages serves static demo JSON. Import, photo bump, indexing, and Ask require the local stack above.

### AI wrapper and roadmap phases

| Phase | AI wrapper role |
|-------|-----------------|
| Phase 1 (photos) | Not required; EXIF and media are ingest/storage |
| Phase 2 (tags) | Optional: suggest tags or people names from caption text via `MemorialChat`-style prompts |
| Phase 3 (faces) | **Default: browser-local** detection/recognition — not the OpenAI/Ollama wrapper |
| Phase 3 (opt-in cloud) | Optional vision API behind the same provider interface for higher-accuracy suggestions |
| Phase 4 (export) | Optional: AI-generated chapter intros in HTML export |

Face recognition is intentionally **separate** from the chat/embed wrapper so photos never leave the device unless you explicitly opt into cloud vision.

### Environment reference (AI)

| Variable | Ollama example | OpenAI example |
|----------|----------------|----------------|
| `MEMORIUM_AI_PROVIDER` | `ollama` | *(unset)* |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | — |
| `OPENAI_API_KEY` | — | `sk-...` |
| `MEMORIUM_EMBEDDING_MODEL` | `nomic-embed-text` | `text-embedding-3-small` |
| `MEMORIUM_CHAT_MODEL` | `llama3.2` | `gpt-4o-mini` |

After changing provider or model, re-run `npm run cli -- index-ai` so embeddings match the active model.

## Project structure

```
memorium/
├── packages/
│   ├── core/       Shared types, schemas, source contracts
│   ├── ingest/     Source adapters (Meta, email, SMS, images)
│   ├── storage/    SQLite vault + media file management
│   ├── query/      Full-text search, filters, timelines
│   ├── ai/         Embeddings, RAG, memorial chat (optional)
│   └── demo/       Sample Rose Martinez archive
├── apps/
│   ├── cli/        Command-line import & search
│   ├── api/        Local REST API for web UI and sharing
│   └── web/        React memorial browser
└── docs/
    ├── ARCHITECTURE.md
    └── DEPLOYMENT.md
```

## Data sources supported

| Source | Status | Notes |
|--------|--------|-------|
| Facebook export (JSON) | ✅ | Meta "Download Your Information" |
| Instagram export (JSON) | ✅ | Same Meta export bundle |
| Email (.mbox, .eml) | ✅ | Gmail Takeout, Apple Mail |
| WhatsApp | ✅ | `.txt` chat export |
| Android SMS | ✅ | SMS Backup & Restore `.xml` |
| Google Messages | ✅ | Takeout JSON |
| iPhone iMessage | ✅ | `chat.db` or CSV export |
| Raw photos/videos | ✅ Framework | Folder ingest; EXIF + vault media copy on roadmap |
| Google Photos | 🔲 Planned | Takeout JSON + media |

## Privacy principles

1. **Local-first** — data stays on your machine by default
2. **No lock-in** — export the full vault as JSON + media at any time
3. **Opt-in AI** — embeddings and chat require explicit configuration
4. **Role-based sharing** — family members get viewer/contributor/admin roles (roadmap)
5. **Consent-aware** — designed for posthumous archives; document provenance

## License

MIT
