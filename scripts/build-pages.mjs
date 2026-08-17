#!/usr/bin/env node
/** Local GitHub Pages build (same as CI) */
import { spawnSync } from "node:child_process";
import { cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "apps/web/dist");

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npm", ["run", "build", "--workspace=@memorium/core"]);
run("npm", ["run", "build", "--workspace=@memorium/demo"]);
run("npm", ["run", "build", "--workspace=@memorium/ingest"]);
run("node", ["scripts/generate-static-demo.mjs"]);
run("npm", ["run", "build", "--workspace=@memorium/web"], {
  VITE_DEMO_MODE: "true",
  VITE_BASE: "/memorium/",
});

cpSync(join(distDir, "index.html"), join(distDir, "404.html"));

console.log("\n✓ Pages build ready: apps/web/dist/");
console.log("  Open: http://localhost:4173/memorium/");
console.log("  Or run: npm run preview:pages");
