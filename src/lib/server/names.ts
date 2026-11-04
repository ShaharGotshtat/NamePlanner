import type { NameEntry } from "@/lib/types";
import { getStore } from "./store";

const CACHE_MS = 10 * 60 * 1000;
let cache: { names: NameEntry[]; loadedAt: number } | undefined;

export async function getNames(): Promise<NameEntry[]> {
  if (!cache || Date.now() - cache.loadedAt > CACHE_MS) {
    cache = { names: await getStore().loadNames(), loadedAt: Date.now() };
  }
  return cache.names;
}
