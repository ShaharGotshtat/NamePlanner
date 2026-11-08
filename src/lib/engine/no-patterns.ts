import type { NameEntry } from "@/lib/types";
import { featuresOf } from "@/lib/names/catalog";

/** Below this many No votes there is too little to tell a pattern from chance. */
export const MIN_NO_VOTES = 3;
/** Share of the No names that must have the trait. */
const MIN_SHARE = 0.6;

export type PatternTrait = "ending" | "syllables" | "length" | "origin" | "style" | "theme" | "popularity";

export interface NoPattern {
  trait: PatternTrait;
  value: string;
  /** Hebrew, for the model prompt and logs. */
  label: string;
  count: number;
}

const lengthBand = (letters: number) => (letters <= 3 ? "short" : letters >= 5 ? "long" : "medium");
const popularityBand = (entry: NameEntry) => {
  const rank = entry.stats.at(-1)?.rank ?? Infinity;
  return rank <= 20 ? "top20" : rank <= 100 ? "common" : "rare";
};

const LABELS: Record<PatternTrait, (value: string) => string> = {
  ending: (v) => `מסתיים ב-${v}`,
  syllables: (v) => `${v} הברות`,
  length: (v) => ({ short: "שם קצר", medium: "שם באורך בינוני", long: "שם ארוך" })[v] ?? v,
  origin: (v) => `מקור: ${v}`,
  style: (v) => `סגנון: ${v}`,
  theme: (v) => `נושא: ${v}`,
  popularity: (v) => ({ top20: "בטופ 20", common: "שם נפוץ", rare: "שם נדיר" })[v] ?? v,
};

/** Every trait value a name has. A name can have several themes. */
function traitsOf(entry: NameEntry): [PatternTrait, string][] {
  const f = featuresOf(entry);
  return [
    ["ending", f.ending],
    ["syllables", String(f.syllables)],
    ["length", lengthBand(f.letters)],
    ["origin", entry.origin],
    ["style", entry.tags.style],
    ["popularity", popularityBand(entry)],
    ...entry.tags.meaningCategories.map((c): [PatternTrait, string] => ["theme", c]),
  ];
}

const key = (trait: PatternTrait, value: string) => `${trait}:${value}`;

/**
 * Traits that most No names share and no Interesting name has.
 * A trait an Interesting name also has is not what the parent is rejecting.
 */
export function findNoPatterns(noNames: NameEntry[], interestingNames: NameEntry[]): NoPattern[] {
  if (noNames.length < MIN_NO_VOTES) return [];
  const liked = new Set(interestingNames.flatMap((e) => traitsOf(e).map(([t, v]) => key(t, v))));
  const counts = new Map<string, { trait: PatternTrait; value: string; count: number }>();
  for (const entry of noNames) {
    for (const [trait, value] of new Map(traitsOf(entry).map(([t, v]) => [key(t, v), [t, v] as const])).values()) {
      const k = key(trait, value);
      const current = counts.get(k) ?? { trait, value, count: 0 };
      counts.set(k, { ...current, count: current.count + 1 });
    }
  }
  const needed = Math.max(MIN_NO_VOTES, Math.ceil(noNames.length * MIN_SHARE));
  return [...counts.entries()]
    .filter(([k, c]) => c.value && c.count >= needed && !liked.has(k))
    .map(([, c]) => ({ ...c, label: LABELS[c.trait](c.value) }))
    .sort((a, b) => b.count - a.count);
}

export const matchesPattern = (entry: NameEntry, pattern: NoPattern) =>
  traitsOf(entry).some(([t, v]) => t === pattern.trait && v === pattern.value);
