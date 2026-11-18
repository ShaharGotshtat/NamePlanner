import { describe, expect, it } from "vitest";
import { IDLE_RESTART_MS, initialState, restore, type AppState } from "@/lib/client/state";

const NOW = Date.UTC(2026, 10, 18, 12);

const midFlow: Partial<AppState> = {
  step: "rounds",
  babySex: "girl",
  dueDate: "2027-03-01",
  family: [{ name: "נועה", relation: "sibling" } as AppState["family"][number]],
  chips: { englishFriendly: "must" },
  declined: ["רחל"],
  pass: 2,
  rounds: [{ pass: 2, suggestions: [], completed: false }],
  favoriteId: 7,
};

describe("restore", () => {
  it("starts empty with nothing saved", () => {
    expect(restore(null, NOW)).toEqual({ state: initialState, restarted: false });
  });

  it("drops a chip saved by an older version", () => {
    const saved = { ...midFlow, chips: { unisex: "want", noUnisex: "must" } as AppState["chips"], savedAt: NOW };
    expect(restore(saved, NOW).state.chips).toEqual({ noUnisex: "must" });
  });

  it("resumes where the parent left off within a day", () => {
    const { state, restarted } = restore({ ...midFlow, savedAt: NOW - IDLE_RESTART_MS + 60_000 }, NOW);
    expect(restarted).toBe(false);
    expect(state.step).toBe("rounds");
    expect(state.rounds).toHaveLength(1);
  });

  it("after a day unused, opens on welcome with the entered data kept and the search cleared", () => {
    const { state, restarted } = restore({ ...midFlow, savedAt: NOW - 3 * IDLE_RESTART_MS }, NOW);
    expect(restarted).toBe(true);
    expect(state).toMatchObject({
      step: "welcome",
      babySex: "girl",
      dueDate: "2027-03-01",
      family: midFlow.family,
      chips: midFlow.chips,
      declined: ["רחל"],
      pass: 1,
      rounds: [],
      ratings: {},
      favoriteId: null,
    });
    expect(state).not.toHaveProperty("savedAt");
  });

  it("treats data saved before timestamps existed as old", () => {
    expect(restore(midFlow, NOW).restarted).toBe(true);
  });

  it("does not count a parent already on the welcome screen as restarted", () => {
    expect(restore({ ...initialState, savedAt: 0 }, NOW).restarted).toBe(false);
  });
});
