# Memorium

A **local-first memorial repository** that centralizes a loved one's digital life — photos, texts, emails, Facebook, Instagram — into one searchable, shareable vault with an optional AI layer for reflection and discovery.

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

## Deploy to GitHub Pages

The web UI can be deployed as a **static demo** (browse sample data + export guides). Import and AI require the local app.

1. Enable **GitHub Actions** as Pages source in repo Settings → Pages
2. Push to `main` — CI deploys automatically
3. Live at **https://smolildn.github.io/memorium/**

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Quick start (POC)

```bash
npm install
npm run build
npm run poc
```

Open **http://127.0.0.1:5173** — use the **Import** tab to upload exports, or browse the demo timeline.

### Import via web UI

1. Open the **Import** tab
2. Choose source (or Auto-detect)
3. Drop or browse for your export file
4. Click **Import into vault**

### Import via CLI
npm run cli -- seed-demo --reset   # Load demo data
npm run dev:api                    # API on :3847
npm run dev:web                    # UI on :5173
```

## Quick start (your own data)

# Import a Meta (Facebook/Instagram) export ZIP
npm run cli -- import meta ./downloads/facebook-instagram-export.zip

# Import email archive (.mbox or folder of .eml)
npm run cli -- import email ./archives/inbox.mbox

# Search the vault
npm run cli -- search "birthday party 2019"

# Start the local API (for web UI / family sharing)
npm run dev
```

## Project structure

```
memorium/
├── packages/
│   ├── core/       Shared types, schemas, source contracts
│   ├── ingest/     Source adapters (Meta, email, SMS, images)
│   ├── storage/    SQLite vault + media file management
│   ├── query/      Full-text search, filters, timelines
│   └── ai/         Embeddings, RAG, memorial chat (optional)
├── apps/
│   ├── cli/        Command-line import & search
│   └── api/        Local REST API for web UI and sharing
└── docs/
    └── ARCHITECTURE.md
```

## Data sources supported (roadmap)

| Source | Status | Notes |
|--------|--------|-------|
| Facebook export (JSON) | ✅ Framework | Meta "Download Your Information" |
| Instagram export (JSON) | ✅ Framework | Same Meta export bundle |
| Email (.mbox, .eml) | ✅ Framework | Gmail Takeout, Apple Mail |
| SMS / iMessage | 🔲 Planned | Requires platform-specific export |
| WhatsApp | ✅ | `.txt` chat export |
| Android SMS | ✅ | SMS Backup & Restore `.xml` |
| Google Messages | ✅ | Takeout JSON |
| iPhone iMessage | ✅ | `chat.db` or CSV export |
| Google Photos | 🔲 Planned | Takeout JSON + media |
| Raw photos/videos | ✅ Framework | EXIF date extraction |

## Privacy principles

1. **Local-first** — data stays on your machine by default
2. **No lock-in** — export the full vault as JSON + media at any time
3. **Opt-in AI** — embeddings and chat require explicit API key configuration
4. **Role-based sharing** — family members get viewer/contributor/admin roles
5. **Consent-aware** — designed for posthumous archives; document provenance

## License

MIT
