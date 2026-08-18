import type { Context, Next } from "hono";

const API_TOKEN = process.env.MEMORIUM_API_TOKEN;
const MAX_UPLOAD_BYTES = parseInt(process.env.MEMORIUM_MAX_UPLOAD_MB ?? "100", 10) * 1024 * 1024;

const READ_ONLY_PATHS = new Set([
  "/memorial",
  "/people",
  "/items",
  "/search",
  "/timeline",
  "/today",
  "/stats",
  "/import/sources",
  "/health",
]);

type ShareValidator = (token: string) => boolean;

let shareValidator: ShareValidator | null = null;

export function setShareValidator(fn: ShareValidator): void {
  shareValidator = fn;
}

function getShareToken(c: Context): string | null {
  const header = c.req.header("X-Share-Token");
  if (header) return header;
  const query = c.req.query("token");
  return query ?? null;
}

function isReadOnlyRequest(c: Context): boolean {
  if (c.req.method !== "GET") return false;
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/media/")) return true;
  return READ_ONLY_PATHS.has(path) || path === "/";
}

/** Optional bearer token auth when MEMORIUM_API_TOKEN is set; share tokens allow read-only GET */
export async function authMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;

  if (path === "/" || path === "/health") {
    await next();
    return;
  }

  const shareToken = getShareToken(c);
  if (shareToken && shareValidator?.(shareToken) && isReadOnlyRequest(c)) {
    await next();
    return;
  }

  if (!API_TOKEN) {
    await next();
    return;
  }

  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${API_TOKEN}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}

export function getMaxUploadBytes(): number {
  return MAX_UPLOAD_BYTES;
}
