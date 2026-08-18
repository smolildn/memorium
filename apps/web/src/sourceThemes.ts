export type PlatformLayout = "default" | "chat" | "facebook" | "instagram" | "email";

export interface SourceTheme {
  id: string;
  label: string;
  layout: PlatformLayout;
  themeClass: string;
  /** Short tagline shown in the platform chrome bar */
  chromeTitle: string;
  accentColor?: string;
}

export const SOURCE_THEMES: Record<string, SourceTheme> = {
  meta_facebook: {
    id: "meta_facebook",
    label: "Facebook",
    layout: "facebook",
    themeClass: "theme-facebook",
    chromeTitle: "Facebook",
    accentColor: "#1877f2",
  },
  meta_instagram: {
    id: "meta_instagram",
    label: "Instagram",
    layout: "instagram",
    themeClass: "theme-instagram",
    chromeTitle: "Instagram",
    accentColor: "#e1306c",
  },
  meta_messenger: {
    id: "meta_messenger",
    label: "Messenger",
    layout: "chat",
    themeClass: "theme-messenger",
    chromeTitle: "Messenger",
    accentColor: "#0084ff",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    layout: "chat",
    themeClass: "theme-whatsapp",
    chromeTitle: "WhatsApp",
    accentColor: "#25d366",
  },
  imessage: {
    id: "imessage",
    label: "Messages",
    layout: "chat",
    themeClass: "theme-imessage",
    chromeTitle: "Messages",
    accentColor: "#007aff",
  },
  google_messages: {
    id: "google_messages",
    label: "Messages",
    layout: "chat",
    themeClass: "theme-google-messages",
    chromeTitle: "Messages",
    accentColor: "#1a73e8",
  },
  sms: {
    id: "sms",
    label: "Messages",
    layout: "chat",
    themeClass: "theme-sms",
    chromeTitle: "Messages",
    accentColor: "#34a853",
  },
  email: {
    id: "email",
    label: "Gmail",
    layout: "email",
    themeClass: "theme-email",
    chromeTitle: "Mail",
    accentColor: "#ea4335",
  },
  manual: {
    id: "manual",
    label: "Archive",
    layout: "default",
    themeClass: "theme-archive",
    chromeTitle: "Archive",
  },
  unknown: {
    id: "unknown",
    label: "Other",
    layout: "default",
    themeClass: "theme-archive",
    chromeTitle: "Memories",
  },
};

export function getSourceTheme(source: string): SourceTheme | null {
  return SOURCE_THEMES[source] ?? null;
}

export function isFromSubject(item: { metadata: Record<string, unknown> }, subjectName: string): boolean {
  const sender = item.metadata.sender;
  if (typeof sender !== "string") return false;
  const normalizedSender = sender.toLowerCase().trim();
  const normalizedSubject = subjectName.toLowerCase().trim();
  const firstName = normalizedSubject.split(" ")[0] ?? normalizedSubject;
  return normalizedSender === normalizedSubject || normalizedSender === firstName;
}

export function getSenderName(item: { metadata: Record<string, unknown>; title?: string }): string {
  if (typeof item.metadata.sender === "string") return item.metadata.sender;
  if (item.title?.includes(" from ")) {
    return item.title.split(" from ").pop() ?? "Unknown";
  }
  if (typeof item.metadata.from === "string") {
    const from = item.metadata.from as string;
    return from.split("@")[0]?.replace(/\./g, " ") ?? from;
  }
  return "Unknown";
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatChatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Group consecutive items by calendar day for chat date separators. */
export function groupByDay<T extends { occurredAt: string }>(items: T[]): Array<{ date: string; items: T[] }> {
  const groups: Array<{ date: string; items: T[] }> = [];
  let currentDate = "";

  for (const item of items) {
    const date = item.occurredAt.slice(0, 10);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, items: [item] });
    } else {
      groups[groups.length - 1]?.items.push(item);
    }
  }

  return groups;
}
