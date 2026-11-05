import { describe, expect, it } from "vitest";
import { initialState, restartPatch } from "@/lib/client/state";
import { canStart } from "@/lib/client/welcome";

describe("canStart", () => {
  it("is enabled for a restored sex while the session check is still loading", () => {
    const restored = { ...initialState, babySex: "girl" as const, dueDate: "2027-03-15", step: "summary" as const };
    const s = { ...restored, ...restartPatch(restored) };
    expect(s.babySex).toBe("girl");
    expect(canStart(s.babySex, null)).toBe(true);
  });

  it("is enabled once the check says the day is open", () => {
    expect(canStart("unknown", true)).toBe(true);
  });

  it("is disabled until a sex is chosen", () => {
    expect(canStart(null, null)).toBe(false);
    expect(canStart(null, true)).toBe(false);
  });

  it("is disabled when the daily budget is used up", () => {
    expect(canStart("boy", false)).toBe(false);
  });
});
