import type { NameEntry, NameSex, RoundRequest, Suggestion } from "@/lib/types";
import { findByName, fitsBabySex, nameSex } from "@/lib/names/catalog";
import { normalizeHebrew } from "@/lib/names/features";
import { evaluate, matchContext, type Evaluation, type MatchContext } from "./requirements";
import { closest, profileOf, profileOfText, similarity, type NameProfile } from "./similarity";
import { findNoPatterns, matchesPattern, type NoPattern } from "./no-patterns";

export const ROUND_SIZE = 3;
export const MODEL_CANDIDATES = 60;

const WEIGHTS = { want: 2, interesting: 3, unsure: 1, noPattern: -1.5, reference: 1.5, sibling: 1, diversity: 2 };
const LIKED_MATCH = 0.6;
/** Traits overlap (a short name is also a 2-syllable name), so a name is pushed down for at most two of them. */
const MAX_PATTERN_HITS = 2;

export interface Candidate {
  entry: NameEntry;
  sex: NameSex;
  score: number;
  evaluation: Evaluation;
  likedMatch: string | null;
}

interface Signals {
  ctx: MatchContext;
  byVerdict: Record<"interesting" | "unsure", NameProfile[]>;
  references: NameProfile[];
  noPatterns: NoPattern[];
}

function signalsFor(names: NameEntry[], req: RoundRequest): Signals {
  const byId = new Map(names.map((n) => [n.id, n]));
  const byVerdict: Signals["byVerdict"] = { interesting: [], unsure: [] };
  const noEntries: NameEntry[] = [];
  const interestingEntries: NameEntry[] = [];
  for (const r of req.ratings) {
    const entry = byId.get(r.nameId);
    if (!entry || r.verdict === "taken") continue;
    // A No never pushes similar names down by itself: its note becomes an avoid wish through the
    // free-text parser, and from 3 No votes their shared traits count (see no-patterns.ts).
    if (r.verdict === "no") {
      noEntries.push(entry);
      continue;
    }
    if (r.verdict === "interesting") interestingEntries.push(entry);
    byVerdict[r.verdict].push(profileOf(entry));
  }
  const references = req.namesWeLike.map((n) => {
    const entry = findByName(names, n);
    return entry ? profileOf(entry) : profileOfText(n);
  });
  const noPatterns = findNoPatterns(noEntries, interestingEntries);
  return { ctx: matchContext(req), byVerdict, references, noPatterns };
}

function score(entry: NameEntry, req: RoundRequest, signals: Signals): Candidate | null {
  const evaluation = evaluate(entry, req, signals.ctx);
  if (!evaluation.mustsMet) return null;

  const self = profileOf(entry);
  const near = (profiles: NameProfile[]) => closest(self, profiles)?.score ?? 0;
  const liked = closest(self, signals.byVerdict.interesting);
  const value =
    evaluation.wantsMet * WEIGHTS.want +
    near(signals.byVerdict.interesting) * WEIGHTS.interesting +
    near(signals.byVerdict.unsure) * WEIGHTS.unsure +
    near(signals.references) * WEIGHTS.reference +
    near(signals.ctx.siblings) * WEIGHTS.sibling +
    Math.min(MAX_PATTERN_HITS, signals.noPatterns.filter((p) => matchesPattern(entry, p)).length) * WEIGHTS.noPattern;

  if (liked && liked.score >= LIKED_MATCH) {
    evaluation.lines.push({
      requirement: "השמות שסימנתם כמעניינים",
      fit: "met",
      detail: `בסגנון של ${liked.profile.entry!.nameHe}`,
    });
  }

  return {
    entry,
    sex: nameSex(entry),
    score: value,
    evaluation,
    likedMatch: liked && liked.score >= LIKED_MATCH ? liked.profile.entry!.nameHe : null,
  };
}

const byScore = (a: Candidate, b: Candidate) => b.score - a.score;

/** Hard rules first (sex, family names, names already shown or declined, Musts), then the heuristic score. */
export function rankCandidates(names: NameEntry[], req: RoundRequest): Candidate[] {
  const blockedIds = new Set([...req.shownIds, ...req.ratings.map((r) => r.nameId)]);
  const blockedNames = new Set([...req.family.map((f) => f.name), ...req.namesWeLike, ...req.declined].map(normalizeHebrew));
  const signals = signalsFor(names, req);

  const passing = names
    .filter((n) => fitsBabySex(n, req.babySex) && !blockedIds.has(n.id) && !blockedNames.has(normalizeHebrew(n.nameHe)))
    .map((n) => score(n, req, signals))
    .filter((c): c is Candidate => c !== null)
    .sort(byScore);

  const mostWants = passing.filter((c) => c.evaluation.wantsMet * 2 >= c.evaluation.wantsTotal);
  return mostWants.length >= ROUND_SIZE ? mostWants : passing;
}

const SLOTS_FOR_UNKNOWN: NameSex[] = ["boy", "girl", "unisex"];

/** Picks strong names that differ from each other, so each round also tests a direction. */
export function pickDiverse(candidates: Candidate[], babySex: RoundRequest["babySex"]): Candidate[] {
  const picked: Candidate[] = [];
  const slots: (NameSex | null)[] = babySex === "unknown" ? SLOTS_FOR_UNKNOWN : Array(ROUND_SIZE).fill(null);

  for (const slot of slots) {
    const pool = candidates.filter((c) => !picked.includes(c));
    const inSlot = slot ? pool.filter((c) => c.sex === slot) : pool;
    const choices = inSlot.length ? inSlot : pool;
    const adjusted = (c: Candidate) =>
      c.score - WEIGHTS.diversity * Math.max(0, ...picked.map((p) => similarity(profileOf(c.entry), profileOf(p.entry))));
    const best = choices.reduce<Candidate | null>((top, c) => (!top || adjusted(c) > adjusted(top) ? c : top), null);
    if (best) picked.push(best);
  }
  return picked;
}

/** What the No votes so far have in common, for the model prompt. */
export const noPatternsFor = (names: NameEntry[], req: RoundRequest) => signalsFor(names, req).noPatterns;

export function standardReason(c: Candidate): string {
  const meaning = `משמעות: ${c.entry.meaningHe}.`;
  if (c.likedMatch) return `בסגנון של ${c.likedMatch} שאהבתם. ${meaning}`;
  const { wantsMet, wantsTotal } = c.evaluation;
  if (wantsTotal) return `עונה על ${wantsMet} מתוך ${wantsTotal} מההעדפות שלכם. ${meaning}`;
  return meaning;
}

export function toSuggestion(c: Candidate, reason: string): Suggestion {
  return { name: c.entry, sex: c.sex, reason, explanation: c.evaluation.lines };
}

/**
 * Our pick: one name already shown, never one marked No or taken.
 * A Not sure name comes first; otherwise the shown name that fits the preferences best.
 */
export function chooseOurPick(names: NameEntry[], req: RoundRequest): Candidate | null {
  const verdicts = new Map(req.ratings.map((r) => [r.nameId, r.verdict]));
  const familyNames = new Set(req.family.map((f) => normalizeHebrew(f.name)));
  const signals = signalsFor(names, req);
  const shown = names
    .filter((n) => req.shownIds.includes(n.id) && !familyNames.has(normalizeHebrew(n.nameHe)))
    .filter((n) => !["no", "taken"].includes(verdicts.get(n.id) ?? ""))
    .map((n) => score(n, req, signals))
    .filter((c): c is Candidate => c !== null)
    .sort(byScore);
  return shown.find((c) => verdicts.get(c.entry.id) === "unsure") ?? shown[0] ?? null;
}
