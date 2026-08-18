import type { MemoryItem } from "../api";

export interface FaceRegion {
  id: string;
  /** Normalized 0–1 coordinates relative to image dimensions */
  x: number;
  y: number;
  width: number;
  height: number;
  personId?: string;
  label?: string;
  confidence?: number;
  /** 128-d face descriptor — persisted after detection for faster gallery matching */
  embedding?: number[];
  /** Recognition match distance (lower = stronger match) */
  matchDistance?: number;
}

export function getItemTags(item: MemoryItem): string[] {
  const tags = item.metadata.tags;
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [];
}

export function getItemFaces(item: MemoryItem): FaceRegion[] {
  const faces = item.metadata.faces;
  if (!Array.isArray(faces)) return [];
  return faces.filter(
    (f): f is FaceRegion =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as FaceRegion).id === "string" &&
      typeof (f as FaceRegion).x === "number",
  );
}

export function isPhotoItem(item: MemoryItem): boolean {
  if (item.type === "photo" || item.type === "video") return true;
  return (item.mediaRefs ?? []).some((ref) => ref.mimeType?.startsWith("image/"));
}

export function photoItems(items: MemoryItem[]): MemoryItem[] {
  return items.filter(isPhotoItem);
}

export function filterPhotos(
  items: MemoryItem[],
  filters: { year?: string; tag?: string; personId?: string },
): MemoryItem[] {
  let list = photoItems(items);
  if (filters.year) {
    list = list.filter((i) => i.occurredAt.startsWith(filters.year!));
  }
  if (filters.tag) {
    const tag = filters.tag.toLowerCase();
    list = list.filter((i) => getItemTags(i).some((t) => t.toLowerCase() === tag));
  }
  if (filters.personId) {
    list = list.filter((i) => {
      if (i.personIds.includes(filters.personId!)) return true;
      return getItemFaces(i).some((f) => f.personId === filters.personId);
    });
  }
  return list.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export function allPhotoTags(items: MemoryItem[]): string[] {
  const set = new Set<string>();
  for (const item of photoItems(items)) {
    for (const tag of getItemTags(item)) set.add(tag);
  }
  return [...set].sort();
}

export function photoYears(items: MemoryItem[]): string[] {
  const set = new Set<string>();
  for (const item of photoItems(items)) {
    set.add(item.occurredAt.slice(0, 4));
  }
  return [...set].sort().reverse();
}

export type PhotoFilterPreset = "none" | "grayscale" | "sepia" | "warm" | "cool" | "vintage";

export const PHOTO_FILTER_CSS: Record<PhotoFilterPreset, string> = {
  none: "none",
  grayscale: "grayscale(1)",
  sepia: "sepia(0.85)",
  warm: "sepia(0.35) saturate(1.2)",
  cool: "hue-rotate(15deg) saturate(0.9)",
  vintage: "sepia(0.5) contrast(0.95) brightness(1.05)",
};
