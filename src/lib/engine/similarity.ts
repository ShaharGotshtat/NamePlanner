import type { NameEntry } from "@/lib/types";
import { featuresOf } from "@/lib/names/catalog";
import { computeFeatures, type NameFeatures } from "@/lib/names/features";

/** What we know about a name for comparing styles. Names outside the database only have features. */
export interface NameProfile {
  features: NameFeatures;
  entry?: NameEntry;
}

export const profileOf = (entry: NameEntry): NameProfile => ({ features: featuresOf(entry), entry });
export const profileOfText = (name: string): NameProfile => ({ features: computeFeatures(name) });

const popularityBand = (entry: NameEntry) => {
  const rank = entry.stats.at(-1)?.rank ?? Infinity;
  return rank <= 10 ? 0 : rank <= 50 ? 1 : 2;
};

/** 0 to 1: how alike two names are by length, sound, origin, meaning and style. */
export function similarity(a: NameProfile, b: NameProfile): number {
  const scores = [
    Math.abs(a.features.letters - b.features.letters) <= 1 ? 1 : 0,
    a.features.syllables === b.features.syllables ? 1 : 0,
    a.features.ending === b.features.ending ? 1 : 0,
  ];
  if (a.entry && b.entry) {
    const sharedMeaning = a.entry.tags.meaningCategories.some((c) => b.entry!.tags.meaningCategories.includes(c));
    scores.push(
      a.entry.origin === b.entry.origin ? 1 : 0,
      sharedMeaning ? 1 : 0,
      a.entry.tags.style === b.entry.tags.style ? 1 : 0,
      popularityBand(a.entry) === popularityBand(b.entry) ? 1 : 0,
    );
  }
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

export function closest(target: NameProfile, others: NameProfile[]): { profile: NameProfile; score: number } | null {
  let best: { profile: NameProfile; score: number } | null = null;
  for (const other of others) {
    const score = similarity(target, other);
    if (!best || score > best.score) best = { profile: other, score };
  }
  return best;
}
