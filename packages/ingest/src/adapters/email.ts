import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createInterface } from "node:readline";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

const EML_EXT = ".eml";
const MBOX_EXT = ".mbox";

/**
 * Parses email archives: single .eml files, directories of .eml, or .mbox files.
 */
export class EmailAdapter implements SourceAdapter {
  readonly id = "email";
  readonly name = "Email (.eml / .mbox)";
  readonly supportedPlatforms = ["email" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      const ext = extname(inputPath).toLowerCase();

      if (ext === MBOX_EXT || ext === EML_EXT) return 0.95;

      if (info.isDirectory()) {
        const files = await readdir(inputPath);
        const emlCount = files.filter(
          (f) => extname(f).toLowerCase() === EML_EXT,
        ).length;
        if (emlCount > 0) return Math.min(0.5 + emlCount * 0.05, 0.95);
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
    let skipped = 0;
    const errors: string[] = [];

    const ext = extname(inputPath).toLowerCase();
    const info = await stat(inputPath);

    if (ext === MBOX_EXT) {
      onProgress?.(`Parsing mbox: ${inputPath}`);
      for await (const raw of this.readMbox(inputPath)) {
        try {
          const item = this.parseEml(raw, memorialId);
          if (item) {
            yield item;
            imported++;
          } else {
            skipped++;
          }
        } catch (err) {
          skipped++;
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    } else if (ext === EML_EXT) {
      const raw = await import("node:fs/promises").then((fs) =>
        fs.readFile(inputPath, "utf-8"),
      );
      const item = this.parseEml(raw, memorialId);
      if (item) {
        yield item;
        imported++;
      }
    } else if (info.isDirectory()) {
      const files = await readdir(inputPath);
      for (const file of files) {
        if (extname(file).toLowerCase() !== EML_EXT) continue;
        try {
          const raw = await import("node:fs/promises").then((fs) =>
            fs.readFile(join(inputPath, file), "utf-8"),
          );
          const item = this.parseEml(raw, memorialId);
          if (item) {
            yield item;
            imported++;
          }
        } catch (err) {
          skipped++;
          errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return {
      adapterId: this.id,
      itemsImported: imported,
      itemsSkipped: skipped,
      mediaFilesCopied: 0,
      errors,
      durationMs: Date.now() - start,
    };
  }

  private async *readMbox(path: string): AsyncGenerator<string> {
    const rl = createInterface({
      input: createReadStream(path, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });

    let current = "";
    for await (const line of rl) {
      if (line.startsWith("From ") && current.length > 0) {
        yield current;
        current = line + "\n";
      } else {
        current += line + "\n";
      }
    }
    if (current.length > 0) yield current;
  }

  private parseEml(raw: string, memorialId: string): MemoryItem | null {
    const headers = this.parseHeaders(raw);
    const from = headers["from"] ?? "unknown";
    const to = headers["to"] ?? "";
    const subject = headers["subject"] ?? "(no subject)";
    const dateStr = headers["date"];
    const occurredAt = dateStr ? new Date(dateStr).toISOString() : nowIso();

    const bodyStart = raw.indexOf("\r\n\r\n");
    const body =
      bodyStart >= 0
        ? raw.slice(bodyStart + 4).trim()
        : raw.split("\n\n").slice(1).join("\n\n").trim();

    if (!body && subject === "(no subject)") return null;

    return {
      id: generateId(),
      memorialId,
      type: "email",
      source: "email",
      title: subject,
      text: body,
      occurredAt,
      importedAt: nowIso(),
      personIds: [],
      mediaRefs: [],
      metadata: { from, to, subject },
      contentHash: contentHash(["email", occurredAt, from, subject, body.slice(0, 500)]),
    };
  }

  private parseHeaders(raw: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = raw.split(/\r?\n/);
    let currentKey = "";

    for (const line of lines) {
      if (line.trim() === "") break;
      const match = line.match(/^([\w-]+):\s*(.*)/);
      if (match) {
        currentKey = match[1]!.toLowerCase();
        headers[currentKey] = match[2]!.trim();
      } else if (currentKey && line.startsWith(" ")) {
        headers[currentKey] += " " + line.trim();
      }
    }

    return headers;
  }
}
