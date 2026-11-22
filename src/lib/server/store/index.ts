import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import type { Store } from "./types";

// Kept on globalThis: in development, route handlers and pages can load separate copies of this module,
// and the in-memory store must be shared between them.
const holder = globalThis as { nameplannerStore?: Store };

export function getStore(): Store {
  holder.nameplannerStore ??= process.env.DATABASE_URL ? postgresStore(process.env.DATABASE_URL) : memoryStore();
  return holder.nameplannerStore;
}

export type { FeedbackFlag, Report, ReportContext, ReportType } from "./types";
