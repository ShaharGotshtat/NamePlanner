import type { NameEntry, YearStat } from "@/lib/types";
import { nameSex } from "./catalog";
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
  if (h.counted && h.latestShare && nameSex(entry) === "unisex") {
    const { boysPct, girlsPct } = h.latestShare;
    const most = boysPct >= girlsPct ? `${boysPct}% מהתינוקות שקיבלו אותו היו בנים` : `${girlsPct}% מהתינוקות שקיבלו אותו היו בנות`;
    return `השם ${entry.nameHe} ניתן לבנים ולבנות. ב-${h.latest.year}, ${most}.`;
  }
  if (!h.counted) return `השם ${entry.nameHe} כמעט לא ניתן היום. השיא שלו היה ב-${h.peak.year}.`;
  if (h.peak.year >= h.latest.year - 1) return `השם ${entry.nameHe} ${LEVEL_WORDS[h.level]} היום, והוא בשיא שלו.`;
  return `השם ${entry.nameHe} ${LEVEL_WORDS[h.level]} היום, ${DECADE_WORDS[h.decade]}.`;
}

export type SeriesId = "girls" | "boys" | "all";

export interface ChartLine {
  id: SeriesId;
  path: string;
  last: { x: number; y: number };
}

export interface ChartGeometry {
  lines: ChartLine[];
  /** The highest point of all lines. */
  peak: { x: number; y: number; id: SeriesId; year: number; count: number };
  /** Gridline values in babies, with their y. */
  ticks: { value: number; y: number }[];
  /** Year labels with their x. */
  years: { year: number; x: number }[];
}

/** The yearly counts to draw: girls and boys apart, or all together for rows saved before boys were counted. */
export function chartSeries(stats: YearStat[]): { id: SeriesId; counts: number[] }[] {
  if (stats.some((s) => s.boys === undefined)) return [{ id: "all", counts: stats.map((s) => s.count) }];
  return [
    { id: "girls", counts: stats.map((s) => s.count - s.boys!) },
    { id: "boys", counts: stats.map((s) => s.boys!) },
  ];
}

/** The smallest of 1, 2, 5 × 10^n that splits `max` into at most three steps. */
function tickStep(max: number): number {
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough)!;
}

/** SVG lines for each series of yearly counts, drawn left to right in a width × height box. */
export function chartGeometry(years: number[], series: { id: SeriesId; counts: number[] }[], width: number, height: number): ChartGeometry {
  const max = Math.max(1, ...series.flatMap((s) => s.counts));
  const step = tickStep(max);
  const top = step * Math.ceil(max / step);
  const r = (n: number) => Math.round(n * 10) / 10;
  const x = (i: number) => r(years.length === 1 ? width : (i / (years.length - 1)) * width);
  const y = (count: number) => r(height - (count / top) * height);

  let peak: ChartGeometry["peak"] = { x: x(0), y: y(0), id: series[0].id, year: years[0], count: -1 };
  const lines = series.map(({ id, counts }) => {
    counts.forEach((count, i) => {
      if (count > peak.count) peak = { x: x(i), y: y(count), id, year: years[i], count };
    });
    return { id, path: `M${counts.map((c, i) => `${x(i)} ${y(c)}`).join(" L")}`, last: { x: width, y: y(counts.at(-1)!) } };
  });

  const first = years[0];
  const last = years.at(-1)!;
  const yearStep = last - first > 30 ? 20 : last - first > 12 ? 5 : 2;
  const labels: { year: number; x: number }[] = [];
  for (let year = Math.ceil(first / yearStep) * yearStep; year < last - yearStep / 2; year += yearStep) labels.push({ year, x: x(year - first) });
  labels.push({ year: last, x: width });

  const ticks: { value: number; y: number }[] = [];
  for (let value = 0; value <= top; value += step) ticks.push({ value, y: y(value) });
  return { lines, peak, ticks, years: labels };
}
