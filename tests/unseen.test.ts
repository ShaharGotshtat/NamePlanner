import { describe, expect, it } from "vitest";
import { initialState, unseenNames, type AppState } from "@/lib/client/state";
import type { Suggestion } from "@/lib/types";
import { byName } from "./fixtures";

const suggestion = (nameHe: string): Suggestion => ({ name: byName(nameHe), sex: "girl", reason: "", explanation: [] });
const names = ["תמר", "נועה", "יעל", "הדס"].map(suggestion);
const vote = (nameHe: string) => ({ [byName(nameHe).id]: { nameId: byName(nameHe).id, verdict: "interesting" as const } });

const leftEarly = (seen: number): AppState => ({
  ...initialState,
  step: "summary",
  rounds: [
    { pass: 1, suggestions: [suggestion("שירה")], completed: true },
    { pass: 1, suggestions: names, completed: false, seen },
  ],
  ratings: vote("תמר"),
});

describe("unseenNames", () => {
  it("lists the names after the last one shown in the open round", () => {
    expect(unseenNames(leftEarly(1))).toEqual({ round: 2, names: names.slice(1) });
  });

  it("counts every unrated name when the round was never opened", () => {
    const s = leftEarly(0);
    expect(unseenNames({ ...s, ratings: {} })?.names).toEqual(names);
  });

  it("is empty once the round is finished or every name was shown", () => {
    const s = leftEarly(1);
    expect(unseenNames({ ...s, rounds: s.rounds.map((r) => ({ ...r, completed: true })) })).toBeNull();
    expect(unseenNames(leftEarly(4))).toBeNull();
  });
});
