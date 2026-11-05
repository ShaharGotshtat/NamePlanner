import { describe, expect, it } from "vitest";
import { initialState, restartPatch, roundRequest, type AppState } from "@/lib/client/state";
import type { Suggestion } from "@/lib/types";
import { byName } from "./fixtures";

const suggestion = (nameHe: string): Suggestion => ({ name: byName(nameHe), sex: "girl", reason: "", explanation: [] });

const afterTwoSearches = (): AppState => {
  let s: AppState = {
    ...initialState,
    step: "summary",
    dueDate: "2027-03-15",
    surname: "כהן",
    family: [{ name: "דוד", relation: "grandparent" }],
    chips: { unisex: "want" },
    freeText: "שם קצר",
    rounds: [{ pass: 1, suggestions: [suggestion("תמר"), suggestion("נועה")], completed: true }],
    ratings: {
      [byName("תמר").id]: { nameId: byName("תמר").id, verdict: "no" },
      [byName("נועה").id]: { nameId: byName("נועה").id, verdict: "unsure" },
    },
  };
  s = { ...s, ...restartPatch(s) };
  s = {
    ...s,
    rounds: [{ pass: 1, suggestions: [suggestion("יעל")], completed: true }],
    ratings: { [byName("יעל").id]: { nameId: byName("יעל").id, verdict: "no" } },
  };
  return { ...s, ...restartPatch(s) };
};

describe("restartPatch", () => {
  it("keeps everything the parent entered and clears the rounds and votes", () => {
    const s = afterTwoSearches();
    expect(s.step).toBe("welcome");
    expect(s.dueDate).toBe("2027-03-15");
    expect(s.surname).toBe("כהן");
    expect(s.family).toEqual([{ name: "דוד", relation: "grandparent" }]);
    expect(s.chips).toEqual({ unisex: "want" });
    expect(s.freeText).toBe("שם קצר");
    expect(s.rounds).toEqual([]);
    expect(s.ratings).toEqual({});
    expect(s.pass).toBe(1);
  });

  it("remembers names declined in every earlier search, but not the maybes", () => {
    const s = afterTwoSearches();
    expect(s.declined).toEqual(["תמר", "יעל"]);
    expect(roundRequest(s).declined).toEqual(["תמר", "יעל"]);
  });
});
