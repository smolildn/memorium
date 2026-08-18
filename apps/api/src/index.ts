import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { MemorialChat, resolveProviderFromEnv, semanticSearch } from "@memorium/ai";
import { SearchQuerySchema, generateId, nowIso, type Person } from "@memorium/core";
import { IMPORT_SOURCES, ingestPhotoUpload, runIngest, saveUpload } from "@memorium/ingest";
import { listItems, onThisDay, search, stats, timeline } from "@memorium/query";
import { Vault, resolveVaultMediaPath, storeVaultMedia } from "@memorium/storage";

import { authMiddleware, getMaxUploadBytes, setShareValidator } from "./middleware.js";

const VAULT_PATH = resolve(process.env.MEMORIUM_VAULT_PATH ?? "./data/vault");
const PORT = parseInt(process.env.MEMORIUM_API_PORT ?? "3847", 10);
const HOST = process.env.MEMORIUM_API_HOST ?? "127.0.0.1";

const app = new Hono();
app.use("*", cors());
app.use("*", authMiddleware);

setShareValidator((token) => {
  const vault = Vault.open(VAULT_PATH);
  const valid = vault.isShareTokenValid(token);
  vault.close();
  return valid;
});

function getVault(): Vault {
  return Vault.open(VAULT_PATH);
}

function memorialPayload(vault: Vault) {
  const memorial = vault.getMemorial();
  if (!memorial) return null;
  const person = vault.getSubjectPerson();
  return {
    id: memorial.id,
    name: memorial.name,
    description: memorial.description,
    createdAt: memorial.createdAt,
    bornAt: person?.bornAt,
    diedAt: person?.diedAt,
    tribute: memorial.description,
    portraitPath: person?.avatarPath,
  };
}

app.get("/", (c) => {
  return c.json({
    name: "Memorium API",
    version: "0.1.0",
    endpoints: [
      "GET /memorial",
      "GET /items",
      "GET /search?q=",
      "GET /timeline",
      "GET /today",
      "GET /stats",
      "GET /import/sources",
      "POST /import",
      "POST /chat",
      "POST /share",
      "GET /people",
      "PATCH /memorial",
      "POST /memorial/portrait",
      "POST /photos/upload",
      "PATCH /items/:id",
      "GET /media/*",
    ],
  });
});

app.get("/health", (c) => c.json({ ok: true }));

app.get("/import/sources", (c) => {
  return c.json(IMPORT_SOURCES);
});

app.post("/import", async (c) => {
  const vault = getVault();
  const memorial = vault.getMemorial();
  if (!memorial) {
    vault.close();
    return c.json({ error: "No memorial initialized. Run memorium init or seed-demo." }, 404);
  }

  try {
    const body = await c.req.parseBody({ all: true });
    const file = body["file"];
    const source = typeof body["source"] === "string" ? body["source"] : "auto";

    if (!file || typeof file === "string") {
      vault.close();
      return c.json({ error: "file is required (multipart upload)" }, 400);
    }

    const uploadFile = file as File;
    if (uploadFile.size > getMaxUploadBytes()) {
      vault.close();
      return c.json({ error: "File too large" }, 413);
    }

    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const inputPath = await saveUpload(VAULT_PATH, uploadFile.name, buffer);

    const progress: string[] = [];
    const summary = await runIngest(inputPath, {
      memorialId: memorial.id,
      adapterId: source === "auto" ? undefined : source,
      storeItem: (item) => vault.storeItem(item),
      onProgress: (msg) => progress.push(msg),
    });

    vault.close();
    return c.json({
      ok: true,
      filename: uploadFile.name,
      source,
      adapter: summary.adapterId,
      stored: summary.stored,
      duplicates: summary.duplicates,
      itemsImported: summary.itemsImported,
      errors: summary.errors,
      durationMs: summary.durationMs,
      progress,
    });
  } catch (err) {
    vault.close();
    return c.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      500,
    );
  }
});

app.get("/memorial", (c) => {
  const vault = getVault();
  const payload = memorialPayload(vault);
  vault.close();
  if (!payload) return c.json({ error: "No memorial initialized" }, 404);
  return c.json(payload);
});

