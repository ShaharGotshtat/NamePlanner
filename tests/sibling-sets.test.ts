import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { NameEntry } from "@/lib/types";
import { findByName } from "@/lib/names/catalog";
import { evaluateSiblingSets, parseSiblingSets } from "../scripts/sibling-sets";

const fullList: NameEntry[] = JSON.parse(readFileSync("data/names.json", "utf8"));

describe("findByName", () => {
  it("finds a name typed in another spelling", () => {
    expect(findByName(fullList, "מעין")?.nameHe).toBe("מעיין");
    expect(findByName(fullList, "נוגה")?.nameHe).toBe("נגה");
  });

  it("falls back to the first part of a double name", () => {
    expect(findByName(fullList, "מאיה רות")?.nameHe).toBe("מאיה");
    expect(findByName(fullList, "הלל-שושנה")?.nameHe).toBe("הלל");
  });

  it("prefers the exact name and returns nothing for an unknown one", () => {
    expect(findByName(fullList, "מאיה")?.nameHe).toBe("מאיה");
    expect(findByName(fullList, "קדקדון")).toBeUndefined();
    expect(findByName(fullList, "  ")).toBeUndefined();
  });
});

// Made-up sets: the real ones stay out of the repository.
const SAMPLE = `# comment
נועם/m\tתמר/f\tאורי
מאיה\tשירה/f
יחידי
`;

describe("sibling sets", () => {
  it("parses one set per line, drops sex marks, comments and single names", () => {
    expect(parseSiblingSets(SAMPLE)).toEqual([
      ["נועם", "תמר", "אורי"],
      ["מאיה", "שירה"],
    ]);
  });

  it("reports coverage, pairs and a held-out percentile between 0 and 1", () => {
    const report = evaluateSiblingSets([...parseSiblingSets(SAMPLE), ["קדקדון", "אורי"]], fullList);
    expect(report.sets).toBe(3);
    expect(report.missing).toEqual(["קדקדון"]);
    expect(report.pairs).toBe(4);
    expect(report.heldOutCount).toBe(5);
    expect(report.heldOutPercentile).toBeGreaterThanOrEqual(0);
    expect(report.heldOutPercentile).toBeLessThanOrEqual(1);
  });
});
