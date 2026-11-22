import { describe, expect, it } from "vitest";
import { missingData, nextLevel, usableChips } from "@/lib/client/chip-levels";
import { initialState } from "@/lib/client/state";
import { CHIPS } from "@/lib/engine/chips";

const chip = (id: string) => CHIPS.find((c) => c.id === id)!;

describe("nextLevel", () => {
  it("cycles a chip off, רצוי, חובה and off again", () => {
    expect(nextLevel("clearMeaning", undefined)).toBe("want");
    expect(nextLevel("clearMeaning", "want")).toBe("must");
    expect(nextLevel("clearMeaning", "must")).toBeUndefined();
  });

  it("moves the no-unisex chip between off and חובה only", () => {
    expect(nextLevel("noUnisex", undefined)).toBe("must");
    expect(nextLevel("noUnisex", "must")).toBeUndefined();
  });
});

describe("missingData", () => {
  it("disables chips whose data is missing, with a hint", () => {
    expect(missingData(chip("fitsSiblings"), initialState)).toBe("אין אחים ברשימה");
    expect(missingData(chip("dueDateLink"), initialState)).toBe("צריך תאריך לידה");
    expect(missingData(chip("flowsWithSurname"), initialState)).toBe("צריך שם משפחה");
    expect(missingData(chip("clearMeaning"), initialState)).toBeNull();
  });

  it("enables them once the data is there", () => {
    const s = { ...initialState, surname: "כהן", family: [{ name: "יואב", relation: "sibling" as const }] };
    expect(missingData(chip("fitsSiblings"), s)).toBeNull();
    expect(missingData(chip("flowsWithSurname"), s)).toBeNull();
  });
});

describe("usableChips", () => {
  it("leaves out a chip whose data was removed after it was picked", () => {
    const s = { ...initialState, chips: { dueDateLink: "must" as const, clearMeaning: "want" as const } };
    expect(usableChips(s)).toEqual({ clearMeaning: "want" });
  });
});
