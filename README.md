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
| Raw photos/videos | ✅ | EXIF date extraction |
| Google Photos | 🔲 Planned | Takeout JSON + media |

## Privacy principles

1. **Local-first** — data stays on your machine by default
2. **No lock-in** — export the full vault as JSON + media at any time
3. **Opt-in AI** — embeddings and chat require explicit configuration
4. **Role-based sharing** — family members get viewer/contributor/admin roles (roadmap)
5. **Consent-aware** — designed for posthumous archives; document provenance

## License

MIT
