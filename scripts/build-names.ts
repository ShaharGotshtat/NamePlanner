import { readFileSync, writeFileSync } from "node:fs";
import { readStyles } from "./styles";
import { linkCode } from "../src/lib/links";
import { averageBirthYear, eraOfYear } from "../src/lib/names/era";
import type { MeaningCategory, NameEntry, Origin, Style, YearStat } from "../src/lib/types";

/** Names given to fewer babies than this in 2000-2024 are too rare for the lists. */
const MIN_BABIES = 50;
const FROM_YEAR = 2000;
const NOT_RANKED = 9999;
/** Single words CBS lists that are really half of a double name (בת שבע, היא-לי, שר שלום). */
const FRAGMENTS = new Set(["בת", "שבע", "היא", "שר"]);

const CATEGORIES: Record<string, MeaningCategory> = {
  טבע: "nature",
  אור: "light",
  עוצמה: "strength",
  שמחה: "joy",
  אמונה: "faith",
  אהבה: "love",
  יופי: "beauty",
  שלום: "peace",
  חוכמה: "wisdom",
  מתנה: "gift",
  מלכות: "royalty",
  חיים: "life",
  משפחה: "family",
  לאום: "nation",
  "תנ״כי": "biblical",
  תכונה: "trait",
};

const ORIGINS: [string, Origin][] = [
  ["תנ״ך", "hebrew"],
  ["עברית", "hebrew"],
  ["תלמוד", "hebrew"],
  ["מדרש", "hebrew"],
  ["ארמית", "aramaic"],
  ["ערבית", "arabic"],
  ["יוונית", "greek"],
  ["לטינית", "latin"],
  ["פרסית", "persian"],
  ["יידיש", "yiddish"],
  ["אנגלית", "english"],
];

/** The values the due-date chip matches: months, holidays, zodiac signs and seasons. */
const list = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

function primaryOrigin(originHe: string): Origin {
  for (const part of originHe.split(";").map((p) => p.trim())) {
    const match = ORIGINS.find(([label]) => part.startsWith(label));
    if (match) return match[1];
    if (!part.startsWith("טבע")) return "other";
  }
  return "other";
}

/** Holidays, months, signs and seasons, stored as fixed codes (see src/lib/links.ts). Other notes are dropped. */
function links(value: string): string[] {
  const cleaned = list(value).map((l) => l.replace(/\s*\(.*\)$/, "").replace(/^(מזל|חודש) /, "").replace(/^סיון$/, "סיוון"));
  return [...new Set(cleaned.map(linkCode).filter((c) => c !== null))];
}

// Hand-written content: meaning, niqqud, tags and so on, one row per name.
const [header, ...rows] = readFileSync("data/name-content.tsv", "utf8").trim().split("\n");
const columns = header.split("\t");
const content = new Map(
  rows.map((row) => {
    const cells = row.split("\t");
    return [cells[0], Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? ""]))];
  }),
);

// CBS counts: year,sex,name,n for the Jewish sector, from the babynamesIL package.
const counts = new Map<string, Map<number, { F: number; M: number }>>();
for (const line of readFileSync("data/cbs/babynamesIL-jewish.csv", "utf8").trim().split("\n").slice(1)) {
  const [year, sex, spelling, n] = line.split(",");
  if (FRAGMENTS.has(spelling)) continue;
  // Another spelling of the same name (לטם for לוטם) counts toward that name and gets no card of its own.
  const name = content.get(spelling)?.reading_of || spelling;
  const byYear = counts.get(name) ?? new Map();
  const cell = byYear.get(Number(year)) ?? { F: 0, M: 0 };
  cell[sex as "F" | "M"] += Number(n);
  byYear.set(Number(year), cell);
  counts.set(name, byYear);
}

// All babies born each year, for the era: a name's share of a year, not its raw count.
const birthsByYear = new Map<number, number>();
for (const byYear of counts.values()) {
  for (const [year, cell] of byYear) birthsByYear.set(year, (birthsByYear.get(year) ?? 0) + cell.F + cell.M);
}

const lastYear = Math.max(...[...counts.values()].flatMap((m) => [...m.keys()]));

// Rank of each name within each sex, every year.
const ranks = new Map<string, number>();
for (let year = 1949; year <= lastYear; year++) {
  for (const sex of ["F", "M"] as const) {
    const ofYear = [...counts].map(([name, m]) => [name, m.get(year)?.[sex] ?? 0] as const).filter(([, n]) => n > 0);
    ofYear.sort((a, b) => b[1] - a[1]);
    ofYear.forEach(([name, n], i) => {
      const rank = i > 0 && ofYear[i - 1][1] === n ? ranks.get(`${year}|${sex}|${ofYear[i - 1][0]}`)! : i + 1;
      ranks.set(`${year}|${sex}|${name}`, rank);
    });
  }
}

const total = (m: Map<number, { F: number; M: number }>, sex: "F" | "M") =>
  [...m].filter(([y]) => y >= FROM_YEAR).reduce((s, [, c]) => s + c[sex], 0);

