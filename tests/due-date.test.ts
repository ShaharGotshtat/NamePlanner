import { describe, expect, it } from "vitest";
import { deriveFromDueDate } from "@/lib/due-date";

describe("deriveFromDueDate", () => {
  it("finds the Hebrew month, a nearby holiday, the zodiac sign and the season", () => {
    expect(deriveFromDueDate("2026-12-05")).toEqual({ hebrewMonth: "כסלו", holiday: "חנוכה", zodiac: "קשת", season: "חורף" });
  });

  it("finds Purim in Adar II of a leap year", () => {
    expect(deriveFromDueDate("2027-03-20").holiday).toBe("פורים");
  });

  it("returns no holiday when none is within a week", () => {
    expect(deriveFromDueDate("2026-07-01").holiday).toBeNull();
  });

  it("gives Leo (Aryeh) for a summer birthday and Capricorn in early January", () => {
    expect(deriveFromDueDate("2026-08-01").zodiac).toBe("אריה");
    expect(deriveFromDueDate("2027-01-05").zodiac).toBe("גדי");
  });
});
