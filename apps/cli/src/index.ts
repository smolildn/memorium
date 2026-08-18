#!/usr/bin/env node
import { resolve } from "node:path";

import { Command } from "commander";

import { indexVault, resolveProviderFromEnv, semanticSearch } from "@memorium/ai";
import { createDemoItems, demoSubjectName } from "@memorium/demo";
import { detectAdapter, formatExportGuide, getImportSource, IMPORT_SOURCES } from "@memorium/ingest";
import { onThisDay, search, stats, timeline, listItems } from "@memorium/query";
import { Vault } from "@memorium/storage";

const DEFAULT_VAULT = process.env.MEMORIUM_VAULT_PATH ?? "./data/vault";

const program = new Command();

program
  .name("memorium")
  .description("Memorium — local memorial repository CLI")
  .version("0.1.0");

program
  .command("init")
  .description("Create a new memorial vault")
  .requiredOption("-n, --name <name>", "Name of the loved one")
  .option("-p, --path <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (opts: { name: string; path: string }) => {
    const vaultPath = resolve(opts.path);
    const { memorial } = await Vault.create(vaultPath, opts.name);
    console.log(`✓ Created memorial vault for "${memorial.name}"`);
    console.log(`  Path: ${vaultPath}`);
    console.log(`  ID:   ${memorial.id}`);
  });

program
  .command("import")
  .description("Import content from an export file or folder")
  .argument("<path>", "Path to export (ZIP, folder, .mbox, .eml)")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (inputPath: string, opts: { vault: string }) => {
    const vaultPath = resolve(opts.vault);
    const vault = Vault.open(vaultPath);
    const memorial = vault.getMemorial();

    if (!memorial) {
      console.error("No memorial found. Run `memorium init` first.");
      process.exit(1);
    }

    const adapter = await detectAdapter(resolve(inputPath));
    if (!adapter) {
      console.error(`Could not detect source adapter for: ${inputPath}`);
      console.error("Supported: Meta, email, WhatsApp, Android SMS, Google Messages, iMessage, photos");
      process.exit(1);
    }

    console.log(`Using adapter: ${adapter.name}`);
    let stored = 0;
    let dupes = 0;

    const generator = adapter.ingest(resolve(inputPath), memorial.id, (msg) => {
      console.log(`  ${msg}`);
    });

    let result = await generator.next();
    while (!result.done) {
      const item = result.value;
      if (vault.storeItem(item)) {
        stored++;
      } else {
        dupes++;
      }
      result = await generator.next();
    }

    const ingestResult = result.value;
    console.log(`\n✓ Import complete`);
    console.log(`  Stored:   ${stored}`);
    console.log(`  Duplicates skipped: ${dupes}`);
    console.log(`  Parse errors: ${ingestResult.errors.length}`);
    if (ingestResult.errors.length > 0) {
      console.log(`  First error: ${ingestResult.errors[0]}`);
    }
    vault.close();
  });

program
  .command("search")
  .description("Search the memorial vault")
  .argument("<query>", "Search query")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .option("-l, --limit <n>", "Max results", "20")
  .action(async (query: string, opts: { vault: string; limit: string }) => {
    const vault = Vault.open(resolve(opts.vault));
    const result = search(vault, {
      q: query,
      limit: parseInt(opts.limit, 10),
      offset: 0,
    });

    console.log(`Found ${result.total} results for "${query}":\n`);
    for (const item of result.items) {
      const date = item.occurredAt.slice(0, 10);
      const preview = item.text.slice(0, 120).replace(/\n/g, " ");
      console.log(`  [${date}] ${item.type}/${item.source} — ${item.title ?? preview}`);
    }
    vault.close();
  });

program
  .command("stats")
  .description("Show vault statistics")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (opts: { vault: string }) => {
    const vault = Vault.open(resolve(opts.vault));
    const memorial = vault.getMemorial();
    const s = stats(vault);

    console.log(`Memorial: ${memorial?.name ?? "unknown"}`);
    console.log(`Total items: ${s.total}`);
    for (const [key, val] of Object.entries(s)) {
      if (key !== "total") console.log(`  ${key}: ${val}`);
    }
    vault.close();
  });

