import type { MemoryItem } from "./api";

type MediaRef = NonNullable<MemoryItem["mediaRefs"]>[number];

/** Resolve a demo or vault media path to a browser URL. */
export function mediaUrl(ref: MediaRef): string {
  const path = ref.vaultPath ?? ref.path ?? "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.replace(/^\//, "");
  if (normalized.startsWith("media/")) {
    const apiBase = import.meta.env.VITE_API_BASE ?? "/api";
    return `${apiBase}/media/${normalized.slice("media/".length)}`;
  }
  return `${import.meta.env.BASE_URL}${normalized}`;
}
