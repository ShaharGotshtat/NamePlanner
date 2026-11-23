import type { NameEntry, YearStat } from "@/lib/types";
import { commonness, type Commonness } from "./commonness";

/** The CBS hides any count under 5, so 0 means "fewer than 5", not "nobody". */
export const HIDDEN_BELOW = 5;

export interface SexShare {
  /** Whole percent of boys; girls are the rest. */
  boysPct: number;
  girlsPct: number;
}

export interface NameHistory {
  latest: YearStat;
  /** False when the latest year's count is hidden (fewer than 5 babies). */
  counted: boolean;
  level: Commonness;
  peak: YearStat;
  /** Latest year against ten years earlier: about the same is "steady". */
  decade: "up" | "down" | "steady";
  latestShare: SexShare | null;
  allTimeShare: SexShare | null;
}

function share(boys: number, total: number): SexShare | null {
  if (total <= 0) return null;
  const boysPct = Math.round((boys / total) * 100);
  return { boysPct, girlsPct: 100 - boysPct };
}

/** Boys' share, or null when the rows were saved before boys were counted. */
function shareOf(stats: YearStat[]): SexShare | null {
  if (stats.some((s) => s.boys === undefined)) return null;
  return share(
    stats.reduce((sum, s) => sum + s.boys!, 0),
    stats.reduce((sum, s) => sum + s.count, 0),
  );
}

export function nameHistory(entry: NameEntry): NameHistory {
  const { stats } = entry;
  const latest = stats.at(-1)!;
  const peak = stats.reduce((best, s) => (s.count > best.count ? s : best));
  const before = stats.at(-11);
  const ratio = before && before.count > 0 ? latest.count / before.count : 1;
  return {
    latest,
    counted: latest.count > 0,
    level: commonness(entry),
    peak,
    decade: ratio >= 1.25 ? "up" : ratio <= 0.8 ? "down" : "steady",
    latestShare: shareOf([latest]),
    allTimeShare: shareOf(stats),
  };
}

const LEVEL_WORDS: Record<Commonness, string> = { common: "נפוץ", rare: "פחות נפוץ", veryRare: "נדיר" };
const DECADE_WORDS = { up: "ויותר מאשר לפני עשור", down: "אבל פחות מאשר לפני עשור", steady: "בערך כמו לפני עשור" };

/** One plain sentence about the name's popularity, said by the sun. */
export function historyLine(entry: NameEntry, h: NameHistory = nameHistory(entry)): string {
  if (!h.counted) return `השם ${entry.nameHe} כמעט לא ניתן היום. השיא שלו היה ב-${h.peak.year}.`;
  if (h.peak.year >= h.latest.year - 1) return `השם ${entry.nameHe} ${LEVEL_WORDS[h.level]} היום, והוא בשיא שלו.`;
  return `השם ${entry.nameHe} ${LEVEL_WORDS[h.level]} היום, ${DECADE_WORDS[h.decade]}.`;
}

export interface ChartGeometry {
  line: string;
  area: string;
  peak: { x: number; y: number; stat: YearStat };
  last: { x: number; y: number };
  /** Gridline values in babies, with their y. */
  ticks: { value: number; y: number }[];
  /** Year labels with their x. */
  years: { year: number; x: number }[];
}

/** The smallest of 1, 2, 5 × 10^n that splits `max` into at most three steps. */
function tickStep(max: number): number {
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
}

/** SVG paths for the yearly counts, drawn left to right in a width × height box. */
export function chartGeometry(stats: YearStat[], width: number, height: number): ChartGeometry {
  const step = tickStep(Math.max(...stats.map((s) => s.count), 1));
  const top = Math.max(step * Math.ceil(Math.max(...stats.map((s) => s.count)) / step), step);
  const x = (i: number) => (stats.length === 1 ? width : (i / (stats.length - 1)) * width);
  const y = (count: number) => height - (count / top) * height;
  const r = (n: number) => Math.round(n * 10) / 10;
  const points = stats.map((s, i) => `${r(x(i))} ${r(y(s.count))}`);
  const line = `M${points.join(" L")}`;
  const peakIndex = stats.reduce((best, s, i) => (s.count > stats[best].count ? i : best), 0);
  const first = stats[0].year;
  const last = stats.at(-1)!.year;
  const yearStep = last - first > 30 ? 20 : last - first > 12 ? 5 : 2;
  const years: { year: number; x: number }[] = [];
  for (let year = Math.ceil(first / yearStep) * yearStep; year < last - yearStep / 2; year += yearStep) {
    years.push({ year, x: r(x(year - first)) });
  }
  years.push({ year: last, x: width });
  const ticks: { value: number; y: number }[] = [];
  for (let value = 0; value <= top; value += step) ticks.push({ value, y: r(y(value)) });
  return {
    line,
    area: `${line} L${width} ${height} L0 ${height} Z`,
    peak: { x: r(x(peakIndex)), y: r(y(stats[peakIndex].count)), stat: stats[peakIndex] },
    last: { x: width, y: r(y(stats.at(-1)!.count)) },
    ticks,
    years,
  };
}
