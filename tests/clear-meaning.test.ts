import { describe, expect, it } from "vitest";
import { hasHebrewSource } from "@/lib/engine/requirements";
import type { NameEntry } from "@/lib/types";
import allNames from "../data/names.json";

const names = allNames as NameEntry[];
const byName = (he: string) => names.find((n) => n.nameHe === he)!;

describe("the clear Hebrew meaning chip", () => {
  it("counts names from Hebrew or Aramaic, their feminine forms, and Hebrew words of foreign origin", () => {
    expect(["דניאל", "שמואל", "נועה", "טל", "עילאי", "לילך", "מיכאלה", "גבריאלה"].filter((n) => !hasHebrewSource(byName(n)))).toEqual([]);
  });

  it("counts a Hebrew name even when its meaning is unclear", () => {
    expect(byName("סיאל").meaningHe).toContain("לא ודאי");
    expect(hasHebrewSource(byName("סיאל"))).toBe(true);
  });

  it("leaves out foreign names and foreign forms of Hebrew or Aramaic names", () => {
    expect(["קים", "סמואל", "אמיל", "טגסט", "אוולין", "תומאס"].filter((n) => hasHebrewSource(byName(n)))).toEqual([]);
  });
});
