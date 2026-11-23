import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import all from "../data/names.json";
import { PopularityDetails } from "@/components/screens/PopularitySheet";
import { chartGeometry, historyLine, nameHistory } from "@/lib/names/history";
import type { NameEntry } from "@/lib/types";

const names = all as NameEntry[];
const named = (nameHe: string) => names.find((n) => n.nameHe === nameHe)!;

const render = (entry: NameEntry, range: "all" | "recent" = "all") =>
  renderToStaticMarkup(<PopularityDetails entry={entry} range={range} setRange={() => {}} titleId="t" onClose={() => {}} />);

describe("name data", () => {
  it("counts boys in every year, never more than the year's babies", () => {
    const bad = names.flatMap((n) => n.stats.filter((s) => s.boys === undefined || s.boys < 0 || s.boys > s.count).map((s) => `${n.nameHe} ${s.year}`));
    expect(bad).toEqual([]);
  });
});

describe("nameHistory", () => {
  it("gives a common name's latest year, peak and boys/girls split", () => {
    const h = nameHistory(named("נועם"));
    expect(h.counted).toBe(true);
    expect(h.level).toBe("common");
    expect(h.peak.year).toBe(2008);
    expect(h.latestShare).toEqual({ boysPct: 83, girlsPct: 17 });
    expect(h.allTimeShare!.boysPct + h.allTimeShare!.girlsPct).toBe(100);
  });

  it("treats a hidden count as fewer than 5, not as a rank", () => {
    const h = nameHistory(named("יניב"));
    expect(h.counted).toBe(false);
    expect(h.peak.year).toBe(1976);
    expect(historyLine(named("יניב"), h)).toContain("השיא שלו היה ב-1976");
  });

  it("has no split for rows saved before boys were counted", () => {
    const entry = named("נועם");
    const old = { ...entry, stats: entry.stats.map(({ boys: _, ...s }) => s) };
    expect(nameHistory(old).allTimeShare).toBeNull();
    expect(render(old)).not.toContain("בנים או בנות");
  });

  it("compares with ten years ago", () => {
    const entry = named("נועם");
    const stats = entry.stats.map((s, i, a) => ({ ...s, count: i === a.length - 1 ? 300 : 100 }));
    expect(nameHistory({ ...entry, stats }).decade).toBe("up");
  });
});

describe("chartGeometry", () => {
  it("spans the box and marks the peak", () => {
    const stats = [10, 40, 20].map((count, i) => ({ year: 2000 + i, count, rank: 1 }));
    const c = chartGeometry(stats, 300, 100);
    expect(c.line.startsWith("M0 ")).toBe(true);
    expect(c.last.x).toBe(300);
    expect(c.peak).toMatchObject({ x: 150, stat: { year: 2001 } });
    expect(c.ticks[0]).toEqual({ value: 0, y: 100 });
    expect(c.ticks.at(-1)!.value).toBeGreaterThanOrEqual(40);
    expect(c.years.at(-1)).toEqual({ year: 2002, x: 300 });
  });
});

describe("PopularityDetails", () => {
  it("shows the numbers, the graph and the split for a common name", () => {
    const html = render(named("נועם"));
    expect(html).toContain("1,189");
    expect(html).toContain("שנת השיא");
    expect(html).toContain('role="img"');
    expect(html).toContain("בנים 83%");
    expect(html).not.toContain("NaN");
  });

  it("says fewer than 5 instead of rank 9999 for a hidden count", () => {
    const html = render(named("יניב"));
    expect(html).toContain("פחות מ-5");
    expect(html).not.toContain("9999");
  });

  it("draws only the last ten years when asked", () => {
    const html = render(named("נועם"), "recent");
    expect(html).toContain("מ-2015 עד 2024");
  });
});
