# Deploying Memorium

## GitHub Pages (static demo)

GitHub Pages serves **static files only**. The full Memorium stack (SQLite vault, file import, AI) requires running locally with `npm run poc`.

The Pages deployment is a **browse-only demo** with sample data for Rose Martinez.

### What runs on Pages vs locally

| Feature | GitHub Pages | Local (`npm run poc`) |
|---------|--------------|------------------------|
| Timeline / search | ✅ (static demo JSON) | ✅ (your vault) |
| On This Day | ✅ (client-side) | ✅ |
| Export guides | ✅ | ✅ |
| File import | ❌ | ✅ |
| AI chat | ❌ | ✅ (with API key) |
| Private data | ❌ | ✅ |

### One-time GitHub setup

1. Open **https://github.com/smolildn/memorium/settings/pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Push to `main` — the workflow `.github/workflows/pages.yml` deploys automatically

### Live URL

After the first successful deploy:

**https://smolildn.github.io/memorium/**

### Build locally (same as CI)

```bash
npm run build:pages
npx serve apps/web/dist -l 4173
# Open http://localhost:4173/memorium/
```

### How it works

1. `scripts/generate-static-demo.mjs` — embeds demo vault data into the web bundle
2. `VITE_DEMO_MODE=true` — web app uses client-side demo API instead of `/api`
3. `VITE_BASE=/memorium/` — correct asset paths for project Pages URL
4. `404.html` — copy of `index.html` for SPA routing

### Full app deployment (future)

For import + AI in production you'd need a host with Node.js persistence, e.g.:

- **Fly.io / Railway / Render** — API + persistent volume for SQLite
- **Cloudflare Workers + R2** — requires rewriting storage layer
- **Self-hosted** — Raspberry Pi or home server (fits local-first ethos)

GitHub Pages remains the best fit for a **public demo**; local install remains the best fit for **real archives**.
