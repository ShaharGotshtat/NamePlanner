import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { NameEntry } from "@/lib/types";

const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const merges = readFileSync("data/name-merges.tsv", "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((row) => {
    const [main, others] = row.split("\t");
    return { main, spellings: others.split(",").map((s) => s.trim()) };
  });
const byName = new Map(names.map((n) => [n.nameHe, n]));

describe("spelling variants merged into one name", () => {
  it("never lists a merged spelling as a name of its own", () => {
    const separate = merges.flatMap((m) => m.spellings).filter((s) => byName.has(s));
    expect(separate).toEqual([]);
  });

  it("keeps the merged spellings as variants of the name", () => {
    for (const { main, spellings } of merges) {
      const entry = byName.get(main);
      if (!entry) continue; // fewer than 50 babies even together
      expect(entry.variants).toEqual(expect.arrayContaining(spellings));
      expect(entry.tags.singleSpelling).toBe(false);
    }
  });

  it("adds the babies of every spelling to the name", () => {
    const batSheva = byName.get("בת שבע")!;
    const csv = readFileSync("data/cbs/babynamesIL-jewish.csv", "utf8");
    const babies = (spelling: string, year: number) =>
      csv
        .split("\n")
        .filter((line) => line.startsWith(`${year},`) && line.split(",")[2] === spelling)
        .reduce((sum, line) => sum + Number(line.split(",")[3]), 0);
    const count2024 = batSheva.stats.find((s) => s.year === 2024)!.count;
    expect(count2024).toBe(babies("בת שבע", 2024) + babies("בתשבע", 2024));
  });
});
