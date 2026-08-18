import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join, sep, normalize, dirname } from "node:path";

import AdmZip from "adm-zip";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { detectAdapter, getAdapterById } from "./registry.js";

export interface IngestSummary extends IngestResult {
  stored: number;
  duplicates: number;
}

export interface RunIngestOptions {
  memorialId: string;
  storeItem: (item: MemoryItem) => boolean;
  adapterId?: string;
  onProgress?: (message: string) => void;
}

/** Run a full ingest pipeline into a vault store function */
export async function runIngest(
  inputPath: string,
  options: RunIngestOptions,
): Promise<IngestSummary> {
  let adapter: SourceAdapter | null = null;

  if (options.adapterId && options.adapterId !== "auto") {
    adapter = getAdapterById(options.adapterId) ?? null;
    if (!adapter) throw new Error(`Unknown adapter: ${options.adapterId}`);
  } else {
    adapter = await detectAdapter(inputPath);
  }

  if (!adapter) {
    throw new Error(`Could not detect format for: ${inputPath}`);
  }

  options.onProgress?.(`Using ${adapter.name}`);

  let stored = 0;
  let duplicates = 0;
  const generator = adapter.ingest(inputPath, options.memorialId, options.onProgress);

  let result = await generator.next();
  while (!result.done) {
    if (options.storeItem(result.value)) stored++;
    else duplicates++;
    result = await generator.next();
  }

  return { ...result.value, stored, duplicates };
}

/** Save an uploaded buffer to the vault uploads folder; unzip if .zip */
export async function saveUpload(
  vaultPath: string,
  filename: string,
  data: Buffer,
): Promise<string> {
  const uploadsDir = join(vaultPath, "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = join(uploadsDir, `${Date.now()}-${safeName}`);
  await writeFile(dest, data);

  if (safeName.toLowerCase().endsWith(".zip")) {
    const extractDir = `${dest}-extracted`;
    await mkdir(extractDir, { recursive: true });
    const zip = new AdmZip(dest);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const target = normalize(join(extractDir, entry.entryName));
      if (!target.startsWith(normalize(extractDir + sep))) {
        throw new Error(`Unsafe path in zip: ${entry.entryName}`);
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, entry.getData());
    }
    return extractDir;
  }

  return dest;
}
