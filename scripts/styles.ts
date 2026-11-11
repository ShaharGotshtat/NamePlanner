import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { StyleAxes } from "../src/lib/types";

export const STYLES_FILE = "data/name-style.tsv";
/** The axes a model scores. Era is not one of them: it comes from CBS data (src/lib/names/era.ts). */
export const AXES = ["reach", "religious"] as const satisfies readonly (keyof StyleAxes)[];
export type ScoredAxes = Pick<StyleAxes, (typeof AXES)[number]>;

/**
 * The scoring rubric. The model that scores new names gets this text, and the people who check
 * the scores use the same text, so a score means the same thing to both.
 */
export const RUBRIC = `Score each Israeli first name from 1 to 5 on two axes. Judge how the name is perceived in Israel today, not its etymology.

reach: how easy the name is for someone abroad to say and recognise.
1 = very hard abroad: a strong ח or ע sound, or long and distinctly Hebrew (חיים, יחזקאל, נהוראי).
2 = hard: a kh sound (ח, or כ said as kh) or a sound cluster foreigners stumble on (מיכל, שניר, אחינועם).
3 = sayable but awkward or long (איתמר, נגה, ידידיה).
4 = easy to say, even if unfamiliar abroad, or a close form of a known name (גלעד, גוני, ראובן, מיכאלה).
5 = an international name with the same sound (אביגיל, דניאל, מאיה, ליאו).

religious: which families mostly give the name today. Describe usage only, never judge it.
1 = mainly Haredi or Hasidic families, including most Yiddish names (מנחם, יוכבד, גיטל).
2 = mostly religious or traditional families (הודיה, נריה, תהילה).
3 = every community, or no clear pattern (נועה, דוד, יונתן).
4 = mostly secular families (עמית, רוני, גל).
5 = clearly secular, often international (אגם, ים, ליאם).

Unsure between two values: pick the middle one, 3.`;

function parseScore(value: string | undefined, where: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`${where}: score must be a whole number from 1 to 5, got "${value}"`);
  return n;
}

/** Name to its style scores. A missing file means nothing is scored yet. */
export function readStyles(file = STYLES_FILE): Map<string, ScoredAxes> {
  const styles = new Map<string, ScoredAxes>();
  if (!existsSync(file)) return styles;
  const [header, ...rows] = readFileSync(file, "utf8").trim().split("\n");
  if (header.trim() !== ["name", ...AXES].join("\t")) throw new Error(`${file}: unexpected header "${header}"`);
  rows.forEach((row, i) => {
    const [name, ...cells] = row.split("\t");
    const where = `${file} line ${i + 2} (${name})`;
    if (styles.has(name)) throw new Error(`${where}: duplicate name`);
    const scores = Object.fromEntries(AXES.map((axis, j) => [axis, parseScore(cells[j], where)])) as unknown as ScoredAxes;
    styles.set(name, scores);
  });
  return styles;
}

export function writeStyles(styles: Map<string, ScoredAxes>, order: string[], file = STYLES_FILE): void {
  const names = [...order.filter((n) => styles.has(n)), ...[...styles.keys()].filter((n) => !order.includes(n))];
  const rows = names.map((n) => [n, ...AXES.map((axis) => styles.get(n)![axis])].join("\t"));
  writeFileSync(file, [["name", ...AXES].join("\t"), ...rows].join("\n") + "\n");
}
