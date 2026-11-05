import { describe, expect, it } from "vitest";
import names from "./names.sample.json";
import full from "../data/names.json";
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

describe("the full name list", () => {
  const stripNiqqud = (s: string) => s.normalize("NFD").replace(/[֑-ׇ]/g, "").normalize("NFC");

  it("has no meaning that repeats the name", () => {
    const echoes = full.filter((n) =>
      n.meaningHe.split(/[,،;:]/).some((p) => normalizeHebrew(p) === normalizeHebrew(n.nameHe)),
    );
    expect(echoes.map((n) => n.nameHe)).toEqual([]);
  });

  it("has niqqud that matches each name letter for letter", () => {
    const mismatched = full.filter((n) => stripNiqqud(n.niqqud) !== n.nameHe);
    expect(mismatched.map((n) => n.nameHe)).toEqual([]);
  });

  it("gives every name a meaning and a Latin spelling", () => {
    expect(full.filter((n) => !n.meaningHe || !n.translit.length).map((n) => n.nameHe)).toEqual([]);
  });
});