program
  .command("timeline")
  .description("Show memory timeline by month")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (opts: { vault: string }) => {
    const vault = Vault.open(resolve(opts.vault));
    const periods = timeline(vault);

    console.log("Timeline:\n");
    for (const p of periods) {
      const bar = "█".repeat(Math.min(p.count, 40));
      console.log(`  ${p.period}  ${bar} ${p.count}`);
    }
    vault.close();
  });

program
  .command("today")
  .description('"On this day" — memories matching today\'s date')
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (opts: { vault: string }) => {
    const vault = Vault.open(resolve(opts.vault));
    const items = onThisDay(vault);
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

    console.log(`On this day (${today}): ${items.length} memories\n`);
    for (const item of items) {
      const year = item.occurredAt.slice(0, 4);
      console.log(`  [${year}] ${item.title ?? item.text.slice(0, 80)}`);
    }
    vault.close();
  });

program
  .command("index-ai")
  .description("Generate embeddings for semantic search (OpenAI or Ollama)")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (opts: { vault: string }) => {
    const provider = resolveProviderFromEnv();
    if (!provider) {
      console.error("Set OPENAI_API_KEY or MEMORIUM_AI_PROVIDER=ollama to use AI indexing.");
      process.exit(1);
    }

    const vault = Vault.open(resolve(opts.vault));

    console.log("Indexing vault for semantic search...");
    const result = await indexVault(
      vault,
      {
        provider,
        embeddingModel: process.env.MEMORIUM_EMBEDDING_MODEL ?? "text-embedding-3-small",
        chatModel: process.env.MEMORIUM_CHAT_MODEL ?? "gpt-4o-mini",
      },
      (done, total) => process.stdout.write(`\r  ${done}/${total}`),
    );

    console.log(`\n✓ Indexed ${result.indexed} items (${result.skipped} skipped)`);
    vault.close();
  });

program
  .command("ask")
  .description("Ask a question using semantic search + AI (OpenAI or Ollama)")
  .argument("<question>", "Your question")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .action(async (question: string, opts: { vault: string }) => {
    const provider = resolveProviderFromEnv();
    if (!provider) {
      console.error("Set OPENAI_API_KEY or MEMORIUM_AI_PROVIDER=ollama to use AI features.");
      process.exit(1);
    }

    const vault = Vault.open(resolve(opts.vault));
    const config = {
      provider,
      embeddingModel: process.env.MEMORIUM_EMBEDDING_MODEL ?? "text-embedding-3-small",
      chatModel: process.env.MEMORIUM_CHAT_MODEL ?? "gpt-4o-mini",
    };

    const results = await semanticSearch(vault, config, question, 8);
    if (results.length === 0) {
      console.log("No relevant memories found. Try `memorium index-ai` first.");
      vault.close();
      return;
    }

    const { MemorialChat } = await import("@memorium/ai");
    const memorial = vault.getMemorial();
    const chat = new MemorialChat({
      provider,
      subjectName: memorial?.name ?? "your loved one",
    });

    const response = await chat.ask(
      question,
      results.map((r) => r.item),
    );

    console.log(`\n${response.content}\n`);
    if (response.citations.length > 0) {
      console.log("Sources:");
      for (const cite of response.citations) {
        console.log(`  • ${cite.excerpt.slice(0, 100)}...`);
      }
    }
    vault.close();
  });

program
  .command("export-guide")
  .description("Show how to export data from a platform before importing")
  .argument("[source]", "Source id (meta, whatsapp, android_sms, google_messages, imessage, email, image) — omit to list all")
  .action((source?: string) => {
    if (!source) {
      console.log("Available sources:\n");
      for (const s of IMPORT_SOURCES) {
        if (s.id === "auto") continue;
        console.log(`  ${s.id.padEnd(18)} ${s.label}`);
      }
      console.log("\nRun: memorium export-guide <source>");
      return;
    }

    const guide = getImportSource(source);
    if (!guide) {
      console.error(`Unknown source: ${source}`);
      console.error("Run memorium export-guide to list available sources.");
      process.exit(1);
    }

    console.log(formatExportGuide(guide));
  });

