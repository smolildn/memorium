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

## Profile & Photos

Memorium separates **three profile concepts**:

| Concept | Where | What you can do |
|---------|--------|-----------------|
| **Memorial subject** | Profile tab + hero | Edit name, dates, tribute, portrait |
| **People in the archive** | Profile tab | Add family/friends; learn faces from portraits |
| **Vault operator** | Local install | Import, upload, tag — no cloud account |

### Photos tab

- **Photo bump** — drag-and-drop or file picker for quick uploads
- **Bulk upload** — select many files at once; EXIF date/GPS/camera extracted automatically
- **Gallery filters** — year, tag, person
- **Detail panel** — tags, people checkboxes, CSS filter previews, face boxes
- **Scan archive for faces** — batch-detect and suggest names across unscanned photos

Photos are copied into `media/photos/` in your vault and served locally via the API.

### Profile tab

- Edit memorial subject (name, tribute, lifespan)
- Upload portrait
- Register people (Maria, James, …) with relationships
- **Learn face from photo** — stores a 128-d reference embedding on the person record for recognition

---

## Facial recognition

Face matching runs **entirely in your browser** using [@vladmandic/face-api](https://github.com/vladmandic/face-api). No photo data is sent to OpenAI, Ollama, or any cloud API unless you separately enable cloud vision (not implemented by default).

### How it works

```
Portrait / labeled faces ──► 128-d embeddings ──► Local gallery
                                                        │
New photo ──► SSD detect ──► landmarks ──► descriptor ──┼──► Match (euclidean ≤ 0.6)
                                                        │
                                              Human confirms ──► Saved to vault
```

1. **Detection** — SSD MobileNet finds face bounding boxes in the photo.
2. **Descriptor** — a 128-number embedding captures facial identity (not stored off-device).
3. **Gallery** — built from:
   - People with **Learn face from photo** on their portrait
   - Faces you manually labeled and saved in other photos
4. **Suggestion** — new faces are compared to the gallery; matches pre-fill the person dropdown.
5. **Confirmation** — labels are never auto-published; you review and click **Save changes**.

Embeddings are stored in the vault as:

- `people.face_embedding` — reference portrait for each person
- `memory_items.metadata.faces[].embedding` — per-face descriptors on photos

### Setup (one-time)

Models (~10 MB) are copied into the web app on `npm install`:

```bash
npm install
node scripts/setup-face-models.mjs   # runs automatically via postinstall
```

Models live at `apps/web/public/face-models/` and load from your own origin — works offline after the first load.

**Browser support:** Chrome or Edge recommended (WebGL + WASM). Falls back to the native `FaceDetector` API if face-api models fail to load (detection only, no cross-photo matching).

### Using recognition

**Teach the system who someone is**

1. Profile → upload a clear front-facing portrait for Rose (or any person)
2. Click **Learn face from photo** — stores their reference embedding
3. Optionally label a few photos manually and save — each labeled face adds to the gallery

**Detect on one photo**

1. Photos → open a photo → **Detect faces**
2. Review suggested names and match scores
3. Adjust if needed → **Save changes**

**Scan the whole archive**

1. Photos → **Scan archive for faces**
2. Unscanned photos are processed locally; suggestions are written to the vault
3. Open individual photos to confirm or correct

### Match threshold

Default maximum euclidean distance: **0.6** (`FACE_MATCH_THRESHOLD` in `apps/web/src/utils/faceRecognition.ts`). Lower = stricter matching. The UI shows `(match 0.XX)` as `1 - distance` for readability.

### Privacy & memorial context

- All inference is **on-device** — appropriate for sensitive family archives
- **Never auto-publish** face labels to shared links without human review
- Share tokens expose read-only data; face suggestions require the local write API
- Living family members: confirm labels before sharing externally

### Facial recognition — improvements roadmap

| Improvement | Status | Notes |
|-------------|--------|-------|
| Browser face detection (FaceDetector API) | ✅ Shipped | Fallback when ML models unavailable |
| Embedding-based matching (face-api) | ✅ Shipped | 128-d descriptors + gallery |
| Portrait reference learning | ✅ Shipped | Profile → Learn face from photo |
| Batch archive scan | ✅ Shipped | Photos → Scan archive for faces |
| Persist embeddings in vault | ✅ Shipped | `face_embedding` + `metadata.faces` |
| Manual face regions | ✅ Shipped | Add region when detection misses |
| Cross-photo person filter | ✅ Shipped | Photos tab + face/personIds |
| **Higher-accuracy models** | 🔲 Planned | TinyFace / RetinaFace for old/scanned prints |
| **GPU batch indexing** | 🔲 Planned | WebWorker pipeline for large archives (10k+ photos) |
| **Merge duplicate people** | 🔲 Planned | Combine Maria + Maria G. with face cluster hints |
| **Age-aware matching** | 🔲 Planned | Weight matches by decade (child vs adult photos) |
| **Living-person consent flags** | 🔲 Planned | Hide face boxes on shared links until approved |
| **Cloud vision opt-in** | 🔲 Planned | Optional OpenAI/Google vision behind same UI, explicit toggle |
| **CLI face index** | 🔲 Planned | `memorium index-faces` for headless vaults on a home server |
| **Per-person album export** | 🔲 Planned | `memorium export --person Maria --html` |

Face recognition is intentionally **separate from the chat/embed AI wrapper** (`@memorium/ai`) so photos never leave the device unless you explicitly opt into cloud vision in a future release.

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
| Photos & tags | Not required; EXIF and media are ingest/storage |
| Tag suggestions | Optional: suggest tags from caption text via `MemorialChat` |
| Face recognition | **Separate** — browser-local face-api, not OpenAI/Ollama |
| Export | Optional: AI chapter intros in HTML export (planned) |

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
| Raw photos/videos | ✅ | Web upload + EXIF; vault media copy |
| Google Photos | 🔲 Planned | Takeout JSON + media |

## Privacy principles

1. **Local-first** — data stays on your machine by default
2. **No lock-in** — export the full vault as JSON + media at any time
3. **Opt-in AI** — embeddings and chat require explicit configuration
4. **Role-based sharing** — family members get viewer/contributor/admin roles (roadmap)
5. **Consent-aware** — designed for posthumous archives; document provenance

## License

MIT
