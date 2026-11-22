import type { ChipId, ChipLevel, ExplanationLine, Fit, NameEntry, RoundRequest, TextRequirement } from "@/lib/types";
import { featuresOf, findByName, nameSex, wasInTop } from "@/lib/names/catalog";
import { normalizeHebrew } from "@/lib/names/features";
import { dueChipLabel, dueHeadline, linkCodes, linkLabel, type LinkCode } from "@/lib/links";
import { chipLabel, isFilterChip } from "./chips";
import { closest, profileOf, profileOfText, type NameProfile } from "./similarity";

export interface MatchContext {
  siblings: NameProfile[];
  surname: string;
  /** Codes of what the due date is linked to, and the chip's label naming them. */
  dueLinks: LinkCode[];
  dueLabel: string | null;
  dueHeadline: string | null;
}

/** Siblings found in the name list are compared on everything we know about them, including style. */
export function matchContext(req: Pick<RoundRequest, "family" | "surname" | "dueDerived">, names: NameEntry[] = []): MatchContext {
  const due = req.dueDerived;
  const profileOfName = (name: string) => {
    const entry = findByName(names, name);
    return entry ? profileOf(entry) : profileOfText(name);
  };
  return {
    siblings: req.family.filter((f) => f.relation === "sibling").map((f) => profileOfName(f.name)),
    surname: normalizeHebrew(req.surname),
    dueLinks: due ? linkCodes(due.links ?? [due.hebrewMonth, due.holiday, due.zodiac, due.season]) : [],
    dueLabel: due ? dueChipLabel(due) : null,
    dueHeadline: due ? dueHeadline(due) : null,
  };
}

/** Similarity at which a name counts as being in the siblings' style. */
export const SIBLING_MATCH = 0.67;

interface Check {
  fit: Fit;
  detail: string;
}

const fit = (ok: boolean, yes: string, no: string): Check => (ok ? { fit: "met", detail: yes } : { fit: "not_met", detail: no });

function surnameClashes(entry: NameEntry, surname: string): string[] {
  const name = normalizeHebrew(entry.nameHe);
  const clashes: string[] = [];
  if (name[0] === surname[0]) clashes.push("אותה אות פותחת");
  if (name.at(-1) === surname.at(-1)) clashes.push("חריזה בסוף");
  if (name.at(-1) === surname[0]) clashes.push("השם נבלע בשם המשפחה");
  return clashes;
}

/** Met when the name is linked to something around the due date; partly when it is linked only to other dates. */
export function dueDateFit(entry: NameEntry, ctx: MatchContext): Check | null {
  if (!ctx.dueLinks.length) return null;
  const own = linkCodes(entry.tags.links);
  const hit = own.find((code) => ctx.dueLinks.includes(code));
  if (hit) return { fit: "met", detail: `קשור ל${linkLabel(hit)}` };
  if (own.length) return { fit: "partly", detail: `${own.map(linkLabel).join(", ")}, לא ${ctx.dueHeadline}` };
  return { fit: "not_met", detail: "אין לו קשר לתאריך הלידה" };
}

/** Below this many names linked to the due date, the parent is told the pool is small. */
export const FEW_DUE_NAMES = 15;

/** Says plainly when few names in the pool meet the due date wish, for example "יש לנו רק 8 שמות שקשורים לפסח". */
export function dueDateNotice(names: NameEntry[], req: Pick<RoundRequest, "babySex" | "chips" | "dueDerived">): string | null {
  const due = req.dueDerived;
  if (!req.chips.dueDateLink || !due) return null;
  // Counts only what the message names (the holiday or month, and the season), among names for this baby's sex.
  const named = linkCodes([due.holiday ?? due.hebrewMonth, due.season]);
  const otherSex = req.babySex === "girl" ? "boy" : req.babySex === "boy" ? "girl" : null;
  const count = names.filter((n) => nameSex(n) !== otherSex && linkCodes(n.tags.links).some((c) => named.includes(c))).length;
  if (count >= FEW_DUE_NAMES) return null;
  const to = `ל${dueHeadline(due)} או ל${due.season}`;
  if (count === 0) return `אין לנו עדיין שמות שקשורים ${to}.`;
  if (count === 1) return `יש לנו רק שם אחד שקשור ${to}.`;
  return `יש לנו רק ${count} שמות שקשורים ${to}.`;
}

/** Chips where a partial fit earns nothing: a name linked to another holiday does not answer the wish. */
const NO_PARTIAL_CREDIT: ChipId[] = ["dueDateLink"];