program
  .command("seed-demo")
  .description("Populate vault with sample memories for POC demo")
  .option("-p, --path <path>", "Vault directory path", DEFAULT_VAULT)
  .option("-n, --name <name>", "Subject name", demoSubjectName())
  .option("--reset", "Recreate vault from scratch")
  .action(async (opts: { path: string; name: string; reset?: boolean }) => {
    const vaultPath = resolve(opts.path);

    if (opts.reset) {
      const { rm } = await import("node:fs/promises");
      await rm(vaultPath, { recursive: true, force: true });
    }

    let vault: Vault;
    let memorialId: string;

    try {
      vault = Vault.open(vaultPath);
      const existing = vault.getMemorial();
      if (!existing) {
        vault.close();
        throw new Error("no memorial");
      }
      memorialId = existing.id;
      console.log(`Using existing vault for "${existing.name}"`);
    } catch {
      const created = await Vault.create(vaultPath, opts.name);
      vault = created.vault;
      memorialId = created.memorial.id;
      console.log(`✓ Created demo vault for "${opts.name}"`);
    }

    const items = createDemoItems(memorialId);
    let stored = 0;
    for (const item of items) {
      if (vault.storeItem(item)) stored++;
    }

    console.log(`✓ Seeded ${stored} demo memories`);
    console.log(`  Path: ${vaultPath}`);
    console.log(`\nNext: npm run poc`);
    vault.close();
  });

program
  .command("export")
  .description("Export vault as a self-contained ZIP bundle")
  .option("-p, --vault <path>", "Vault directory path", DEFAULT_VAULT)
  .option("-o, --output <path>", "Output ZIP path", "./memorium-export.zip")
  .option("--html <path>", "Also write a print-ready HTML memorial book")
  .action(async (opts: { vault: string; output: string; html?: string }) => {
    const { resolve: resolvePath } = await import("node:path");
    const { writeFileSync } = await import("node:fs");
    const AdmZip = (await import("adm-zip")).default;

    const vaultPath = resolvePath(opts.vault);
    const vault = Vault.open(vaultPath);
    const memorial = vault.getMemorial();
    if (!memorial) {
      console.error("No memorial found.");
      process.exit(1);
    }

    const result = listItems(vault, { limit: 10000 });
    const payload = {
      memorial,
      exportedAt: new Date().toISOString(),
      items: result.items,
    };

    const zip = new AdmZip();
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(payload, null, 2)));
    zip.addFile(
      "README.txt",
      Buffer.from(
        "Memorium export bundle\n\nOpen manifest.json for the full archive.\nGenerated by memorium export\n",
      ),
    );

    const out = resolvePath(opts.output);
    zip.writeZip(out);
    vault.close();
    console.log(`✓ Exported ${result.items.length} items → ${out}`);

    if (opts.html) {
      const sorted = [...result.items].sort(
        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      );
      const escape = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const sections = sorted
        .map(
          (item) => `<article class="memory">
  <time>${escape(new Date(item.occurredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))}</time>
  <h2>${escape(item.title ?? item.type)}</h2>
  <p class="source">${escape(item.source)}</p>
  <div class="text">${escape(item.text).replace(/\n/g, "<br>")}</div>
</article>`,
        )
        .join("\n");

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escape(memorial.name)} — Memorium</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; color: #2c2416; line-height: 1.6; }
    h1 { font-weight: normal; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
    .memory { page-break-inside: avoid; margin: 2rem 0; padding-bottom: 1.5rem; border-bottom: 1px solid #eee; }
    time { color: #666; font-size: 0.9rem; }
    .source { font-size: 0.85rem; color: #888; text-transform: capitalize; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escape(memorial.name)}</h1>
  <p class="subtitle">Memorial archive · exported ${escape(payload.exportedAt.slice(0, 10))}</p>
  ${sections}
</body>
</html>`;

      const htmlPath = resolvePath(opts.html);
      writeFileSync(htmlPath, html, "utf8");
      console.log(`✓ Wrote print-ready HTML → ${htmlPath}`);
    }
  });

program.parse();
