import { readFileSync, writeFileSync } from "node:fs";
import type { MeaningCategory, NameEntry, Origin, Style, YearStat } from "../src/lib/types";

/** Names given to fewer babies than this in 2000-2024 are too rare for the lists. */
const MIN_BABIES = 50;
const FROM_YEAR = 2000;
const NOT_RANKED = 9999;

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
  "תנ״כי": "biblical",
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
const LINKS = new Set([
  "תשרי", "חשוון", "כסלו", "טבת", "שבט", "אדר", "ניסן", "אייר", "סיוון", "תמוז", "אב", "אלול",
  "ראש השנה", "יום כיפור", "סוכות", "חנוכה", "ט״ו בשבט", "פורים", "פסח", "ל״ג בעומר", "שבועות", "ט״ו באב",
  "טלה", "שור", "תאומים", "סרטן", "אריה", "בתולה", "מאזניים", "עקרב", "קשת", "גדי", "דלי", "דגים",
  "חורף", "אביב", "קיץ", "סתיו",
]);

const list = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

function primaryOrigin(originHe: string): Origin {
  for (const part of originHe.split(";").map((p) => p.trim())) {
    const match = ORIGINS.find(([label]) => part.startsWith(label));
    if (match) return match[1];
    if (!part.startsWith("טבע")) return "other";
  }
  return "other";
}

function links(value: string): string[] {
  const cleaned = list(value).map((l) => l.replace(/\s*\(.*\)$/, "").replace(/^(מזל|חודש) /, "").replace(/^סיון$/, "סיוון"));
  return [...new Set(cleaned.filter((l) => LINKS.has(l)))];
}

// Spellings of one name that CBS counts apart (בת שבע and בתשבע, ליה and לייה). Each line is the
// spelling the app shows, then the others. Their babies are added to it before ranking, so counts,
// ranks, sex ratio and trends are those of the whole name; the other spellings become variants.
const mainOf = new Map<string, string>();
const spellingsOf = new Map<string, string[]>();
for (const row of readFileSync("data/name-merges.tsv", "utf8").trim().split("\n").slice(1)) {
  const [main, others] = row.split("\t");
  const spellings = list(others ?? "");
  if (!spellings.length) throw new Error(`name-merges.tsv: ${main} has no other spellings`);
  for (const spelling of [main, ...spellings]) {
    if (mainOf.has(spelling) || spellingsOf.has(spelling)) throw new Error(`name-merges.tsv: ${spelling} is listed twice`);
  }
  spellingsOf.set(main, spellings);
  for (const spelling of spellings) mainOf.set(spelling, main);
}

// CBS counts: year,sex,name,n for the Jewish sector, from the babynamesIL package.
const counts = new Map<string, Map<number, { F: number; M: number }>>();
const cbsNames = new Set<string>();
for (const line of readFileSync("data/cbs/babynamesIL-jewish.csv", "utf8").trim().split("\n").slice(1)) {
  const [year, sex, spelling, n] = line.split(",");
  cbsNames.add(spelling);
  const name = mainOf.get(spelling) ?? spelling;
  const byYear = counts.get(name) ?? new Map();
  const cell = byYear.get(Number(year)) ?? { F: 0, M: 0 };
  cell[sex as "F" | "M"] += Number(n);
  byYear.set(Number(year), cell);
  counts.set(name, byYear);
}

const notInCbs = [...spellingsOf.keys(), ...mainOf.keys()].filter((n) => !cbsNames.has(n));
if (notInCbs.length) throw new Error(`name-merges.tsv lists spellings that are not in the CBS data: ${notInCbs.join(", ")}`);

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

// Hand-written content: meaning, niqqud, tags and so on, one row per name.
const [header, ...rows] = readFileSync("data/name-content.tsv", "utf8").trim().split("\n");
const columns = header.split("\t");
const content = new Map(
  rows.map((row) => {
    const cells = row.split("\t");
    return [cells[0], Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? ""]))];
  }),
);

const mergedAway = [...mainOf].filter(([spelling]) => content.has(spelling));
if (mergedAway.length) {
  throw new Error(`Content rows for spellings merged into another name: ${mergedAway.map(([s, m]) => `${s} (into ${m})`).join(", ")}`);
}

const missing = chosen.filter((c) => !content.has(c.name)).map((c) => c.name);
if (missing.length) throw new Error(`No content for ${missing.length} names: ${missing.join(", ")}`);

const names: NameEntry[] = chosen.map(({ name, m, girls, boys }, i) => {
  const c = content.get(name)!;
  const sexRatio = boys / (girls + boys);
  const mainSex = sexRatio >= 0.5 ? "M" : "F";
  const firstYear = Math.min(...[...m.keys()]);
  const stats: YearStat[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const cell = m.get(year) ?? { F: 0, M: 0 };
    stats.push({ year, count: cell.F + cell.M, rank: ranks.get(`${year}|${mainSex}|${name}`) ?? NOT_RANKED });
  }
  const unknownTags = list(c.tags).filter((t) => !CATEGORIES[t]);
  if (unknownTags.length) throw new Error(`${name}: unknown tags ${unknownTags.join(", ")}`);
  const variants = [...new Set([...(spellingsOf.get(name) ?? []), ...list(c.variants)])].filter((v) => v !== name);
  return {
    id: i + 1,
    nameHe: name,
    niqqud: c.niqqud,
    translit: list(c.translit),
    sexRatio: Math.round(sexRatio * 1000) / 1000,
    meaningHe: c.meaning,
    origin: primaryOrigin(c.origin),
    originHe: c.origin,
    biblicalRef: c.biblical_ref || null,
    variants,
    tags: {
      meaningCategories: list(c.tags).map((t) => CATEGORIES[t]),
      hebrewWord: c.hebrew_word === "1",
      style: c.style as Style,
      englishFriendly: c.english_friendly === "1",
      singleSpelling: variants.length === 0,
      links: links(c.links),
    },
    stats,
  };
});

writeFileSync("data/names.json", JSON.stringify(names));
console.log(`Wrote ${names.length} names to data/names.json (CBS ${FROM_YEAR}-${lastYear}, at least ${MIN_BABIES} babies)`);
