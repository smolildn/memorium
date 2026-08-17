import { createHash, randomUUID } from "node:crypto";

export function generateId(): string {
  return randomUUID();
}

export function contentHash(parts: string[]): string {
  const normalized = parts
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}
