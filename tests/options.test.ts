import { describe, expect, it } from "vitest";
import { canRestart, hasSavedData } from "@/lib/client/options";
import { initialState, restartPatch, type AppState } from "@/lib/client/state";

const started: AppState = {
  ...initialState,
  step: "rounds",
  terms: { version: "1", acceptedAt: "2026-11-11T10:00:00.000Z" },
  babySex: "girl",
  rounds: [{ pass: 1, suggestions: [], completed: false }],
};

describe("hasSavedData", () => {
  it("is false for a first visit, even while the welcome form is being filled", () => {
    expect(hasSavedData(initialState)).toBe(false);
    expect(hasSavedData({ ...initialState, babySex: "boy", dueDate: "2027-03-15" })).toBe(false);
  });

  it("is true once a search has started, and stays true after a restart", () => {
    expect(hasSavedData(started)).toBe(true);
    expect(hasSavedData({ ...started, ...restartPatch(started) })).toBe(true);
  });
});

describe("canRestart", () => {
  it("is true during a search", () => {
    expect(canRestart(started)).toBe(true);
    expect(canRestart({ ...started, step: "family", rounds: [] })).toBe(true);
  });

  it("is false on the welcome screen right after a restart, when there is nothing left to reset", () => {
    expect(canRestart({ ...started, ...restartPatch(started) })).toBe(false);
  });

  it("is true on the welcome screen when the parent went back to it with rounds in progress", () => {
    expect(canRestart({ ...started, step: "welcome" })).toBe(true);
  });
});
