#!/usr/bin/env node
/**
 * Copy face-api model weights into the web public folder for offline/local inference.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@vladmandic", "face-api", "model");
const dest = join(root, "apps", "web", "public", "face-models");

if (!existsSync(src)) {
  console.warn("⚠ @vladmandic/face-api models not found — run npm install first");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`✓ Face models copied → ${dest}`);
