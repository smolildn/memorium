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

  insertPerson(person: Person): void {
    this.db
      .prepare(
        `INSERT INTO people (id, name, relationship, is_subject, avatar_path, born_at, died_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        person.id,
        person.name,
        person.relationship ?? null,
        person.isSubject ? 1 : 0,
        person.avatarPath ?? null,
        person.bornAt ?? null,
        person.diedAt ?? null,
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
