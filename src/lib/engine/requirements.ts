import type { ChipId, ChipLevel, ExplanationLine, Fit, NameEntry, RoundRequest, TextRequirement } from "@/lib/types";
import { featuresOf, findByName, nameSex, wasInTop } from "@/lib/names/catalog";
import { normalizeHebrew } from "@/lib/names/features";
import { chipLabel } from "./chips";
import { closest, profileOf, profileOfText, type NameProfile } from "./similarity";

export interface MatchContext {
  siblings: NameProfile[];
  surname: string;
  dueLinks: string[];
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
    dueLinks: due ? [due.hebrewMonth, due.holiday, due.zodiac, due.season].filter((v): v is string => !!v) : [],
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

/** Returns null when the parent gave no data to check the chip against. */
function checkChip(id: ChipId, entry: NameEntry, ctx: MatchContext): Check | null {
  switch (id) {
    case "unisex":
      return fit(nameSex(entry) === "unisex", "ניתן גם לבנים וגם לבנות", "ניתן בעיקר למין אחד");
    case "englishFriendly":
      return fit(entry.tags.englishFriendly, "קל להגייה ולאיות באנגלית", "יש בו צליל שקשה לדוברי אנגלית");
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
    case "dueDateLink": {
      const link = entry.tags.links.find((l) => ctx.dueLinks.includes(l));
      if (!ctx.dueLinks.length) return null;
      return fit(!!link, `קשור ל${link}`, "אין לו קשר לתאריך הלידה");
    }
    case "fitsSiblings": {
      const match = closest(profileOf(entry), ctx.siblings);
      if (!match) return null;
      if (match.score >= SIBLING_MATCH) return { fit: "met", detail: `בסגנון של ${match.profile.name}` };
      if (match.score >= 0.34) return { fit: "partly", detail: "דומה בחלק מהמאפיינים לשמות האחים" };
      return { fit: "not_met", detail: "שונה בסגנון משמות האחים" };
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

function matchesFacet(req: TextRequirement, entry: NameEntry): boolean {
  const features = featuresOf(entry);
  const name = normalizeHebrew(entry.nameHe);
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
    case "ending":
      return req.values.some((v) => name.endsWith(normalizeHebrew(v)));
    case "popularity":
      return req.values.some((v) => matchesPopularity(v, entry));
  }
}

export function checkText(req: TextRequirement, entry: NameEntry): Check {
  const matches = matchesFacet(req, entry);
  const ok = req.kind === "want" ? matches : !matches;
  return { fit: ok ? "met" : "not_met", detail: ok ? "מתאים" : "לא מתאים לבקשה הזו" };
}

export interface Evaluation {
  lines: ExplanationLine[];
  mustsMet: boolean;
  wantsMet: number;
  wantsTotal: number;
}

export function evaluate(entry: NameEntry, req: Pick<RoundRequest, "chips" | "profile">, ctx: MatchContext): Evaluation {
  const lines: ExplanationLine[] = [];
  let mustsMet = true;
  let wantsMet = 0;
  let wantsTotal = 0;

  for (const [id, level] of Object.entries(req.chips) as [ChipId, ChipLevel][]) {
    const check = checkChip(id, entry, ctx);
    if (!check) continue;
    const label = level === "must" ? `${chipLabel(id)} (חובה)` : chipLabel(id);
    lines.push({ requirement: label, ...check });
    if (level === "must") mustsMet &&= check.fit === "met";
    else {
      wantsTotal++;
      if (check.fit !== "not_met") wantsMet++;
    }
  }

  for (const text of req.profile?.requirements ?? []) {
    const check = checkText(text, entry);
    lines.push({ requirement: text.label, ...check });
    wantsTotal++;
    if (check.fit === "met") wantsMet++;
  }

  if (ctx.siblings.length && !req.chips.fitsSiblings) {
    const match = closest(profileOf(entry), ctx.siblings);
    if (match && match.score >= SIBLING_MATCH) {
      lines.push({ requirement: "הטעם של שמות האחים", fit: "met", detail: `בסגנון של ${match.profile.name}` });
    }
  }

  return { lines, mustsMet, wantsMet, wantsTotal };
}
