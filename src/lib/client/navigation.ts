import type { AppState } from "./state";

/**
 * Where the back button leads from the current screen. Everything the parent entered is kept.
 * Returns null on the first screen.
 */
export function backPatch(s: AppState): Partial<AppState> | null {
  switch (s.step) {
    case "welcome":
      return null;
    case "family":
      return { step: "welcome" };
    case "preferences":
      // On a second pass ("go again" from the summary) the family step is long done, so go back to the summary.
      return { step: s.pass > 1 ? "summary" : "family" };
    case "rounds":
      // The open round stays as it is and resumes when the parent continues.
      return { step: "preferences" };
    case "summary": {
      // Reopen the last round of this pass, so its votes can be changed, unless one is still open ("Found it!" mid-round).
      const lastIndex = s.rounds.findLastIndex((r) => r.pass === s.pass);
      if (lastIndex < 0) return { step: "preferences" };
      return {
        step: "rounds",
        rounds: s.rounds.map((r, i) => (i === lastIndex ? { ...r, completed: false } : r)),
      };
    }
  }
}
