import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

import AdmZip from "adm-zip";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

interface MetaPost {
  timestamp?: number;
  title?: string;
  data?: Array<{ post?: string }>;
  attachments?: Array<{ data?: Array<{ uri?: string }> }>;
}

interface MetaMessage {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  photos?: Array<{ uri?: string }>;
}

/**
 * Parses Meta (Facebook / Instagram / Messenger) "Download Your Information" exports.
 * Supports both extracted folders and ZIP archives.
 */
export class MetaAdapter implements SourceAdapter {
  readonly id = "meta";
  readonly name = "Meta (Facebook / Instagram / Messenger)";
  readonly supportedPlatforms = [
    "meta_facebook" as const,
    "meta_instagram" as const,
    "meta_messenger" as const,
  ];

  async detect(inputPath: string): Promise<number> {
    try {
      const root = await this.resolveRoot(inputPath);
      const files = await this.walkJson(root, 3);
      const names = files.map((f) => f.toLowerCase());

      let score = 0;
      if (names.some((n) => n.includes("your_posts"))) score += 0.4;
      if (names.some((n) => n.includes("message_"))) score += 0.3;
      if (names.some((n) => n.includes("instagram"))) score += 0.2;
      if (names.some((n) => n.includes("facebook"))) score += 0.1;

      return Math.min(score, 1);
    } catch {
      return 0;
    }
  }

  async *ingest(
    inputPath: string,
    memorialId: string,
    onProgress?: (message: string) => void,
  ): AsyncGenerator<MemoryItem, IngestResult> {
    const start = Date.now();
    let imported = 0;
    let skipped = 0;
    let media = 0;
    const errors: string[] = [];

    const root = await this.resolveRoot(inputPath);
    onProgress?.(`Parsing Meta export at ${root}`);

    const jsonFiles = await this.walkJson(root, 10);

    for (const file of jsonFiles) {
      const lower = file.toLowerCase();
      try {
        const raw = await import("node:fs/promises").then((fs) =>
          fs.readFile(file, "utf-8"),
        );
        const data = JSON.parse(raw) as unknown;

        if (lower.includes("your_posts") || lower.includes("posts")) {
          const items = this.parsePosts(data, memorialId, "meta_facebook");
          for (const item of items) {
            yield item;
            imported++;
          }
        } else if (lower.includes("message_")) {
          const items = this.parseMessages(data, memorialId);
          for (const item of items) {
            yield item;
            imported++;
          }
        } else if (lower.includes("instagram")) {
          const items = this.parsePosts(data, memorialId, "meta_instagram");
          for (const item of items) {
            yield item;
            imported++;
          }
        }
      } catch (err) {
        skipped++;
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    onProgress?.(`Done: ${imported} items, ${skipped} skipped`);

    return {
      adapterId: this.id,
      itemsImported: imported,
      itemsSkipped: skipped,
      mediaFilesCopied: media,
      errors,
      durationMs: Date.now() - start,
    };
  }

  private async resolveRoot(inputPath: string): Promise<string> {
    const info = await stat(inputPath);
    if (info.isDirectory()) return inputPath;

    if (extname(inputPath).toLowerCase() === ".zip") {
      const extractDir = join(inputPath, "..", ".memorium-meta-extract");
      const zip = new AdmZip(inputPath);
      zip.extractAllTo(extractDir, true);
      return extractDir;
    }

    throw new Error(`Unsupported Meta input: ${inputPath}`);
  }

  private async walkJson(dir: string, maxDepth: number): Promise<string[]> {
    const results: string[] = [];
    await this.walk(dir, maxDepth, results);
    return results.filter((f) => extname(f).toLowerCase() === ".json");
  }

  private async walk(dir: string, depth: number, out: string[]): Promise<void> {
    if (depth <= 0) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(full, depth - 1, out);
      } else {
        out.push(full);
      }
    }
  }

  private parsePosts(
    data: unknown,
    memorialId: string,
    source: "meta_facebook" | "meta_instagram",
  ): MemoryItem[] {
    const posts = this.extractArray<MetaPost>(data);
    return posts.map((post) => {
      const text =
        post.data?.map((d) => d.post).filter(Boolean).join("\n") ??
        post.title ??
        "";
      const ts = post.timestamp
        ? new Date(post.timestamp * 1000).toISOString()
        : nowIso();

      return {
        id: generateId(),
        memorialId,
        type: "post" as const,
        source,
        title: post.title,
        text,
        occurredAt: ts,
        importedAt: nowIso(),
        personIds: [],
        mediaRefs: [],
        metadata: { raw: post },
        contentHash: contentHash([source, ts, text]),
      };
    });
  }

  private parseMessages(data: unknown, memorialId: string): MemoryItem[] {
    const messages = this.extractArray<MetaMessage>(data);
    return messages
      .filter((m) => m.content || m.photos?.length)
      .map((msg) => {
        const ts = msg.timestamp_ms
          ? new Date(msg.timestamp_ms).toISOString()
          : nowIso();
        const text = msg.content ?? "";
        const sender = msg.sender_name ?? "Unknown";

        return {
          id: generateId(),
          memorialId,
          type: "message" as const,
          source: "meta_messenger" as const,
          title: `Message from ${sender}`,
          text,
          occurredAt: ts,
          importedAt: nowIso(),
          personIds: [],
          mediaRefs: [],
          metadata: { sender, raw: msg },
          contentHash: contentHash(["meta_messenger", ts, sender, text]),
        };
      });
  }

  private extractArray<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object") {
      for (const val of Object.values(data)) {
        if (Array.isArray(val)) return val as T[];
      }
    }
    return [];
  }
}