/** Returns null when the parent gave no data to check the chip against. */
function checkChip(id: ChipId, entry: NameEntry, ctx: MatchContext): Check | null {
  switch (id) {
    case "noUnisex":
      return fit(nameSex(entry) !== "unisex", "ניתן בעיקר למין אחד", "ניתן גם לבנים וגם לבנות");
    case "englishFriendly":
      return fit(entry.tags.englishFriendly, "קל להגייה ולאיות באנגלית", "יש בו צליל שקשה להגות באנגלית");
    case "oneSpelling":
      return fit(entry.tags.singleSpelling, "נכתב רק בדרך אחת", "יש לו יותר מכתיב מקובל אחד");
    case "clearMeaning":
      return fit(entry.tags.hebrewWord, `משמעות: ${entry.meaningHe}`, "המקור שלו אינו עברי");
    case "notTop20": {
      const latest = entry.stats.at(-1)!;
      return fit(!wasInTop(entry, 20, 2), `מקום ${latest.rank} ב-${latest.year}`, `היה בטופ 20 בשנתיים האחרונות`);
    }
    case "grandparentFriendly":
      return fit(entry.tags.style !== "modern", "שם מוכר שעובר בין הדורות", "שם מודרני יחסית");
    case "dueDateLink":
      return dueDateFit(entry, ctx);
    case "fitsSiblings": {
      const match = closest(profileOf(entry), ctx.siblings);
      if (!match) return null;
      if (match.score >= SIBLING_MATCH) return { fit: "met", detail: `בסגנון של ${match.profile.name}` };
      if (match.score >= 0.34) return { fit: "partly", detail: "דומה בחלק מהמאפיינים לשמות האחים והאחיות" };
      return { fit: "not_met", detail: "שונה בסגנון משמות האחים והאחיות" };
    }
    case "flowsWithSurname": {
      if (!ctx.surname) return null;
      const clashes = surnameClashes(entry, ctx.surname);
      if (!clashes.length) return { fit: "met", detail: "נשמע טוב עם שם המשפחה" };
      return { fit: clashes.length === 1 ? "partly" : "not_met", detail: clashes.join(", ") };
    }
  }
}

/**
 * The median rank in the latest CBS year (2024): half of the babies of that sex got a name ranked
 * at or above it. Common is at or above the median, rare is below it. tests/popularity.test.ts checks
 * these against data/cbs, so update them when the data gets a new year.
 */
export const MEDIAN_RANK = { girl: 47, boy: 38 } as const;
/** "Very rare" or "special" names: below this rank. */
export const VERY_RARE_RANK = 150;

/** A name is ranked in the list of its main sex, so a unisex name uses that sex's median. */
const medianFor = (entry: NameEntry) => (entry.sexRatio >= 0.5 ? MEDIAN_RANK.boy : MEDIAN_RANK.girl);

function matchesPopularity(value: string, entry: NameEntry): boolean {
  const rank = entry.stats.at(-1)?.rank ?? Infinity;
  if (value === "common") return rank <= medianFor(entry);
  if (value === "rare") return rank > medianFor(entry);
  return rank > VERY_RARE_RANK;
}

