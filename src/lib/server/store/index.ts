import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import type { Store } from "./types";

let store: Store | undefined;

export function getStore(): Store {
  store ??= process.env.DATABASE_URL ? postgresStore(process.env.DATABASE_URL) : memoryStore();
  return store;
}

export type { Report, ReportContext, ReportType } from "./types";
