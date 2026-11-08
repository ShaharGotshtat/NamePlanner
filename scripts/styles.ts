import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { StyleAxes } from "../src/lib/types";

export const STYLES_FILE = "data/name-style.tsv";
export const AXES = ["era", "reach", "religious"] as const satisfies readonly (keyof StyleAxes)[];

/**
 * The scoring rubric. The model that scores new names gets this text, and the people who check
 * the scores use the same text, so a score means the same thing to both.
 */
export const RUBRIC = `Score each Israeli first name from 1 to 5 on three axes. Judge how the name is perceived in Israel today, not its etymology.

era: how old or new the name feels.
1 = grandparents' generation, now rarely given to babies (שושנה, יורם, זהבה).
2 = parents' generation, or long-standing traditional (מיכל, אורית, משה, רבקה).
3 = timeless, used in every generation without feeling old or new (דניאל, תמר, יונתן).
4 = contemporary, typical of babies of the 2000s and 2010s (נועה, עומר, איתי).
5 = newest wave, mostly since about 2015 (ארבל, ליב, אימרי, גאיה).

reach: how well the name works outside Israel.
1 = hard to say or unknown abroad, often because of ח, ע or צ (חיים, צבי, נהוראי).
2 = Hebrew-specific but sayable (איתמר, הראל, יובל).
3 = easy to say abroad but unfamiliar there (עומר, נדב).
4 = familiar abroad in a close form (נועה, יונתן, נעמי).
5 = works abroad as it is (דניאל, אדם, מאיה, ליאו).

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
export function readStyles(file = STYLES_FILE): Map<string, StyleAxes> {
  const styles = new Map<string, StyleAxes>();
  if (!existsSync(file)) return styles;
  const [header, ...rows] = readFileSync(file, "utf8").trim().split("\n");
  if (header.trim() !== ["name", ...AXES].join("\t")) throw new Error(`${file}: unexpected header "${header}"`);
  rows.forEach((row, i) => {
    const [name, ...cells] = row.split("\t");
    const where = `${file} line ${i + 2} (${name})`;
    if (styles.has(name)) throw new Error(`${where}: duplicate name`);
    const scores = Object.fromEntries(AXES.map((axis, j) => [axis, parseScore(cells[j], where)])) as unknown as StyleAxes;
    styles.set(name, scores);
  });
  return styles;
}

export function writeStyles(styles: Map<string, StyleAxes>, order: string[], file = STYLES_FILE): void {
  const names = [...order.filter((n) => styles.has(n)), ...[...styles.keys()].filter((n) => !order.includes(n))];
  const rows = names.map((n) => [n, ...AXES.map((axis) => styles.get(n)![axis])].join("\t"));
  writeFileSync(file, [["name", ...AXES].join("\t"), ...rows].join("\n") + "\n");
}
