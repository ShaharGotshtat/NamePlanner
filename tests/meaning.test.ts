import { describe, expect, it } from "vitest";
import names from "../data/names.sample.json";
import { displayMeaning } from "@/lib/names/catalog";
import { normalizeHebrew } from "@/lib/names/features";

describe("displayMeaning", () => {
  it("hides a meaning that only repeats the name", () => {
    expect(displayMeaning({ nameHe: "ים", meaningHe: "ים" })).toBeNull();
    expect(displayMeaning({ nameHe: "יָם", meaningHe: "ים" })).toBeNull();
  });

  it("drops the repeated part and keeps the rest", () => {
    expect(displayMeaning({ nameHe: "אריה", meaningHe: "אריה, מלך החיות" })).toBe("מלך החיות");
  });

  it("keeps a real description", () => {
    expect(displayMeaning({ nameHe: "ים", meaningHe: "גוף מים גדול" })).toBe("גוף מים גדול");
  });

  it("no sample name has a meaning that repeats the name", () => {
    const echoes = names.filter((n) =>
      n.meaningHe.split(/[,،;]/).some((p) => normalizeHebrew(p) === normalizeHebrew(n.nameHe)),
    );
    expect(echoes.map((n) => n.nameHe)).toEqual([]);
  });
});
