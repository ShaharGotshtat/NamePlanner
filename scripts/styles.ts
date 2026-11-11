import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { StyleAxes } from "../src/lib/types";

export const STYLES_FILE = "data/name-style.tsv";
export const AXES = ["era", "reach", "religious"] as const satisfies readonly (keyof StyleAxes)[];

/**
 * The scoring rubric. The model that scores new names gets this text, and the people who check
 * the scores use the same text, so a score means the same thing to both.
 */
export const RUBRIC = `Score each Israeli first name from 1 to 5 on three axes. Judge how the name is perceived in Israel today, not its etymology.

era: how old or new the name feels to Israeli parents today. This is about the feel, not how many babies get it: a traditional name can feel old even if religious families still give it often.
1 = old-fashioned: grandparents' names, and traditional biblical or rabbinic names with an old feel (שושנה, יורם, משה, ראובן, יהושע, אלישבע).
2 = dated: typical of the parents' generation, born in the 1960s to 1980s (מיכל, אורית, אבישי, יועד). Names of immigrants from the former Soviet Union and other foreign names of that generation are 2, not 1 (מרינה).
3 = established: in use since the 1980s or 1990s and still current, or timeless (דניאל, תמר, איתמר, נגה, דביר, מיכאלה).
4 = contemporary: came into wide use in the 2000s and 2010s (נועם, שקד, עומרי).
5 = newest wave, mostly since about 2015 (ארבל, ליב, אימרי, גוני).

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
