# Deploying Memorium

Memorium has two deployment modes:

1. **Local (recommended for real archives)** — full SQLite vault, import, AI, and family sharing on your machine or home server
2. **GitHub Pages (public demo)** — static browse-only demo with sample data

---

## Local deployment

### System requirements

| Requirement | Notes |
|-------------|-------|
| Node.js 20+ | LTS recommended |
| ~500 MB disk | Grows with media imports |
| Optional: Ollama | Fully local AI without cloud keys |
| Optional: OpenAI key | Cloud embeddings + chat |

### Install

```bash
git clone https://github.com/smolildn/memorium.git
cd memorium
npm install
npm run build
```

### Start the app

```bash
npm run poc
```

| Service | URL | Description |
|---------|-----|-------------|
| Web UI | http://127.0.0.1:5173 | Memorial browser |
| API | http://127.0.0.1:3847 | REST backend |

### Configure via environment

All settings are optional. Defaults keep everything on localhost with no auth.

```bash
# .env example
MEMORIUM_VAULT_PATH=./data/vault
MEMORIUM_API_HOST=127.0.0.1
MEMORIUM_API_PORT=3847

# Optional: protect write endpoints
MEMORIUM_API_TOKEN=change-me-to-a-long-random-string
VITE_API_TOKEN=change-me-to-a-long-random-string

# Optional: local AI (Ollama)
MEMORIUM_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
MEMORIUM_EMBEDDING_MODEL=nomic-embed-text
MEMORIUM_CHAT_MODEL=llama3.2

# Optional: cloud AI (OpenAI)
OPENAI_API_KEY=sk-...
MEMORIUM_EMBEDDING_MODEL=text-embedding-3-small
MEMORIUM_CHAT_MODEL=gpt-4o-mini
```

### Vault lifecycle

```bash
# Create a new memorial
npm run cli -- init --name "Rose Martinez"

# Load demo data (POC)
npm run cli -- seed-demo --reset

# Import platform exports
npm run cli -- import meta ./exports/facebook.zip
npm run cli -- import whatsapp ./exports/chat.txt

# Index for semantic search (after AI is configured)
npm run cli -- index-ai

# Export everything
npm run cli -- export -o backup.zip --html memorial-book.html
```

The vault directory contains:

- `vault.db` — SQLite database (memories, FTS index, embeddings, share tokens)
- `media/` — copied photos and attachments from imports

**Back up** the entire vault directory regularly. Copy it to external storage or cloud backup of your choice.

### AI providers

#### Ollama (fully local)

1. Install [Ollama](https://ollama.com)
2. Pull models: `ollama pull llama3.2` and `ollama pull nomic-embed-text`
3. Set `MEMORIUM_AI_PROVIDER=ollama`
4. Run `npm run cli -- index-ai` then use the **Ask** tab or `memorium ask`

#### OpenAI (cloud)

1. Set `OPENAI_API_KEY`
2. Run `npm run cli -- index-ai`
3. Chat works via web UI or CLI

You can switch providers; re-run `index-ai` after changing embedding models.

### API security

By default the API binds to `127.0.0.1` only — not reachable from other devices on your network.

To share on a home LAN:

1. Set `MEMORIUM_API_HOST=0.0.0.0` (listens on all interfaces)
2. Set `MEMORIUM_API_TOKEN` and `VITE_API_TOKEN` to the same secret
3. Use your machine's LAN IP instead of localhost in the browser
4. Consider a reverse proxy (nginx, Caddy) with HTTPS for anything beyond trusted home networks

**Never expose an unauthenticated Memorium API to the public internet.**

### Share tokens (read-only family access)

Create a time-limited read-only token:

```bash
curl -X POST http://127.0.0.1:3847/share \
  -H "Authorization: Bearer $MEMORIUM_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Cousins"}'
```

Response includes a URL like `http://127.0.0.1:3847?token=abc123`. For the web UI, open:

```
http://127.0.0.1:5173/?token=abc123
```

Share tokens allow **GET** requests only (browse, search, timeline). Import, chat, and new share creation still require the bearer token.

Tokens expire after 30 days (stored in the local vault).

### Running as a background service

For a home server or Raspberry Pi, use a process manager:

**systemd example** (`/etc/systemd/system/memorium.service`):

```ini
[Unit]
Description=Memorium API
After=network.target

[Service]
Type=simple
User=memorium
WorkingDirectory=/opt/memorium
Environment=MEMORIUM_VAULT_PATH=/var/lib/memorium/vault
Environment=MEMORIUM_API_TOKEN=your-secret
ExecStart=/usr/bin/node apps/api/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Build the web UI once and serve `apps/web/dist` with any static file server, or keep using `npm run dev:web` during development.

---

## GitHub Pages (static demo)

GitHub Pages serves **static files only**. The full Memorium stack (SQLite vault, file import, AI) requires running locally with `npm run poc`.

The Pages deployment is a **browse-only demo** with sample data for Rose Martinez.

### What runs on Pages vs locally

| Feature | GitHub Pages | Local (`npm run poc`) |
|---------|--------------|------------------------|
| Timeline / search | ✅ (static demo JSON) | ✅ (your vault) |
| On This Day | ✅ (client-side) | ✅ |
| Places map | ✅ (demo coordinates) | ✅ (EXIF / metadata) |
| Instagram grid | ✅ | ✅ |
| Export guides | ✅ | ✅ |
| File import | ❌ | ✅ |
| AI chat | ❌ | ✅ (with API key or Ollama) |
| Share tokens | ❌ | ✅ |
| Private data | ❌ | ✅ |

### One-time GitHub setup

1. Open **https://github.com/smolildn/memorium/settings/pages**
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**
3. Set branch to **gh-pages** and folder to **/** (root)
4. Push to `main` — the workflow `.github/workflows/pages.yml` deploys automatically

### Live URL

After the first successful deploy:

**https://smolildn.github.io/memorium/**

### Build locally (same as CI)

```bash
npm run build:pages
npm run preview:pages
# Open http://127.0.0.1:4173/memorium/
```

### How the static demo works

1. `scripts/generate-static-demo.mjs` — embeds demo vault data into the web bundle
2. `VITE_DEMO_MODE=true` — web app uses client-side demo API instead of `/api`
3. `VITE_BASE=/memorium/` — correct asset paths for project Pages URL
4. `404.html` — copy of `index.html` for SPA routing

---

## Choosing a deployment model

| Use case | Recommendation |
|----------|----------------|
| Public demo / portfolio | GitHub Pages |
| Personal memorial archive | Local (`npm run poc`) |
| Family sharing at home | Local + share tokens + optional LAN |
| Always-on home server | systemd + static web build |
| Managed cloud host | Fly.io / Railway with persistent volume (requires manual setup) |

GitHub Pages remains the best fit for a **public demo**; local install remains the best fit for **real archives**.
