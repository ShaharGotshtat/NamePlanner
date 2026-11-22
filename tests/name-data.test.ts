import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { NameEntry } from "@/lib/types";

const names: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));
const [header, ...rows] = readFileSync("data/name-content.tsv", "utf8").trim().split("\n");
const columns = header.split("\t");
const content = rows.map((row) => {
  const cells = row.split("\t");
  return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? ""])) as Record<string, string>;
});
const byName = new Map(names.map((n) => [n.nameHe, n]));

describe("name data rules (docs/name-data-rules.md)", () => {
  it("every name with ח has a Latin spelling with Ch and one with H", () => {
    const missing = names
      .filter((n) => n.nameHe.includes("ח"))
      .filter((n) => !(n.translit.some((t) => /ch/i.test(t)) && n.translit.some((t) => /(^|[^cs])h/i.test(t))));
    expect(missing.map((n) => n.nameHe)).toEqual([]);
  });

  it("no Latin spelling is listed twice", () => {
    const repeated = names.filter((n) => new Set(n.translit.map((t) => t.toLowerCase())).size !== n.translit.length);
    expect(repeated.map((n) => n.nameHe)).toEqual([]);
  });

  it("variants between names in the list go both ways", () => {
    const oneWay = names.flatMap((n) =>
      (n.variants ?? []).filter((v) => byName.has(v) && !byName.get(v)!.variants?.includes(n.nameHe)).map((v) => `${n.nameHe}→${v}`),
    );
    expect(oneWay).toEqual([]);
  });

  it("a spelling read as another name has no card, and points to a name that has one", () => {
    const merged = content.filter((c) => c.reading_of);
    expect(merged.filter((c) => byName.has(c.name)).map((c) => c.name)).toEqual([]);
    expect(merged.filter((c) => !byName.has(c.reading_of)).map((c) => `${c.name}→${c.reading_of}`)).toEqual([]);
    expect(merged.filter((c) => !byName.get(c.reading_of)?.variants?.includes(c.name)).map((c) => c.name)).toEqual([]);
  });

  it("the biblical tag always comes with a verse", () => {
    const noVerse = names.filter((n) => n.tags.meaningCategories.includes("biblical") && !n.biblicalRef);
    expect(noVerse.map((n) => n.nameHe)).toEqual([]);
  });

  it("halves of double names are not in the list", () => {
    expect(["בת", "שבע", "היא", "שר"].filter((f) => byName.has(f))).toEqual([]);
  });
});