app.patch("/memorial", async (c) => {
  const vault = getVault();
  try {
    const body = await c.req.json<{
      name?: string;
      tribute?: string;
      bornAt?: string;
      diedAt?: string;
    }>();

    if (body.name !== undefined) {
      vault.updateMemorial({ name: body.name });
    }
    if (body.tribute !== undefined) {
      vault.updateMemorial({ description: body.tribute });
    }

    const subject = vault.getSubjectPerson();
    if (subject) {
      const personPatch: Partial<Person> = {};
      if (body.name !== undefined) personPatch.name = body.name;
      if (body.bornAt !== undefined) personPatch.bornAt = body.bornAt;
      if (body.diedAt !== undefined) personPatch.diedAt = body.diedAt;
      if (Object.keys(personPatch).length > 0) {
        vault.updatePerson(subject.id, personPatch);
      }
    }

    const payload = memorialPayload(vault);
    vault.close();
    if (!payload) return c.json({ error: "No memorial initialized" }, 404);
    return c.json(payload);
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 500);
  }
});

app.post("/memorial/portrait", async (c) => {
  const vault = getVault();
  try {
    const body = await c.req.parseBody({ all: true });
    const file = body["file"];
    if (!file || typeof file === "string") {
      vault.close();
      return c.json({ error: "file is required" }, 400);
    }

    const uploadFile = file as File;
    if (uploadFile.size > getMaxUploadBytes()) {
      vault.close();
      return c.json({ error: "File too large" }, 413);
    }

    const subject = vault.getSubjectPerson();
    if (!subject) {
      vault.close();
      return c.json({ error: "No subject person" }, 404);
    }

    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const avatarPath = await storeVaultMedia(VAULT_PATH, buffer, uploadFile.name, "avatars");
    vault.updatePerson(subject.id, { avatarPath });

    const payload = memorialPayload(vault);
    vault.close();
    return c.json(payload);
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Portrait upload failed" }, 500);
  }
});

app.get("/people", (c) => {
  const vault = getVault();
  const people = vault.listPeople();
  vault.close();
  return c.json(people);
});

app.post("/people", async (c) => {
  const vault = getVault();
  try {
    const body = await c.req.json<{ name: string; relationship?: string }>();
    if (!body.name?.trim()) {
      vault.close();
      return c.json({ error: "name is required" }, 400);
    }

    const person: Person = {
      id: generateId(),
      name: body.name.trim(),
      relationship: body.relationship?.trim(),
      isSubject: false,
    };
    vault.insertPerson(person);
    vault.close();
    return c.json(person, 201);
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Create person failed" }, 500);
  }
});

app.patch("/people/:id", async (c) => {
  const vault = getVault();
  try {
    const id = c.req.param("id");
    const body = await c.req.json<Partial<Person>>();
    const ok = vault.updatePerson(id, {
      name: body.name,
      relationship: body.relationship,
      bornAt: body.bornAt,
      diedAt: body.diedAt,
      avatarPath: body.avatarPath,
      faceEmbedding: body.faceEmbedding,
    });
    if (!ok) {
      vault.close();
      return c.json({ error: "Person not found" }, 404);
    }
    const person = vault.getPerson(id);
    vault.close();
    return c.json(person);
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 500);
  }
});

app.post("/photos/upload", async (c) => {
  const vault = getVault();
  const memorial = vault.getMemorial();
  if (!memorial) {
    vault.close();
    return c.json({ error: "No memorial initialized" }, 404);
  }

  try {
    const body = await c.req.parseBody({ all: true });
    const entries = body["file"];
    const files = Array.isArray(entries) ? entries : entries ? [entries] : [];

    const uploaded: Array<{ id: string; title?: string; stored: boolean }> = [];
    for (const entry of files) {
      if (typeof entry === "string") continue;
      const uploadFile = entry as File;
      if (uploadFile.size > getMaxUploadBytes()) continue;

      const buffer = Buffer.from(await uploadFile.arrayBuffer());
      const { item } = await ingestPhotoUpload(VAULT_PATH, memorial.id, buffer, uploadFile.name);
      const stored = vault.storeItem(item);
      uploaded.push({ id: item.id, title: item.title, stored });
    }

    vault.close();
    return c.json({ ok: true, uploaded, count: uploaded.length });
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Photo upload failed" }, 500);
  }
});

