import type { SourceAdapter } from "@memorium/core";

import { SmsBackupRestoreAdapter } from "./adapters/android-sms.js";
import { EmailAdapter } from "./adapters/email.js";
import { GoogleMessagesAdapter } from "./adapters/google-messages.js";
import { ImageAdapter } from "./adapters/image.js";
import { IMessageAdapter } from "./adapters/imessage.js";
import { MetaAdapter } from "./adapters/meta.js";
import { WhatsAppAdapter } from "./adapters/whatsapp.js";

const ADAPTERS: SourceAdapter[] = [
  new MetaAdapter(),
  new EmailAdapter(),
  new WhatsAppAdapter(),
  new SmsBackupRestoreAdapter(),
  new GoogleMessagesAdapter(),
  new IMessageAdapter(),
  new ImageAdapter(),
];

export function getAdapters(): SourceAdapter[] {
  return ADAPTERS;
}

export async function detectAdapter(inputPath: string): Promise<SourceAdapter | null> {
  let best: SourceAdapter | null = null;
  let bestScore = 0;

  for (const adapter of ADAPTERS) {
    const score = await adapter.detect(inputPath);
    if (score > bestScore) {
      bestScore = score;
      best = adapter;
    }
  }

  return bestScore >= 0.5 ? best : null;
}

export function getAdapterById(id: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}
