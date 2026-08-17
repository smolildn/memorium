/** Parse XML self-closing or open tags and extract attributes */
export function parseXmlAttributes(tagContent: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w-]+)=("([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tagContent)) !== null) {
    attrs[match[1]!] = match[3] ?? match[4] ?? "";
  }
  return attrs;
}

/** Find all elements matching tag name and return their attribute maps */
export function extractXmlElements(xml: string, tagName: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  const re = new RegExp(`<${tagName}\\s+([^>/]+)(?:/>|>)`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    results.push(parseXmlAttributes(match[1]!));
  }
  return results;
}

export function epochMsToIso(ms: string | number): string {
  const n = typeof ms === "string" ? parseInt(ms, 10) : ms;
  if (Number.isNaN(n) || n <= 0) return new Date().toISOString();
  return new Date(n).toISOString();
}

/** Apple chat.db stores nanoseconds since 2001-01-01 */
export function appleEpochToIso(raw: string | number): string {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (Number.isNaN(n)) return new Date().toISOString();
  const APPLE_EPOCH_MS = Date.UTC(2001, 0, 1);
  const ms = n > 1e15 ? n / 1_000_000 : n > 1e12 ? n / 1_000 : n * 1000;
  return new Date(APPLE_EPOCH_MS + ms).toISOString();
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, "\n");
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}
