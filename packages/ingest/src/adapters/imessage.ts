import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

import { appleEpochToIso, parseCsvLine } from "../utils/parse.js";

/**
 * iPhone iMessage imports:
 * - chat.db (from iPhone backup / iMazing)
 * - CSV export (Date, Type, Sender, Text columns)
 */
export class IMessageAdapter implements SourceAdapter {
  readonly id = "imessage";
  readonly name = "iPhone iMessage (chat.db / CSV)";
  readonly supportedPlatforms = ["imessage" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      if (!info.isFile()) return 0;

      const ext = extname(inputPath).toLowerCase();
      if (ext === ".db" || inputPath.toLowerCase().includes("chat.db")) {
        return 0.95;
      }

      if (ext === ".csv") {
        const head = (await readFile(inputPath, "utf-8")).slice(0, 500).toLowerCase();
        if (head.includes("imessage") || head.includes("message") || head.includes("sender")) {
          return 0.85;
        }
      }

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

    const ext = extname(inputPath).toLowerCase();

    if (ext === ".csv") {
      onProgress?.(`Parsing iMessage CSV: ${inputPath}`);
      const items = await this.parseCsv(inputPath, memorialId);
      for (const item of items) {
        yield item;
        imported++;
      }
    } else {
      onProgress?.(`Parsing iMessage chat.db: ${inputPath}`);
      const items = this.parseChatDb(inputPath, memorialId, errors);
      for (const item of items) {
        yield item;
        imported++;
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

  private async parseCsv(inputPath: string, memorialId: string): Promise<MemoryItem[]> {
    const raw = await readFile(inputPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time"));
    const textIdx = headers.findIndex((h) => h.includes("text") || h.includes("message") || h.includes("body"));
    const senderIdx = headers.findIndex((h) => h.includes("sender") || h.includes("from") || h.includes("contact"));
    const typeIdx = headers.findIndex((h) => h.includes("type") || h.includes("direction"));

    const items: MemoryItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]!);
      const text = cols[textIdx >= 0 ? textIdx : 2]?.trim();
      if (!text) continue;

      const dateRaw = cols[dateIdx >= 0 ? dateIdx : 0] ?? "";
      const parsed = Date.parse(dateRaw);
      const occurredAt = Number.isNaN(parsed) ? nowIso() : new Date(parsed).toISOString();

      const sender = cols[senderIdx >= 0 ? senderIdx : 1] ?? "Unknown";
      const direction = typeIdx >= 0 ? cols[typeIdx] : "";

      items.push({
        id: generateId(),
        memorialId,
        type: "message",
        source: "imessage",
        title: `iMessage from ${sender}`,
        text,
        occurredAt,
        importedAt: nowIso(),
        personIds: [],
        mediaRefs: [],
        metadata: { sender, direction, platform: "imessage_csv" },
        contentHash: contentHash(["imessage", occurredAt, sender, text]),
      });
    }

    return items;
  }

  private parseChatDb(
    inputPath: string,
    memorialId: string,
    errors: string[],
  ): MemoryItem[] {
    const items: MemoryItem[] = [];

    try {
      const db = new DatabaseSync(inputPath, { readOnly: true });

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;

      const hasMessage = tables.some((t) => t.name === "message");
      if (!hasMessage) {
        errors.push("chat.db: no message table found");
        db.close();
        return items;
      }

      const rows = db.prepare(
        `SELECT m.text, m.date, m.is_from_me, h.id as handle
         FROM message m
         LEFT JOIN handle h ON m.handle_id = h.ROWID
         WHERE m.text IS NOT NULL AND m.text != ''
         ORDER BY m.date`,
      ).all() as Array<{
        text: string;
        date: number;
        is_from_me: number;
        handle: string | null;
      }>;

      db.close();

      for (const row of rows) {
        const text = row.text.trim();
        if (!text) continue;

        const occurredAt = appleEpochToIso(row.date);
        const contact = row.handle ?? "Unknown";
        const sender = row.is_from_me ? "Me" : contact;

        items.push({
          id: generateId(),
          memorialId,
          type: "message",
          source: "imessage",
          title: `iMessage ${row.is_from_me ? "to" : "from"} ${contact}`,
          text,
          occurredAt,
          importedAt: nowIso(),
          personIds: [],
          mediaRefs: [],
          metadata: {
            sender,
            contact,
            direction: row.is_from_me ? "sent" : "received",
            platform: "imessage_chatdb",
          },
          contentHash: contentHash(["imessage", occurredAt, contact, text]),
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    return items;
  }
}
