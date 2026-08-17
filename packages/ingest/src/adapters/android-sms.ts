import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

import { decodeXmlEntities, epochMsToIso, extractXmlElements } from "../utils/parse.js";

/**
 * SMS Backup & Restore XML export (Android, and cross-platform backups).
 * https://www.synctech.com.au/sms-backup-restore/
 */
export class SmsBackupRestoreAdapter implements SourceAdapter {
  readonly id = "android_sms";
  readonly name = "Android SMS / SMS Backup & Restore (.xml)";
  readonly supportedPlatforms = ["sms" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      if (!info.isFile()) return 0;
      const ext = extname(inputPath).toLowerCase();
      if (ext !== ".xml") return 0;

      const head = (await readFile(inputPath, "utf-8")).slice(0, 4000);
      if (head.includes("<smses") || head.includes("<sms ")) return 0.95;
      if (head.includes("<mmses") || head.includes("<mms ")) return 0.85;
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

    onProgress?.(`Parsing SMS Backup & Restore: ${inputPath}`);
    const xml = await readFile(inputPath, "utf-8");

    const smsRows = extractXmlElements(xml, "sms");
    onProgress?.(`Found ${smsRows.length} SMS messages`);

    for (const row of smsRows) {
      try {
        const item = this.rowToItem(row, memorialId, "sms");
        if (item) {
          yield item;
          imported++;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    const mmsRows = extractXmlElements(xml, "mms");
    for (const row of mmsRows) {
      try {
        const parts = extractXmlElements(
          xml.slice(xml.indexOf(`<mms`), xml.indexOf(`<mms`) + 5000),
          "part",
        );
        const textPart = parts.find((p) => p["ct"]?.startsWith("text/"));
        const body = textPart?.["text"] ?? row["subject"] ?? "(MMS attachment)";
        const merged = { ...row, body };
        const item = this.rowToItem(merged, memorialId, "sms", body);
        if (item) {
          yield item;
          imported++;
        }
      } catch {
        // MMS blocks vary; skip malformed entries
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

  private rowToItem(
    row: Record<string, string>,
    memorialId: string,
    source: "sms",
    bodyOverride?: string,
  ): MemoryItem | null {
    const body = decodeXmlEntities(bodyOverride ?? row["body"] ?? "").trim();
    if (!body) return null;

    const dateMs = row["date"] ?? row["date_sent"];
    const occurredAt = dateMs ? epochMsToIso(dateMs) : nowIso();
    const type = row["type"] === "2" ? "sent" : "received";
    const contact = row["contact_name"] || row["address"] || "Unknown";
    const sender = type === "sent" ? "Me" : contact;

    return {
      id: generateId(),
      memorialId,
      type: "message",
      source,
      title: `SMS ${type === "sent" ? "to" : "from"} ${contact}`,
      text: body,
      occurredAt,
      importedAt: nowIso(),
      personIds: [],
      mediaRefs: [],
      metadata: {
        sender,
        contact,
        address: row["address"],
        direction: type,
        platform: "android_sms",
      },
      contentHash: contentHash(["sms", occurredAt, contact, body]),
    };
  }
}