const BIBLICAL_WORDS = /תנ["״׳']?[כך]|מקרא|biblical|bible/i;

/**
 * Themes are checked against the name's tags only. If the model maps a biblical wish
 * to origin or any other facet, it is moved to the biblical tag, so a name like תכלת
 * (its word appears in the Tanakh, but it is not tagged biblical) is judged by its tag.
 */
export function normalizeThemeRequirement<T extends Omit<TextRequirement, "id">>(req: T): T {
  if (req.facet === "meaningCategory" || !BIBLICAL_WORDS.test(req.label)) return req;
  return { ...req, facet: "meaningCategory", values: ["biblical"] };
}

/** Letter wishes (starts with, ends with) are checked on every spelling of the name, see spellingFor. */
export const isLetterFacet = (facet: TextRequirement["facet"]) => facet === "starting" || facet === "ending";

const GERESH = /['׳`’]/g;
/** Letters that change sound with a geresh (ג׳ in ג׳וליה). After any other letter a geresh only names the letter (נ׳). */
const GERESH_LETTERS = "גזצת";

/**
 * A letter value as the parser or a parent may write it ("נ׳", "ב-ס", "ן", "ג'") becomes plain
 * Hebrew letters with final forms folded, and a geresh kept only where it changes the sound.
 */
export function normalizeLetters(value: string): string {
  const text = normalizeHebrew(value).replace(GERESH, "׳").replace(/[^א-ת׳]/g, "");
  return text
    .replace(/(.)׳/g, (match, letter: string) => (GERESH_LETTERS.includes(letter) ? match : letter))
    .replace(/^׳+/, "")
    .slice(0, 4);
}

const spellingLetters = (spelling: string) => normalizeHebrew(spelling).replace(GERESH, "׳").replace(/[^א-ת׳]/g, "");

/** A plain letter covers its geresh sound too ("ג" matches ג׳וליה); "ג׳" matches only ג׳ names. */
function matchesLetters(req: TextRequirement, spelling: string): boolean {
  const letters = spellingLetters(spelling);
  return req.values.some((v) => {
    const value = normalizeLetters(v);
    if (!value) return false;
    const name = value.includes("׳") ? letters : letters.replace(/׳/g, "");
    return req.facet === "starting" ? name.startsWith(value) : name.endsWith(value);
  });
}

const letterFit = (req: TextRequirement, spelling: string) => matchesLetters(req, spelling) === (req.kind === "want");

/**
 * The spelling to show: the main one, unless only another spelling parents use meets the letter
 * wishes (a ט wish shows טום for תום). Musts decide first, then as many wants as possible.
 */
export function spellingFor(entry: NameEntry, requirements: TextRequirement[]): string {
  const letterReqs = requirements.filter((r) => isLetterFacet(r.facet));
  const spellings = [entry.nameHe, ...(entry.variants ?? [])];
  if (!letterReqs.length || spellings.length === 1) return entry.nameHe;
  const rank = (spelling: string) =>
    letterReqs.reduce((sum, r) => sum + (letterFit(r, spelling) ? (r.level === "must" ? 100 : 1) : 0), 0);
  return spellings.reduce((best, s) => (rank(s) > rank(best) ? s : best), entry.nameHe);
}

function matchesFacet(req: TextRequirement, entry: NameEntry, spelling: string): boolean {
  const features = featuresOf(entry);
  switch (req.facet) {
    case "meaningCategory":
      return entry.tags.meaningCategories.some((c) => req.values.includes(c));
    case "origin":
      return req.values.includes(entry.origin);
    case "style":
      return req.values.includes(entry.tags.style);
    case "length":
      return req.values.some((v) =>
        v === "short" ? features.syllables <= 2 && features.letters <= 3 : features.syllables >= 3 || features.letters >= 5,
      );
    case "starting":
    case "ending":
      return matchesLetters(req, spelling);
    case "popularity":
      return req.values.some((v) => matchesPopularity(v, entry));
  }
}

export function checkText(req: TextRequirement, entry: NameEntry, spelling = entry.nameHe): Check {
  const matches = matchesFacet(req, entry, spelling);
  const ok = req.kind === "want" ? matches : !matches;
  return { fit: ok ? "met" : "not_met", detail: ok ? "מתאים" : "לא מתאים לבקשה הזו" };
}

export interface Evaluation {
  lines: ExplanationLine[];
  mustsMet: boolean;
  wantsMet: number;
  wantsTotal: number;
  /** The spelling the letter wishes were checked on, and the one to show. */
  spelling: string;
}

export function evaluate(entry: NameEntry, req: Pick<RoundRequest, "chips" | "profile">, ctx: MatchContext): Evaluation {
  const lines: ExplanationLine[] = [];
  let mustsMet = true;
  let wantsMet = 0;
  let wantsTotal = 0;

  for (const [id, level] of Object.entries(req.chips) as [ChipId, ChipLevel][]) {
    const check = checkChip(id, entry, ctx);
    if (!check) continue;
    if (isFilterChip(id)) {
      mustsMet &&= check.fit === "met";
      continue;
    }
    const name = id === "dueDateLink" && ctx.dueLabel ? ctx.dueLabel : chipLabel(id);
    const label = level === "must" ? `${name} (חובה)` : name;
    lines.push({ requirement: label, ...check });
    if (level === "must") mustsMet &&= check.fit === "met";
    else {
      wantsTotal++;
      if (check.fit === "met" || (check.fit === "partly" && !NO_PARTIAL_CREDIT.includes(id))) wantsMet++;
    }
  }

  const texts = req.profile?.requirements ?? [];
  const spelling = spellingFor(entry, texts);
  for (const text of texts) {
    const check = checkText(text, entry, spelling);
    if (text.level === "must") {
      // Too few names that pass means shorter rounds, never a name that misses the wish.
      mustsMet &&= check.fit === "met";
      lines.push({ requirement: `${text.label} (חובה)`, ...check });
      continue;
    }
    lines.push({ requirement: text.label, ...check });
    wantsTotal++;
    if (check.fit === "met") wantsMet++;
  }

  if (ctx.siblings.length && !req.chips.fitsSiblings) {
    const match = closest(profileOf(entry), ctx.siblings);
    if (match && match.score >= SIBLING_MATCH) {
      lines.push({ requirement: "הטעם של שמות האחים והאחיות", fit: "met", detail: `בסגנון של ${match.profile.name}` });
    }
  }

  return { lines, mustsMet, wantsMet, wantsTotal, spelling };
}