const chosen = [...counts]
  .map(([name, m]) => ({ name, m, girls: total(m, "F"), boys: total(m, "M") }))
  .filter((c) => c.girls + c.boys >= MIN_BABIES)
  .sort((a, b) => b.girls + b.boys - (a.girls + a.boys) || a.name.localeCompare(b.name, "he"));

const missing = chosen.filter((c) => !content.has(c.name)).map((c) => c.name);
if (missing.length) throw new Error(`No content for ${missing.length} names: ${missing.join(", ")}`);

// Style scores, one row per name. A name without a row keeps the coarse style tag only.
const styles = readStyles();
const chosenNames = new Set(chosen.map((c) => c.name));
const unknownStyled = [...styles.keys()].filter((name) => !chosenNames.has(name));
// A spelling merged into another name keeps its old row until someone removes it: harmless, so only warn.
if (unknownStyled.length) console.warn(`Style scores for names that are not in the list (ignored): ${unknownStyled.join(", ")}`);

// Variants go both ways, and a merged spelling becomes a variant of the name it is read as.
const spellingsOf = new Map<string, string[]>();
const link = (from: string, to: string) => {
  if (from === to) return;
  const known = spellingsOf.get(from) ?? [];
  if (!known.includes(to)) spellingsOf.set(from, [...known, to]);
};
for (const [spelling, c] of content) {
  if (c.reading_of) {
    if (!content.has(c.reading_of)) throw new Error(`${spelling}: reading_of ${c.reading_of} has no row`);
    link(c.reading_of, spelling);
  } else if (chosenNames.has(spelling)) {
    for (const v of list(c.variants)) if (chosenNames.has(v)) link(v, spelling);
  }
}

// A form of another name (דני of דניאל, סמואל of שמואל) gets that name's themes, verse and holiday links,
// on top of its own. form_of always names the original, never another form, so one step is enough.
for (const [spelling, c] of content) {
  for (const original of list(c.form_of ?? "")) {
    if (original === spelling) throw new Error(`${spelling}: form_of points to itself`);
    if (content.get(original)?.form_of) throw new Error(`${spelling}: form_of ${original} is itself a form; point to the original name`);
  }
}
const originalsOf = (c: Record<string, string>) =>
  list(c.form_of ?? "").flatMap((o) => {
    const row = content.get(o);
    return row ? [row.reading_of ? content.get(row.reading_of) ?? row : row] : [];
  });

const names: NameEntry[] = chosen.map(({ name, m, girls, boys }, i) => {
  const c = content.get(name)!;
  const originals = originalsOf(c);
  const sexRatio = boys / (girls + boys);
  const mainSex = sexRatio >= 0.5 ? "M" : "F";
  const firstYear = Math.min(...[...m.keys()]);
  const stats: YearStat[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const cell = m.get(year) ?? { F: 0, M: 0 };
    stats.push({ year, count: cell.F + cell.M, rank: ranks.get(`${year}|${mainSex}|${name}`) ?? NOT_RANKED, boys: cell.M });
  }
  const unknownTags = list(c.tags).filter((t) => !CATEGORIES[t]);
  if (unknownTags.length) throw new Error(`${name}: unknown tags ${unknownTags.join(", ")}`);
  const variants = [...new Set([...list(c.variants), ...(spellingsOf.get(name) ?? [])])];
  const formOf = list(c.form_of ?? "");
  const tagLabels = [...new Set([...list(c.tags), ...originals.flatMap((o) => list(o.tags))])];
  const verseFrom = !c.biblical_ref && tagLabels.includes("תנ״כי") ? originals.find((o) => list(o.tags).includes("תנ״כי")) : undefined;
  const biblicalRef = c.biblical_ref || verseFrom?.biblical_ref || null;
  return {
    id: i + 1,
    nameHe: name,
    niqqud: c.niqqud,
    translit: list(c.translit),
    sexRatio: Math.round(sexRatio * 1000) / 1000,
    meaningHe: c.meaning,
    origin: primaryOrigin(c.origin),
    originHe: c.origin,
    biblicalRef,
    ...(verseFrom ? { biblicalRefOf: verseFrom.name } : {}),
    variants,
    ...(formOf.length ? { formOf } : {}),
    tags: {
      meaningCategories: tagLabels.map((t) => CATEGORIES[t]),
      hebrewWord: c.hebrew_word === "1",
      style: c.style as Style,
      englishFriendly: c.english_friendly === "1",
      singleSpelling: variants.length === 0,
      links: links([c.links, ...originals.map((o) => o.links)].join(",")),
    },
    stats,
    ...(styles.has(name) ? { styleAxes: { era: eraOfYear(averageBirthYear(stats, birthsByYear)), ...styles.get(name)! } } : {}),
  };
});

writeFileSync("data/names.json", JSON.stringify(names));
const unstyled = names.filter((n) => !n.styleAxes).map((n) => n.nameHe);
if (unstyled.length) console.warn(`No style scores yet for ${unstyled.length} names (run npm run styles:score): ${unstyled.join(", ")}`);
console.log(`Wrote ${names.length} names to data/names.json (CBS ${FROM_YEAR}-${lastYear}, at least ${MIN_BABIES} babies)`);
