import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEDIAN_RANK } from "@/lib/engine/requirements";

/** Rank at which half of that year's babies of that sex are covered. */
function medianRank(year: number, sex: "F" | "M"): number {
  const counts = readFileSync("data/cbs/babynamesIL-jewish.csv", "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
    .filter(([y, s]) => Number(y) === year && s === sex)
    .map(([, , , n]) => Number(n))
    .sort((a, b) => b - a);
  const half = counts.reduce((s, n) => s + n, 0) / 2;
  let sum = 0;
  return counts.findIndex((n) => (sum += n) >= half) + 1;
}

describe("median rank", () => {
  it("matches the latest CBS year", () => {
    const years = readFileSync("data/cbs/babynamesIL-jewish.csv", "utf8").trim().split("\n").slice(1).map((l) => Number(l.split(",")[0]));
    const latest = Math.max(...years);
    expect({ girl: medianRank(latest, "F"), boy: medianRank(latest, "M") }).toEqual(MEDIAN_RANK);
  });
});
