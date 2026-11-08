import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { NameEntry } from "@/lib/types";
import { soundHardness } from "@/lib/names/features";
import { profileOf, similarity } from "@/lib/engine/similarity";
import { MODEL_CANDIDATES, pickDiverse, rankCandidates } from "@/lib/engine/round";
import { readStyles } from "../scripts/styles";
import { byName, names, request } from "./fixtures";

const fullList: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));

describe("style scores", () => {
  it("cover every name in the list, and data/names.json carries them", () => {
    const styles = readStyles();
    expect(fullList.filter((n) => !styles.has(n.nameHe)).map((n) => n.nameHe)).toEqual([]);
    for (const n of fullList) expect(n.styleAxes).toEqual(styles.get(n.nameHe));
  });
});

describe("soundHardness", () => {
  it("scores open, vowel-rich names soft and names full of stops hard", () => {
    expect(soundHardness("נועה", "Noa")).toBe(1);
    expect(soundHardness("ליה", "Liya")).toBe(1);
    expect(soundHardness("ברק", "Barak")).toBeGreaterThanOrEqual(4);
    expect(soundHardness("צבי", "Tzvi")).toBeGreaterThanOrEqual(4);
  });

  it("works from the Hebrew letters for a name outside the list", () => {
    expect(soundHardness("נויה")).toBeLessThan(soundHardness("קדקד"));
  });
});

describe("similarity with style scores", () => {
  it("puts a new-wave secular name closer to another one than to a traditional name", () => {
    const emma = profileOf(byName("אמה"));
    expect(similarity(emma, profileOf(byName("עלמה")))).toBeGreaterThan(similarity(emma, profileOf(byName("אסתר"))));
  });

  it("falls back to the style tag when a name has no scores", () => {
    const { styleAxes: _, ...tamar } = byName("תמר");
    const score = similarity(profileOf(tamar), profileOf(byName("יעל")));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("siblings", () => {
  it("are matched to the name list, so their style counts and the card names the sibling", () => {
    const ranked = rankCandidates(names, request({ babySex: "girl", family: siblings("אגם", "ים"), chips: { fitsSiblings: "want" } }));
    const order = ranked.map((c) => c.entry.nameHe);
    expect(order.indexOf("עלמה")).toBeLessThan(order.indexOf("אסתר"));
    expect(order.indexOf("אמה")).toBeLessThan(order.indexOf("שרה"));
    const line = ranked[0].evaluation.lines.find((l) => l.requirement.includes("האחים"));
    expect(line?.detail).toMatch(/^בסגנון של (אגם|ים)$/);
  });

  it("still work for a sibling name that is not in the list", () => {
    const ranked = rankCandidates(names, request({ babySex: "girl", family: siblings("זהבית"), chips: { fitsSiblings: "want" } }));
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].evaluation.lines[0].requirement).toBe("מתאים לשמות האחים");
  });
});

describe("pickDiverse on the full list", () => {
  it("picks only from the shortlist the model would see, not from far down the ranking", () => {
    const req = request({ babySex: "boy", family: siblings("ארבל", "גפן"), chips: { fitsSiblings: "want" } });
    const ranked = rankCandidates(fullList, req);
    const shortlist = new Set(ranked.slice(0, MODEL_CANDIDATES).map((c) => c.entry.id));
    for (const c of pickDiverse(ranked, "boy")) expect(shortlist.has(c.entry.id)).toBe(true);
  });
});

function siblings(...list: string[]) {
  return list.map((name) => ({ name, relation: "sibling" as const }));
}
