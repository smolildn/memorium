import { z } from "zod";

/** Supported content types in the vault */
export const MemoryTypeSchema = z.enum([
  "post",
  "message",
  "email",
  "photo",
  "video",
  "note",
  "story",
  "call_log",
]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

/** Where the content originally came from */
export const SourcePlatformSchema = z.enum([
  "meta_facebook",
  "meta_instagram",
  "meta_messenger",
  "email",
  "sms",
  "imessage",
  "whatsapp",
  "google_messages",
  "google_photos",
  "manual",
  "unknown",
]);
export type SourcePlatform = z.infer<typeof SourcePlatformSchema>;

/** A tagged person (the loved one or someone appearing in content) */
export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  relationship: z.string().optional(),
  isSubject: z.boolean().default(false),
  avatarPath: z.string().optional(),
  bornAt: z.string().datetime().optional(),
  diedAt: z.string().datetime().optional(),
  /** 128-d face descriptor for recognition (browser-computed, stored locally) */
  faceEmbedding: z.array(z.number()).length(128).optional(),
});
export type Person = z.infer<typeof PersonSchema>;

/** Reference to a media file stored in the vault */
export const MediaRefSchema = z.object({
  id: z.string().uuid(),
  vaultPath: z.string(),
  mimeType: z.string(),
  originalFilename: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSec: z.number().optional(),
  thumbnailPath: z.string().optional(),
});
export type MediaRef = z.infer<typeof MediaRefSchema>;

/** The atomic unit of memorial content */
export const MemoryItemSchema = z.object({
  id: z.string().uuid(),
  memorialId: z.string().uuid(),
  type: MemoryTypeSchema,
  source: SourcePlatformSchema,
  sourceId: z.string().optional(),
  title: z.string().optional(),
  text: z.string().default(""),
  occurredAt: z.string().datetime(),
  importedAt: z.string().datetime(),
  personIds: z.array(z.string().uuid()).default([]),
  mediaRefs: z.array(MediaRefSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
  /** SHA-256 of normalized content for deduplication */
  contentHash: z.string(),
});
export type MemoryItem = z.infer<typeof MemoryItemSchema>;

/** Top-level vault representing one loved one's archive */
export const MemorialSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  subjectPersonId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  vaultPath: z.string(),
});
export type Memorial = z.infer<typeof MemorialSchema>;

/** Family sharing grant */
export const ShareRoleSchema = z.enum(["viewer", "contributor", "admin"]);
export type ShareRole = z.infer<typeof ShareRoleSchema>;

export const ShareGrantSchema = z.object({
  id: z.string().uuid(),
  memorialId: z.string().uuid(),
  token: z.string().uuid(),
  role: ShareRoleSchema,
  label: z.string().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});
export type ShareGrant = z.infer<typeof ShareGrantSchema>;

/** Result of an ingest operation */
export const IngestResultSchema = z.object({
  adapterId: z.string(),
  itemsImported: z.number(),
  itemsSkipped: z.number(),
  mediaFilesCopied: z.number(),
  errors: z.array(z.string()).default([]),
  durationMs: z.number(),
});
export type IngestResult = z.infer<typeof IngestResultSchema>;

/** Search query parameters */
export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  types: z.array(MemoryTypeSchema).optional(),
  sources: z.array(SourcePlatformSchema).optional(),
  personIds: z.array(z.string().uuid()).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultSchema = z.object({
  items: z.array(MemoryItemSchema),
  total: z.number(),
  query: SearchQuerySchema,
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

/** Contract every source adapter must implement */
export interface SourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly supportedPlatforms: SourcePlatform[];

  /** Returns 0–1 confidence that this adapter can handle the input */
  detect(inputPath: string): Promise<number>;

  /** Parse export and yield normalized memory items */
  ingest(
    inputPath: string,
    memorialId: string,
    onProgress?: (message: string) => void,
  ): AsyncGenerator<MemoryItem, IngestResult>;
}

/** Contract for AI providers */
export interface AIProvider {
  embed(texts: string[]): Promise<number[][]>;
  chat(messages: ChatMessage[], context: MemoryItem[]): Promise<ChatResponse>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  content: string;
  citations: Array<{ itemId: string; excerpt: string }>;
}

export { generateId, contentHash, nowIso } from "./utils.js";
