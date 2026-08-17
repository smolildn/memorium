import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

/** WhatsApp chat export: [DD/MM/YYYY, HH:MM:SS] Sender: Message */
const WA_LINE = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APMapm]{2})?)\]\s([^:]+):\s([\s\S]*)$/;
const WA_LINE_ALT = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s+-\s+([^:]+):\s([\s\S]*)$/;

export class WhatsAppAdapter implements SourceAdapter {
  readonly id = "whatsapp";
  readonly name = "WhatsApp (.txt export)";
  readonly supportedPlatforms = ["whatsapp" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      if (!info.isFile() || extname(inputPath).toLowerCase() !== ".txt") return 0;

      const sample = await readFile(inputPath, "utf-8");
      const lines = sample.split(/\r?\n/).slice(0, 30);
      let matches = 0;
      for (const line of lines) {
        if (WA_LINE.test(line) || WA_LINE_ALT.test(line)) matches++;
      }
      return matches >= 2 ? Math.min(0.5 + matches * 0.05, 0.95) : 0;
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

    onProgress?.(`Parsing WhatsApp export: ${inputPath}`);
    const raw = await readFile(inputPath, "utf-8");
    const lines = raw.split(/\r?\n/);

    let current: { date: string; sender: string; text: string } | null = null;

    const flush = (): MemoryItem | null => {
      if (!current || !current.text.trim()) return null;
      const occurredAt = parseWhatsAppDate(current.date);
      const text = current.text.trim();
      const sender = current.sender.trim();

      return {
        id: generateId(),
        memorialId,
        type: "message",
        source: "whatsapp",
        title: `WhatsApp from ${sender}`,
        text,
        occurredAt,
        importedAt: nowIso(),
        personIds: [],
        mediaRefs: [],
        metadata: { sender, chat: inputPath.split(/[/\\]/).pop() },
        contentHash: contentHash(["whatsapp", occurredAt, sender, text]),
      };
    };

    for (const line of lines) {
      const match = line.match(WA_LINE) ?? line.match(WA_LINE_ALT);
      if (match) {
        const prev = flush();
        if (prev) {
          yield prev;
          imported++;
        }

        const [, datePart, timePart, sender, text] = match;
        current = {
          date: `${datePart} ${timePart}`,
          sender: sender!.trim(),
          text: text!.trim(),
        };
      } else if (current && line.trim()) {
        current.text += `\n${line}`;
      }
    }

    const last = flush();
    if (last) {
      yield last;
      imported++;
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
}

function parseWhatsAppDate(raw: string): string {
  const parsed = Date.parse(raw.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, (_, d, m, y) => {
    const year = y.length === 2 ? `20${y}` : y;
    return `${m}/${d}/${year}`;
  }));
  return Number.isNaN(parsed) ? nowIso() : new Date(parsed).toISOString();
}
