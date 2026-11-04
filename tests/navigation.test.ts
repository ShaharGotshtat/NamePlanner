import { describe, expect, it } from "vitest";
import { backPatch } from "@/lib/client/navigation";
import { initialState, type AppState } from "@/lib/client/state";

const at = (patch: Partial<AppState>): AppState => ({ ...initialState, ...patch });

describe("backPatch", () => {
  it("has no back on the welcome screen", () => {
    expect(backPatch(at({ step: "welcome" }))).toBeNull();
  });

  it("walks back through the first pass", () => {
    expect(backPatch(at({ step: "family" }))).toEqual({ step: "welcome" });
    expect(backPatch(at({ step: "preferences" }))).toEqual({ step: "family" });
    expect(backPatch(at({ step: "rounds" }))).toEqual({ step: "preferences" });
  });

  it("goes from a second pass's preferences back to the summary", () => {
    expect(backPatch(at({ step: "preferences", pass: 2 }))).toEqual({ step: "summary" });
  });

  it("reopens the last round of the pass from the summary and keeps ratings", () => {
    const rounds = [
      { pass: 1, suggestions: [], completed: true },
      { pass: 1, suggestions: [], completed: true },
    ];
    const ratings = { 1: { nameId: 1, verdict: "interesting" as const } };
    const patch = backPatch(at({ step: "summary", rounds, ratings }))!;
    expect(patch.step).toBe("rounds");
    expect(patch.rounds!.map((r) => r.completed)).toEqual([true, false]);
    expect(patch).not.toHaveProperty("ratings");
  });

  it("goes from a summary with no rounds back to preferences", () => {
    expect(backPatch(at({ step: "summary" }))).toEqual({ step: "preferences" });
  });
});
