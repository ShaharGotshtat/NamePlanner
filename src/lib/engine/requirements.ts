import type { ChipId, ChipLevel, ExplanationLine, Fit, NameEntry, RoundRequest, TextRequirement } from "@/lib/types";
import { featuresOf, nameSex, wasInTop } from "@/lib/names/catalog";
import { normalizeHebrew } from "@/lib/names/features";
import { chipLabel } from "./chips";
import { closest, profileOfText, type NameProfile } from "./similarity";

export interface MatchContext {
  siblings: NameProfile[];
  surname: string;
  dueLinks: string[];
}

export function matchContext(req: Pick<RoundRequest, "family" | "surname" | "dueDerived">): MatchContext {
  const due = req.dueDerived;
  return {
    siblings: req.family.filter((f) => f.relation === "sibling").map((f) => profileOfText(f.name)),
    surname: normalizeHebrew(req.surname),
    dueLinks: due ? [due.hebrewMonth, due.holiday, due.zodiac, due.season].filter((v): v is string => !!v) : [],
  };
}

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
      const match = closest({ features: featuresOf(entry), entry }, ctx.siblings);
      if (!match) return null;
      if (match.score >= 0.67) return { fit: "met", detail: "באורך ובצליל של שמות האחים" };
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
    const match = closest({ features: featuresOf(entry), entry }, ctx.siblings);
    if (match && match.score >= 0.67) {
      lines.push({ requirement: "הטעם של שמות האחים", fit: "met", detail: "באורך ובצליל של שמות האחים" });
    }
  }

  return { lines, mustsMet, wantsMet, wantsTotal };
}
