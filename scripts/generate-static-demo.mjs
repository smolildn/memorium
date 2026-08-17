/**
 * Generates static JSON for GitHub Pages demo mode.
 * Run after building @memorium/core and @memorium/demo.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDemoItems, demoSubjectName } from "../packages/demo/dist/index.js";
import { IMPORT_SOURCES } from "../packages/ingest/dist/import-sources.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps/web/public/demo");

const memorialId = "00000000-0000-4000-8000-000000000001";
const memorial = {
  id: memorialId,
  name: demoSubjectName(),
  description: "Static demo vault for GitHub Pages",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const items = createDemoItems(memorialId);

const timeline = Object.entries(
  items.reduce((acc, item) => {
    const period = item.occurredAt.slice(0, 7);
    acc[period] = (acc[period] ?? 0) + 1;
    return acc;
  }, {}),
)
  .map(([period, count]) => ({ period, count }))
  .sort((a, b) => a.period.localeCompare(b.period));

const stats = { total: items.length };
for (const item of items) {
  stats[`type:${item.type}`] = (stats[`type:${item.type}`] ?? 0) + 1;
  stats[`source:${item.source}`] = (stats[`source:${item.source}`] ?? 0) + 1;
}

await mkdir(outDir, { recursive: true });

await Promise.all([
  writeFile(join(outDir, "memorial.json"), JSON.stringify(memorial, null, 2)),
  writeFile(join(outDir, "items.json"), JSON.stringify({ items, total: items.length }, null, 2)),
  writeFile(join(outDir, "timeline.json"), JSON.stringify(timeline, null, 2)),
  writeFile(join(outDir, "stats.json"), JSON.stringify(stats, null, 2)),
  writeFile(join(outDir, "import-sources.json"), JSON.stringify(IMPORT_SOURCES, null, 2)),
]);

console.log(`✓ Generated static demo data → apps/web/public/demo/ (${items.length} items)`);
