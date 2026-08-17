export { MetaAdapter } from "./adapters/meta.js";
export { EmailAdapter } from "./adapters/email.js";
export { ImageAdapter } from "./adapters/image.js";
export { WhatsAppAdapter } from "./adapters/whatsapp.js";
export { SmsBackupRestoreAdapter } from "./adapters/android-sms.js";
export { GoogleMessagesAdapter } from "./adapters/google-messages.js";
export { IMessageAdapter } from "./adapters/imessage.js";

export { getAdapters, detectAdapter, getAdapterById } from "./registry.js";
export { IMPORT_SOURCES, getImportSource, formatExportGuide, type ImportSourceGuide } from "./import-sources.js";
export { runIngest, saveUpload, type IngestSummary } from "./run.js";
