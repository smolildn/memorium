import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Memorial, MemoryItem, Person } from "@memorium/core";
import { generateId, nowIso } from "@memorium/core";

import { SCHEMA_SQL } from "./schema.js";

export interface VaultOptions {
  vaultPath: string;
}

export class Vault {
  private db: DatabaseSync;
  readonly vaultPath: string;

  constructor(options: VaultOptions) {
    this.vaultPath = options.vaultPath;
    this.db = new DatabaseSync(join(options.vaultPath, "vault.db"));
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(SCHEMA_SQL);
    this.migrate();
  }

  private migrate(): void {
    const cols = this.db.prepare("PRAGMA table_info(people)").all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === "face_embedding")) {
      this.db.exec("ALTER TABLE people ADD COLUMN face_embedding TEXT");
    }
  }

  static async create(vaultPath: string, name: string): Promise<{ vault: Vault; memorial: Memorial }> {
    await mkdir(join(vaultPath, "media", "photos"), { recursive: true });
    await mkdir(join(vaultPath, "media", "videos"), { recursive: true });
    await mkdir(join(vaultPath, "media", "attachments"), { recursive: true });
    await mkdir(join(vaultPath, "exports"), { recursive: true });

    const vault = new Vault({ vaultPath });
    const personId = generateId();
    const memorialId = generateId();
    const now = nowIso();

    const person: Person = {
      id: personId,
      name,
      isSubject: true,
    };

    const memorial: Memorial = {
      id: memorialId,
      name,
      subjectPersonId: personId,
      createdAt: now,
      updatedAt: now,
      vaultPath,
    };

    vault.insertPerson(person);
    vault.insertMemorial(memorial);

    await writeFile(
      join(vaultPath, "config.json"),
      JSON.stringify({ memorial, person }, null, 2),
    );

    return { vault, memorial };
  }

  static open(vaultPath: string): Vault {
    return new Vault({ vaultPath });
  }

  insertMemorial(memorial: Memorial): void {
    this.db
      .prepare(
        `INSERT INTO memorials (id, name, description, subject_person_id, created_at, updated_at, vault_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        memorial.id,
        memorial.name,
        memorial.description ?? null,
        memorial.subjectPersonId,
        memorial.createdAt,
        memorial.updatedAt,
        memorial.vaultPath,
      );
  }

  getMemorial(): Memorial | null {
    const row = this.db.prepare("SELECT * FROM memorials LIMIT 1").get() as Record<string, string> | undefined;
    if (!row) return null;
    return {
      id: row["id"]!,
      name: row["name"]!,
      description: row["description"] ?? undefined,
      subjectPersonId: row["subject_person_id"]!,
      createdAt: row["created_at"]!,
      updatedAt: row["updated_at"]!,
      vaultPath: row["vault_path"]!,
    };
  }

  getSubjectPerson(): Person | null {
    const row = this.db
      .prepare("SELECT * FROM people WHERE is_subject = 1 LIMIT 1")
      .get() as Record<string, string | number> | undefined;
    if (!row) return null;
    return this.rowToPerson(row);
  }

  listPeople(): Person[] {
    const rows = this.db.prepare("SELECT * FROM people ORDER BY is_subject DESC, name").all() as Array<
      Record<string, string | number>
    >;
    return rows.map((row) => this.rowToPerson(row));
  }

  getPerson(id: string): Person | null {
    const row = this.db.prepare("SELECT * FROM people WHERE id = ?").get(id) as
      | Record<string, string | number>
      | undefined;
    if (!row) return null;
    return this.rowToPerson(row);
  }

  updatePerson(
    id: string,
    patch: Partial<Pick<Person, "name" | "relationship" | "avatarPath" | "bornAt" | "diedAt" | "faceEmbedding">>,
  ): boolean {
    const current = this.getPerson(id);
    if (!current) return false;

    const next: Person = {
      ...current,
      ...patch,
    };

    this.db
      .prepare(
        `UPDATE people SET name = ?, relationship = ?, avatar_path = ?, born_at = ?, died_at = ?, face_embedding = ?
         WHERE id = ?`,
      )
      .run(
        next.name,
        next.relationship ?? null,
        next.avatarPath ?? null,
        next.bornAt ?? null,
        next.diedAt ?? null,
        next.faceEmbedding ? JSON.stringify(next.faceEmbedding) : null,
        id,
      );
    return true;
  }

  updateMemorial(
    patch: Partial<Pick<Memorial, "name" | "description">>,
  ): Memorial | null {
    const memorial = this.getMemorial();
    if (!memorial) return null;

    const next: Memorial = {
      ...memorial,
      ...patch,
      updatedAt: nowIso(),
    };

    this.db
      .prepare(`UPDATE memorials SET name = ?, description = ?, updated_at = ? WHERE id = ?`)
      .run(next.name, next.description ?? null, next.updatedAt, next.id);

    return next;
  }

  getItem(id: string): MemoryItem | null {
    const row = this.db.prepare("SELECT * FROM memory_items WHERE id = ?").get(id) as
      | Record<string, string>
      | undefined;
    if (!row) return null;
    return this.rowToItem(row);
  }

  updateItem(
    id: string,
    patch: Partial<Pick<MemoryItem, "title" | "text" | "personIds" | "metadata">>,
  ): MemoryItem | null {
    const current = this.getItem(id);
    if (!current) return null;

    const next: MemoryItem = {
      ...current,
      ...patch,
      metadata: patch.metadata ? { ...current.metadata, ...patch.metadata } : current.metadata,
    };

    this.db
      .prepare(
        `UPDATE memory_items SET title = ?, text = ?, person_ids = ?, metadata = ? WHERE id = ?`,
      )
      .run(
        next.title ?? null,
        next.text,
        JSON.stringify(next.personIds),
        JSON.stringify(next.metadata),
        id,
      );

    return next;
  }

  private rowToPerson(row: Record<string, string | number>): Person {
    const faceRaw = row["face_embedding"] as string | undefined;
    let faceEmbedding: number[] | undefined;
    if (faceRaw) {
      try {
        const parsed = JSON.parse(faceRaw) as unknown;
        if (Array.isArray(parsed) && parsed.length === 128) {
          faceEmbedding = parsed as number[];
        }
      } catch {
        /* ignore corrupt embedding */
      }
    }
    return {
      id: row["id"] as string,
      name: row["name"] as string,
      relationship: (row["relationship"] as string) ?? undefined,
      isSubject: Boolean(row["is_subject"]),
      avatarPath: (row["avatar_path"] as string) ?? undefined,
      bornAt: (row["born_at"] as string) ?? undefined,
      diedAt: (row["died_at"] as string) ?? undefined,
      faceEmbedding,
    };
  }

  private rowToItem(row: Record<string, string>): MemoryItem {
    return {
      id: row["id"]!,
      memorialId: row["memorial_id"]!,
      type: row["type"] as MemoryItem["type"],
      source: row["source"] as MemoryItem["source"],
      sourceId: row["source_id"] ?? undefined,
      title: row["title"] ?? undefined,
      text: row["text"] ?? "",
      occurredAt: row["occurred_at"]!,
      importedAt: row["imported_at"]!,
      personIds: JSON.parse(row["person_ids"] ?? "[]") as string[],
      mediaRefs: JSON.parse(row["media_refs"] ?? "[]") as MemoryItem["mediaRefs"],
      metadata: JSON.parse(row["metadata"] ?? "{}") as Record<string, unknown>,
      contentHash: row["content_hash"]!,
    };
  }

  createShareGrant(label?: string): { token: string; expiresAt: string } {
    const memorial = this.getMemorial();
    if (!memorial) throw new Error("No memorial initialized");

    const token = generateId();
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    this.db
      .prepare(
        `INSERT INTO share_grants (id, memorial_id, token, role, label, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(generateId(), memorial.id, token, "viewer", label ?? null, now, expiresAt);

    return { token, expiresAt };
  }

  isShareTokenValid(token: string): boolean {
    const now = nowIso();
    const row = this.db
      .prepare(
        `SELECT id FROM share_grants WHERE token = ? AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .get(token, now);
    return Boolean(row);
  }

  insertPerson(person: Person): void {
    this.db
      .prepare(
        `INSERT INTO people (id, name, relationship, is_subject, avatar_path, born_at, died_at, face_embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        person.id,
        person.name,
        person.relationship ?? null,
        person.isSubject ? 1 : 0,
        person.avatarPath ?? null,
        person.bornAt ?? null,
        person.diedAt ?? null,
        person.faceEmbedding ? JSON.stringify(person.faceEmbedding) : null,
      );
  }

  storeItem(item: MemoryItem): boolean {
    const existing = this.db
      .prepare("SELECT id FROM memory_items WHERE content_hash = ?")
      .get(item.contentHash) as { id: string } | undefined;

    if (existing) return false;

    this.db
      .prepare(
        `INSERT INTO memory_items
         (id, memorial_id, type, source, source_id, title, text, occurred_at, imported_at, person_ids, media_refs, metadata, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        item.id,
        item.memorialId,
        item.type,
        item.source,
        item.sourceId ?? null,
        item.title ?? null,
        item.text,
        item.occurredAt,
        item.importedAt,
        JSON.stringify(item.personIds),
        JSON.stringify(item.mediaRefs),
        JSON.stringify(item.metadata),
        item.contentHash,
      );

    return true;
  }

  getItemCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM memory_items").get() as { count: number };
    return row.count;
  }

  getDb(): DatabaseSync {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

export { SCHEMA_SQL } from "./schema.js";
export { sanitizeFilename, storeVaultMedia, resolveVaultMediaPath } from "./media.js";
