import exifr from "exifr";

import type { MemoryItem } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";
import { storeVaultMedia } from "@memorium/storage";

const IMAGE_MIMES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function guessMime(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return IMAGE_MIMES[ext] ?? "image/jpeg";
}

export interface PhotoUploadResult {
  item: MemoryItem;
  stored: boolean;
}

/** Copy a single photo into the vault and build a memory item with EXIF metadata. */
export async function ingestPhotoUpload(
  vaultPath: string,
  memorialId: string,
  buffer: Buffer,
  originalFilename: string,
): Promise<PhotoUploadResult> {
  const vaultRel = await storeVaultMedia(vaultPath, buffer, originalFilename, "photos");
  const mimeType = guessMime(originalFilename);
  const importedAt = nowIso();

  let occurredAt = importedAt;
  const metadata: Record<string, unknown> = { tags: [] as string[] };
  const exif = await exifr.parse(buffer, {
    pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude", "Make", "Model"],
  }).catch(() => null);

  if (exif) {
    const taken = exif.DateTimeOriginal ?? exif.CreateDate;
    if (taken) {
      occurredAt =
        taken instanceof Date ? taken.toISOString() : new Date(String(taken)).toISOString();
    }
    if (typeof exif.latitude === "number" && typeof exif.longitude === "number") {
      metadata.lat = exif.latitude;
      metadata.lng = exif.longitude;
    }
    const camera = [exif.Make, exif.Model].filter(Boolean).join(" ").trim();
    if (camera) metadata.camera = camera;
    metadata.exif = {
      takenAt: occurredAt,
      make: exif.Make,
      model: exif.Model,
    };
  }

  const item: MemoryItem = {
    id: generateId(),
    memorialId,
    type: "photo",
    source: "manual",
    title: originalFilename,
    text: "",
    occurredAt,
    importedAt,
    personIds: [],
    mediaRefs: [
      {
        id: generateId(),
        vaultPath: vaultRel,
        mimeType,
        originalFilename,
      },
    ],
    metadata,
    contentHash: contentHash(["manual", "photo", vaultRel, String(buffer.length), occurredAt]),
  };

  return { item, stored: true };
}
