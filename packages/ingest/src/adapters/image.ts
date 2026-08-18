import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type { IngestResult, MemoryItem, SourceAdapter } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

import { extractPhotoExif } from "../exif.js";

const IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".tiff",
]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);

/**
 * Walks a directory of photos/videos and creates memory items from file metadata.
 */
export class ImageAdapter implements SourceAdapter {
  readonly id = "image";
  readonly name = "Photos & Videos (folder)";
  readonly supportedPlatforms = ["manual" as const];

  async detect(inputPath: string): Promise<number> {
    try {
      const info = await stat(inputPath);
      if (!info.isDirectory()) {
        const ext = extname(inputPath).toLowerCase();
        return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) ? 0.8 : 0;
      }

      const files = await this.walkMedia(inputPath);
      if (files.length === 0) return 0;
      return Math.min(0.4 + files.length * 0.02, 0.85);
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
    const files = info.isDirectory()
      ? await this.walkMedia(inputPath)
      : [inputPath];

    onProgress?.(`Indexing ${files.length} media files`);

    for (const file of files) {
      try {
        const fileStat = await stat(file);
        const ext = extname(file).toLowerCase();
        const isVideo = VIDEO_EXTS.has(ext);
        const filename = basename(file);
        const fallbackOccurredAt = fileStat.mtime.toISOString();
        let occurredAt = fallbackOccurredAt;
        let metadata: Record<string, unknown> = { originalPath: file, sizeBytes: fileStat.size };

        if (!isVideo) {
          const buffer = await readFile(file);
          const exif = await extractPhotoExif(buffer, fallbackOccurredAt);
          occurredAt = exif.occurredAt;
          metadata = { ...metadata, ...exif.fields };
        }

        yield {
          id: generateId(),
          memorialId,
          type: isVideo ? "video" : "photo",
          source: "manual",
          title: filename,
          text: "",
          occurredAt,
          importedAt: nowIso(),
          personIds: [],
          mediaRefs: [
            {
              id: generateId(),
              vaultPath: file,
              mimeType: this.guessMime(ext),
              originalFilename: filename,
            },
          ],
          metadata,
          contentHash: contentHash(["manual", file, String(fileStat.size), occurredAt]),
        };
        imported++;
      } catch (err) {
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      adapterId: this.id,
      itemsImported: imported,
      itemsSkipped: 0,
      mediaFilesCopied: imported,
      errors,
      durationMs: Date.now() - start,
    };
  }

  private async walkMedia(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.walkMedia(full)));
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) {
          results.push(full);
        }
      }
    }

    return results;
  }

  private guessMime(ext: string): string {
    const map: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".heic": "image/heic",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
    };
    return map[ext] ?? "application/octet-stream";
  }
}