app.patch("/items/:id", async (c) => {
  const vault = getVault();
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{
      title?: string;
      text?: string;
      personIds?: string[];
      metadata?: Record<string, unknown>;
    }>();

    const updated = vault.updateItem(id, body);
    if (!updated) {
      vault.close();
      return c.json({ error: "Item not found" }, 404);
    }
    vault.close();
    return c.json(updated);
  } catch (err) {
    vault.close();
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 500);
  }
});

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

app.get("/media/*", (c) => {
  const relPath = c.req.path.replace(/^\/media\//, "");
  const full = resolveVaultMediaPath(VAULT_PATH, `media/${relPath}`);
  if (!full || !existsSync(full)) {
    return c.json({ error: "Not found" }, 404);
  }

  const ext = full.slice(full.lastIndexOf(".")).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const data = readFileSync(full);
  return new Response(data, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

app.get("/items", (c) => {
  const vault = getVault();
  const result = listItems(vault, {
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : 100,
    offset: c.req.query("offset") ? parseInt(c.req.query("offset")!, 10) : 0,
    source: c.req.query("source"),
    type: c.req.query("type"),
  });
  vault.close();
  return c.json(result);
});

app.get("/search", (c) => {
  const parsed = SearchQuerySchema.safeParse({
    q: c.req.query("q"),
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!, 10) : 50,
    offset: c.req.query("offset") ? parseInt(c.req.query("offset")!, 10) : 0,
    from: c.req.query("from"),
    to: c.req.query("to"),
    sources: c.req.query("source") ? [c.req.query("source")] : undefined,
  });

  if (!parsed.success) return c.json({ error: parsed.error.message }, 400);

  const vault = getVault();
  const result = search(vault, parsed.data);
  vault.close();
  return c.json(result);
});

app.get("/timeline", (c) => {
  const vault = getVault();
  const result = timeline(vault, c.req.query("from"), c.req.query("to"));
  vault.close();
  return c.json(result);
});

app.get("/today", (c) => {
  const vault = getVault();
  const items = onThisDay(vault);
  vault.close();
  return c.json({ date: new Date().toISOString().slice(0, 10), items });
});

app.get("/stats", (c) => {
  const vault = getVault();
  const result = stats(vault);
  vault.close();
  return c.json(result);
});

app.post("/chat", async (c) => {
  const provider = resolveProviderFromEnv();
  if (!provider) {
    return c.json({ error: "AI not configured. Set OPENAI_API_KEY or MEMORIUM_AI_PROVIDER=ollama." }, 503);
  }

  const body = await c.req.json<{ question: string }>();
  if (!body.question) return c.json({ error: "question is required" }, 400);

  const vault = getVault();
  const memorial = vault.getMemorial();
  const config = {
    provider,
    embeddingModel: process.env.MEMORIUM_EMBEDDING_MODEL ?? "text-embedding-3-small",
    chatModel: process.env.MEMORIUM_CHAT_MODEL ?? "gpt-4o-mini",
  };

  const results = await semanticSearch(vault, config, body.question, 8);
  const chat = new MemorialChat({
    provider,
    subjectName: memorial?.name ?? "your loved one",
  });

  const response = await chat.ask(
    body.question,
    results.map((r) => r.item),
  );

  vault.close();
  return c.json(response);
});

app.post("/share", async (c) => {
  const vault = getVault();
  try {
    const body = (await c.req.json<{ label?: string }>().catch(() => ({ label: undefined }))) as {
      label?: string;
    };
    const grant = vault.createShareGrant(body.label);
    vault.close();
    return c.json({
      ok: true,
      token: grant.token,
      expiresAt: grant.expiresAt,
      url: `http://${HOST}:${PORT}?token=${grant.token}`,
      note: "Read-only GET access: append ?token=... to the web UI URL or send X-Share-Token header.",
    });
  } catch (err) {
    vault.close();
    return c.json(
      { error: err instanceof Error ? err.message : "Share creation failed" },
      500,
    );
  }
});

console.log(`Memorium API starting on http://${HOST}:${PORT}`);

const server = serve({ fetch: app.fetch, port: PORT, hostname: HOST });

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use. Either stop the other process or set MEMORIUM_API_PORT in .env.\n` +
        `  Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F\n`,
    );
  } else {
    console.error("API failed to start:", err.message);
  }
  process.exit(1);
});
