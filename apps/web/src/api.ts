export interface Memorial {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface MemoryItem {
  id: string;
  type: string;
  source: string;
  title?: string;
  text: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  items: MemoryItem[];
  total: number;
}

export interface TimelinePeriod {
  period: string;
  count: number;
}

export interface ChatResponse {
  content: string;
  citations: Array<{ itemId: string; excerpt: string }>;
}

export interface ImportSource {
  id: string;
  label: string;
  description: string;
  extensions: string[];
  exportSteps: string[];
  exportUrl?: string;
  tips?: string[];
}

export interface ImportResult {
  ok: boolean;
  filename: string;
  source: string;
  adapter: string;
  stored: number;
  duplicates: number;
  itemsImported: number;
  errors: string[];
  durationMs: number;
  progress: string[];
}

export { api, isDemoMode } from "./client-api.js";

export const SOURCE_LABELS: Record<string, string> = {
  meta_facebook: "Facebook",
  meta_instagram: "Instagram",
  meta_messenger: "Messenger",
  email: "Email",
  whatsapp: "WhatsApp",
  google_messages: "Google Messages",
  sms: "Android SMS",
  imessage: "iMessage",
  manual: "Archive",
  unknown: "Other",
};

export const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  message: "Message",
  email: "Email",
  photo: "Photo",
  video: "Video",
  note: "Note",
  story: "Story",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}
