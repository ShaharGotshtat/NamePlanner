import type { NameEntry, StyleAxes } from "@/lib/types";
import { featuresOf } from "@/lib/names/catalog";
import { computeFeatures, type NameFeatures } from "@/lib/names/features";

/** What we know about a name for comparing styles. Names outside the database only have features. */
export interface NameProfile {
  name: string;
  features: NameFeatures;
  entry?: NameEntry;
}

export const profileOf = (entry: NameEntry): NameProfile => ({ name: entry.nameHe, features: featuresOf(entry), entry });
export const profileOfText = (name: string): NameProfile => ({ name, features: computeFeatures(name) });

const popularityBand = (entry: NameEntry) => {
  const rank = entry.stats.at(-1)?.rank ?? Infinity;
  return rank <= 10 ? 0 : rank <= 50 ? 1 : 2;
};

/** Two 1-5 scores: 1 when equal, 0.5 when one step apart, 0 when further apart. */
const closeness = (a: number, b: number) => Math.max(0, 1 - Math.abs(a - b) / 2);

const STYLE_AXES: (keyof StyleAxes)[] = ["era", "reach", "religious"];

/**
 * 0 to 1: how alike two names are by length, sound, origin, meaning, popularity and style.
 * Each item counts the same. When both names have style scores, their three axes replace the
 * coarse style tag, so the feel of a name (era, reach abroad, religious or secular) weighs about
 * a third of the result.
 */
export function similarity(a: NameProfile, b: NameProfile): number {
  const scores = [
    Math.abs(a.features.letters - b.features.letters) <= 1 ? 1 : 0,
    a.features.syllables === b.features.syllables ? 1 : 0,
    a.features.ending === b.features.ending ? 1 : 0,
    closeness(a.features.sound, b.features.sound),
  ];
  if (a.entry && b.entry) {
    const sharedMeaning = a.entry.tags.meaningCategories.some((c) => b.entry!.tags.meaningCategories.includes(c));
    scores.push(
      a.entry.origin === b.entry.origin ? 1 : 0,
      sharedMeaning ? 1 : 0,
      popularityBand(a.entry) === popularityBand(b.entry) ? 1 : 0,
    );
    const axesA = a.entry.styleAxes;
    const axesB = b.entry.styleAxes;
    if (axesA && axesB) scores.push(...STYLE_AXES.map((axis) => closeness(axesA[axis], axesB[axis])));
    else scores.push(a.entry.tags.style === b.entry.tags.style ? 1 : 0);
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
