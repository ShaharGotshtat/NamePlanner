import type { NameEntry } from "../src/lib/types";
import { findByName } from "../src/lib/names/catalog";
import { profileOf, similarity } from "../src/lib/engine/similarity";

/**
 * Real sibling sets, used only to measure how well similarity() recognizes names parents put
 * together. The file stays out of the repository (data/private/ is ignored): the sets come from
 * real families, and a rare combination can identify one.
 *
 * Format: one set per line, names separated by tabs, in the order given. "/m" or "/f" after a
 * name marks a boy or a girl. Lines starting with # are comments.
 */
export const DEFAULT_SETS_PATH = "data/private/sibling-sets.tsv";

export function parseSiblingSets(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) =>
      line
        .split("\t")
        .map((cell) => cell.trim().replace(/\/[mf]$/, "").trim())
        .filter(Boolean),
    )
    .filter((set) => set.length >= 2);
}

export interface SiblingReport {
  sets: number;
  mentions: number;
  missing: string[];
  pairs: number;
  repeatedPairs: [string, number][];
  /** Mean share of the other listed names that rank below a held-out sibling. 0.5 = chance. */
  heldOutPercentile: number;
  heldOutCount: number;
}

/**
 * For each name in each set, hide it and rank every other name in the batch by its closeness to the
 * remaining siblings (the same max-similarity the round ranking uses). The candidates are names from
 * the batch, not the whole list, so the batch's own skew (one circle, one era) doesn't count as skill.
 */
export function evaluateSiblingSets(sets: string[][], names: NameEntry[]): SiblingReport {
  const missing = new Set<string>();
  let mentions = 0;
  const matched = sets
    .map((set) =>
      set
        .map((name) => {
          mentions++;
          const entry = findByName(names, name);
          if (!entry) missing.add(name);
          return entry;
        })
        .filter((e): e is NameEntry => !!e),
    )
    .map((set) => [...new Map(set.map((e) => [e.id, e])).values()])
    .filter((set) => set.length >= 2);

  const pairCounts = new Map<string, number>();
  for (const set of matched)
    for (let i = 0; i < set.length; i++)
      for (let j = i + 1; j < set.length; j++) {
        const key = [set[i].nameHe, set[j].nameHe].sort().join(" + ");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }

  const pool = [...new Map(matched.flat().map((e) => [e.id, e])).values()];
  const percentiles: number[] = [];
  for (const set of matched) {
    const others = pool.filter((p) => !set.some((s) => s.id === p.id));
    for (const target of set) {
      const siblings = set.filter((s) => s.id !== target.id).map(profileOf);
      const fit = (e: NameEntry) => Math.max(...siblings.map((s) => similarity(profileOf(e), s)));
      const t = fit(target);
      let below = 0;
      for (const o of others) {
        const f = fit(o);
        below += f < t ? 1 : f === t ? 0.5 : 0;
      }
      percentiles.push(below / others.length);
    }
  }

  return {
    sets: sets.length,
    mentions,
    missing: [...missing],
    pairs: pairCounts.size,
    repeatedPairs: [...pairCounts].filter(([, n]) => n > 1),
    heldOutPercentile: percentiles.reduce((s, p) => s + p, 0) / Math.max(1, percentiles.length),
    heldOutCount: percentiles.length,
  };
}
