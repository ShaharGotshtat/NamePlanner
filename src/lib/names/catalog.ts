import type { BabySex, NameEntry, NameSex, YearStat } from "@/lib/types";
import { computeFeatures, normalizeHebrew, type NameFeatures } from "./features";

const UNISEX_LOW = 0.2;
const UNISEX_HIGH = 0.8;

export function nameSex(entry: NameEntry): NameSex {
  if (entry.sexRatio > UNISEX_HIGH) return "boy";
  if (entry.sexRatio < UNISEX_LOW) return "girl";
  return "unisex";
}

export function fitsBabySex(entry: NameEntry, babySex: BabySex): boolean {
  if (babySex === "boy") return entry.sexRatio >= UNISEX_LOW;
  if (babySex === "girl") return entry.sexRatio <= UNISEX_HIGH;
  return true;
}

export type Trend = "rising" | "falling" | "steady";

export interface Popularity {
  latest: YearStat;
  trend: Trend;
}

export function popularity(entry: NameEntry): Popularity {
  const [previous, latest] = entry.stats.slice(-2);
  const change = previous ? latest.count / previous.count : 1;
  const trend: Trend = change > 1.05 ? "rising" : change < 0.95 ? "falling" : "steady";
  return { latest, trend };
}

export function wasInTop(entry: NameEntry, top: number, lastYears: number): boolean {
  return entry.stats.slice(-lastYears).some((s) => s.rank <= top);
}

const featureCache = new Map<number, NameFeatures>();

export function featuresOf(entry: NameEntry): NameFeatures {
  let features = featureCache.get(entry.id);
  if (!features) {
    features = computeFeatures(entry.nameHe, entry.translit[0]);
    featureCache.set(entry.id, features);
  }
  return features;
}

export function findByName(names: NameEntry[], name: string): NameEntry | undefined {
  const key = normalizeHebrew(name);
  return names.find((n) => normalizeHebrew(n.nameHe) === key);
}
