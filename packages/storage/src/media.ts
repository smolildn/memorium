import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

/** Sanitize upload filenames — never use raw user input as path segments. */
export function sanitizeFilename(name: string): string {
  const base = basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base.length > 0 ? base : "file";
}

export async function storeVaultMedia(
  vaultPath: string,
  buffer: Buffer,
  originalFilename: string,
  folder: "photos" | "avatars" | "attachments",
): Promise<string> {
  const dir = join(vaultPath, "media", folder);
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}-${sanitizeFilename(originalFilename)}`;
  const rel = join("media", folder, safe).replace(/\\/g, "/");
  await writeFile(join(vaultPath, rel), buffer);
  return rel;
}

/** Resolve a vault-relative media path and reject traversal. */
export function resolveVaultMediaPath(vaultPath: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..") || !normalized.startsWith("media/")) {
    return null;
  }
  const full = join(vaultPath, normalized);
  const mediaRoot = join(vaultPath, "media");
  if (!full.startsWith(mediaRoot)) {
    return null;
  }
  return full;
}
