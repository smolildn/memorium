import type { MemoryItem, SearchQuery, SearchResult } from "@memorium/core";
import type { Vault } from "@memorium/storage";

interface ItemRow {
  id: string;
  memorial_id: string;
  type: string;
  source: string;
  source_id: string | null;
  title: string | null;
  text: string;
  occurred_at: string;
  imported_at: string;
  person_ids: string;
  media_refs: string;
  metadata: string;
  content_hash: string;
}

function rowToItem(row: ItemRow): MemoryItem {
  return {
    id: row.id,
    memorialId: row.memorial_id,
    type: row.type as MemoryItem["type"],
    source: row.source as MemoryItem["source"],
    sourceId: row.source_id ?? undefined,
    title: row.title ?? undefined,
    text: row.text,
    occurredAt: row.occurred_at,
    importedAt: row.imported_at,
    personIds: JSON.parse(row.person_ids) as string[],
    mediaRefs: JSON.parse(row.media_refs) as MemoryItem["mediaRefs"],
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    contentHash: row.content_hash,
  };
}

export function search(vault: Vault, query: SearchQuery): SearchResult {
  const db = vault.getDb();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (query.q && query.q.trim().length > 0) {
    const ftsQuery = query.q
      .trim()
      .split(/\s+/)
      .map((t) => `"${t.replace(/"/g, '""')}"`)
      .join(" ");

    const ftsRows = db
      .prepare(
        `SELECT item_id FROM memory_items_fts WHERE memory_items_fts MATCH ? ORDER BY rank`,
      )
      .all(ftsQuery) as Array<{ item_id: string }>;

    const itemIds = ftsRows.map((r) => r.item_id);
    if (itemIds.length === 0) {
      return { items: [], total: 0, query };
    }
    conditions.push(`id IN (${itemIds.map(() => "?").join(", ")})`);
    params.push(...itemIds);
  }

  if (query.types?.length) {
    conditions.push(`type IN (${query.types.map(() => "?").join(", ")})`);
    params.push(...query.types);
  }

  if (query.sources?.length) {
    conditions.push(`source IN (${query.sources.map(() => "?").join(", ")})`);
    params.push(...query.sources);
  }

  if (query.from) {
    conditions.push("occurred_at >= ?");
    params.push(query.from);
  }

  if (query.to) {
    conditions.push("occurred_at <= ?");
    params.push(query.to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM memory_items ${where}`)
    .get(...params) as unknown as { total: number };

  const rows = db
    .prepare(
      `SELECT * FROM memory_items ${where} ORDER BY occurred_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, query.limit, query.offset) as unknown as ItemRow[];

  return {
    items: rows.map(rowToItem),
    total: countRow.total,
    query,
  };
}

/** Returns memories matching today's month and day across all years */
export function onThisDay(vault: Vault, date: Date = new Date()): MemoryItem[] {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const pattern = `%-${month}-${day}%`;

  const rows = vault
    .getDb()
    .prepare(
      `SELECT * FROM memory_items WHERE occurred_at LIKE ? ORDER BY occurred_at`,
    )
    .all(pattern) as unknown as ItemRow[];

  return rows.map(rowToItem);
}

/** Timeline grouped by year-month */
export function timeline(
  vault: Vault,
  from?: string,
  to?: string,
): Array<{ period: string; count: number }> {
  const db = vault.getDb();
  const conditions: string[] = [];
  const params: string[] = [];

  if (from) {
    conditions.push("occurred_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("occurred_at <= ?");
    params.push(to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT substr(occurred_at, 1, 7) as period, COUNT(*) as count
       FROM memory_items ${where}
       GROUP BY period ORDER BY period`,
    )
    .all(...params) as Array<{ period: string; count: number }>;
}

export function listItems(
  vault: Vault,
  options: { limit?: number; offset?: number; source?: string; type?: string } = {},
): SearchResult {
  return search(vault, {
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
    sources: options.source ? [options.source as MemoryItem["source"]] : undefined,
    types: options.type ? [options.type as MemoryItem["type"]] : undefined,
  });
}

export function stats(vault: Vault): Record<string, number> {
  const db = vault.getDb();
  const byType = db
    .prepare("SELECT type, COUNT(*) as count FROM memory_items GROUP BY type")
    .all() as Array<{ type: string; count: number }>;

  const bySource = db
    .prepare("SELECT source, COUNT(*) as count FROM memory_items GROUP BY source")
    .all() as Array<{ source: string; count: number }>;

  const result: Record<string, number> = { total: vault.getItemCount() };
  for (const row of byType) result[`type:${row.type}`] = row.count;
  for (const row of bySource) result[`source:${row.source}`] = row.count;
  return result;
}
