import type { MemoryItem } from "../api";

export interface MemoryCollection {
  id: string;
  emoji: string;
  title: string;
  description: string;
  keywords: string[];
}

export const MEMORY_COLLECTIONS: MemoryCollection[] = [
  {
    id: "kitchen",
    emoji: "🍳",
    title: "Kitchen & recipes",
    description: "Meals, recipes, and Sunday traditions",
    keywords: ["recipe", "cook", "dinner", "arroz", "flan", "cookie", "empanada", "kitchen", "food"],
  },
  {
    id: "family",
    emoji: "💕",
    title: "Family & love",
    description: "Messages of love and support",
    keywords: ["love", "mijo", "mija", "princesa", "family", "proud", "miss you", "abuela"],
  },
  {
    id: "holidays",
    emoji: "🎉",
    title: "Holidays & celebrations",
    description: "Birthdays, quinceañeras, and gatherings",
    keywords: ["birthday", "christmas", "thanksgiving", "quinceañera", "turkey", "party", "reunion"],
  },
  {
    id: "garden",
    emoji: "🌹",
    title: "Garden & nature",
    description: "Roses, flowers, and the neighborhood garden",
    keywords: ["garden", "rose", "roses", "flower", "bloom", "spring", "market"],
  },
  {
    id: "advice",
    emoji: "💬",
    title: "Words of wisdom",
    description: "Advice, reminders, and gentle nudges",
    keywords: ["don't forget", "drive safe", "eat", "coat", "patience", "secret", "warm"],
  },
];

export function matchCollection(item: MemoryItem, collection: MemoryCollection): boolean {
  const haystack = [item.title, item.text, item.type, item.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return collection.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

export function itemsForCollection(items: MemoryItem[], collectionId: string): MemoryItem[] {
  const collection = MEMORY_COLLECTIONS.find((c) => c.id === collectionId);
  if (!collection) return [];
  return items.filter((item) => matchCollection(item, collection));
}

export function quoteOfDay(items: MemoryItem[], date = new Date()): string | null {
  const withText = items.filter((i) => i.text.trim().length > 20);
  if (withText.length === 0) return null;
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const index = seed % withText.length;
  const item = withText[index]!;
  const text = item.text.trim();
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

export function randomMemory(items: MemoryItem[]): MemoryItem | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function groupOnThisDayByYear(items: MemoryItem[]): Array<{ year: string; items: MemoryItem[] }> {
  const groups = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const year = item.occurredAt.slice(0, 4);
    const list = groups.get(year) ?? [];
    list.push(item);
    groups.set(year, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, yearItems]) => ({ year, items: yearItems }));
}

export function extractPeople(items: MemoryItem[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    if (typeof item.metadata.sender === "string") names.add(item.metadata.sender);
  }
  return [...names].sort();
}
