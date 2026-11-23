import type { NameEntry } from "@/lib/types";

/**
 * The one definition of how common a name is, used everywhere: the card label, popularity wishes,
 * No-vote patterns, similarity and the facts given to the model.
 *
 * The median rank in the latest CBS year (2024): half of the babies of that sex got a name ranked
 * at or above it. Common is at or above the median, rare is below it. tests/popularity.test.ts checks
 * these against data/cbs, so update them when the data gets a new year.
 */
export const MEDIAN_RANK = { girl: 47, boy: 38 } as const;
/** "Very rare" or "special" names: below this rank. */
export const VERY_RARE_RANK = 150;

export type Commonness = "common" | "rare" | "veryRare";

/** Card wording, so "בלי שמות נפוצים" removes exactly the names whose card says נפוץ. */
export const COMMONNESS_LABELS: Record<Commonness, string> = {
  common: "נפוץ",
  rare: "פחות נפוץ",
  veryRare: "נדיר",
};

/** A name is ranked in the list of its main sex, so a unisex name uses that sex's median. */
export const medianRankFor = (entry: NameEntry) => (entry.sexRatio >= 0.5 ? MEDIAN_RANK.boy : MEDIAN_RANK.girl);

export function commonness(entry: NameEntry): Commonness {
  const rank = entry.stats.at(-1)?.rank ?? Infinity;
  if (rank <= medianRankFor(entry)) return "common";
  return rank > VERY_RARE_RANK ? "veryRare" : "rare";
}
