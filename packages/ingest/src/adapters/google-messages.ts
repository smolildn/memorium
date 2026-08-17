import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

import { epochMsToIso } from "../utils/parse.js";

interface GoogleMessage {
  text?: string;
  message_text?: string;
  content?: string;
  timestamp?: string | number;
  time?: string | number;
  date?: string | number;
  sender_id?: string;
  sender?: string;
  creator_id?: string;
  participant_id?: string;
  direction?: string;
  type?: string;
}

/**
 * Google Messages / Google Takeout "Messages" JSON exports.
 */
export class GoogleMessagesAdapter implements SourceAdapter {
  readonly id = "google_messages";
  readonly name = "Google Messages (JSON / Takeout)";
  readonly supportedPlatforms = ["google_messages" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      if (info.isDirectory()) {
        const files = await readdir(inputPath);
        if (files.some((f) => f.toLowerCase().includes("message"))) return 0.7;
        return 0;
      }

      if (extname(inputPath).toLowerCase() !== ".json") return 0;
      const raw = await readFile(inputPath, "utf-8");
      const lower = raw.slice(0, 2000).toLowerCase();
      if (lower.includes('"messages"') && (lower.includes("sender") || lower.includes("text"))) {
        return 0.9;
      }
      if (lower.includes("google") && lower.includes("message")) return 0.75;
      return 0;
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
    const errors: string[] = [];

    const info = await stat(inputPath);
    const jsonPaths: string[] = [];

    if (info.isDirectory()) {
      const files = await this.walkJson(inputPath);
      jsonPaths.push(...files);
    } else {
      jsonPaths.push(inputPath);
    }

    onProgress?.(`Parsing ${jsonPaths.length} Google Messages file(s)`);

    for (const file of jsonPaths) {
      try {
        const raw = await readFile(file, "utf-8");
        const data = JSON.parse(raw) as unknown;
        const messages = this.extractMessages(data);

        for (const msg of messages) {
          const item = this.toItem(msg, memorialId);
          if (item) {
            yield item;
            imported++;
          }
        }
      } catch (err) {
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      adapterId: this.id,
      itemsImported: imported,
      itemsSkipped: 0,
      mediaFilesCopied: 0,
      errors,
      durationMs: Date.now() - start,
    };
  }

  private async walkJson(dir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...(await this.walkJson(full)));
      } else if (extname(e.name).toLowerCase() === ".json") {
        out.push(full);
      }
    }
    return out;
  }

  private extractMessages(data: unknown): GoogleMessage[] {
    if (Array.isArray(data)) return data as GoogleMessage[];
    if (!data || typeof data !== "object") return [];

    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.messages)) return obj.messages as GoogleMessage[];
    if (Array.isArray(obj.conversations)) {
      const out: GoogleMessage[] = [];
      for (const conv of obj.conversations as Array<{ messages?: GoogleMessage[] }>) {
        if (conv.messages) out.push(...conv.messages);
      }
      return out;
    }

    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
        const first = val[0] as GoogleMessage;
        if (first.text || first.message_text || first.content) {
          return val as GoogleMessage[];
        }
      }
    }
    return [];
  }

  private toItem(msg: GoogleMessage, memorialId: string): MemoryItem | null {
    const text = (msg.text ?? msg.message_text ?? msg.content ?? "").trim();
    if (!text) return null;

    const ts = msg.timestamp ?? msg.time ?? msg.date;
    let occurredAt = nowIso();
    if (typeof ts === "number") {
      occurredAt = ts > 1e12 ? epochMsToIso(ts) : epochMsToIso(ts * 1000);
    } else if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      occurredAt = Number.isNaN(parsed) ? nowIso() : new Date(parsed).toISOString();
    }

    const sender = msg.sender ?? msg.sender_id ?? msg.creator_id ?? "Unknown";
    const direction = msg.direction ?? msg.type ?? "";

    return {
      id: generateId(),
      memorialId,
      type: "message",
      source: "google_messages",
      title: `Google Message from ${sender}`,
      text,
      occurredAt,
      importedAt: nowIso(),
      personIds: [],
      mediaRefs: [],
      metadata: { sender, direction, platform: "google_messages" },
      contentHash: contentHash(["google_messages", occurredAt, String(sender), text]),
    };
  }
}
