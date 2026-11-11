import type { AppState } from "./state";

/** Data is saved once the parent has started a search, so the welcome screen offers the options menu only then. */
export const hasSavedData = (s: AppState): boolean => s.terms !== null;

/** Restarting does nothing on the welcome screen unless the parent came back to it mid-search. */
export const canRestart = (s: AppState): boolean => s.step !== "welcome" || s.rounds.length > 0;
