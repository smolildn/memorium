import type { Context, Next } from "hono";

const API_TOKEN = process.env.MEMORIUM_API_TOKEN;
const MAX_UPLOAD_BYTES = parseInt(process.env.MEMORIUM_MAX_UPLOAD_MB ?? "100", 10) * 1024 * 1024;

/** Optional bearer token auth when MEMORIUM_API_TOKEN is set */
export async function authMiddleware(c: Context, next: Next) {
  if (!API_TOKEN) {
    await next();
    return;
  }

  const path = new URL(c.req.url).pathname;
  if (path === "/" || path === "/health") {
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
