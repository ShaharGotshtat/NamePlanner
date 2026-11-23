import { describe, expect, it } from "vitest";
import { hasClearHebrewMeaning } from "@/lib/engine/requirements";
import type { NameEntry } from "@/lib/types";
import allNames from "../data/names.json";

const names = allNames as NameEntry[];
const byName = (he: string) => names.find((n) => n.nameHe === he)!;

describe("the clear Hebrew meaning chip", () => {
  it("counts names from Hebrew or Aramaic, their feminine forms, and Hebrew words of foreign origin", () => {
    expect(["דניאל", "שמואל", "נועה", "טל", "עילאי", "לילך", "דפנה", "יסמין", "מיכאלה", "גבריאלה"].filter((n) => !hasClearHebrewMeaning(byName(n)))).toEqual([]);
  });

  it("leaves out a Hebrew name whose meaning is unclear", () => {
    expect(byName("סיאל").meaningHe).toContain("לא ודאי");
    expect(hasClearHebrewMeaning(byName("סיאל"))).toBe(false);
  });

  it("leaves out foreign names and foreign forms of Hebrew or Aramaic names", () => {
    expect(["קים", "סמואל", "אמיל", "טגסט", "אוולין", "תומאס"].filter((n) => hasClearHebrewMeaning(byName(n)))).toEqual([]);
  });
});
