"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  BabySex,
  ChipSelection,
  DueDerived,
  FamilyName,
  ParsedProfile,
  Rating,
  RoundRequest,
  Suggestion,
} from "@/lib/types";
import { forgetAnalytics, newRun } from "./analytics";
import { CHIP_IDS } from "@/lib/engine/chips";
import { clearJourney, describeChange, track } from "./journey";

export type Step = "welcome" | "family" | "preferences" | "rounds" | "summary";

export interface RoundState {
  pass: number;
  suggestions: Suggestion[];
  completed: boolean;
  /** How many names of this round were shown, counted from the first. */
  seen?: number;
}

/** Everything the parent enters. It lives only in this browser's local storage. */
export interface AppState {
  step: Step;
  terms: { version: string; acceptedAt: string } | null;
  babySex: BabySex | null;
  /** The due date as YYYY-MM-DD. Only the values derived from it are sent to the server. */
  dueDate: string;
  dueDerived: DueDerived | null;
  surname: string;
  family: FamilyName[];
  chips: ChipSelection;
  freeText: string;
  notes: string[];
  namesWeLike: string[];
  /** Names voted "no" in earlier searches. They survive a restart so they are not suggested again. */
  declined: string[];
  profile: ParsedProfile | null;
  /** The free text, notes and names last sent for checking, so unchanged input is not sent twice. */
  checkedInput: string | null;
  freeTextDisabled: boolean;
  pass: number;
  rounds: RoundState[];
  ratings: Record<number, Rating>;
  favoriteId: number | null;
  ourPick: { pass: number; suggestion: Suggestion | null; dismissed: boolean } | null;
  token: string | null;
}

export const initialState: AppState = {
  step: "welcome",
  terms: null,
  babySex: null,
  dueDate: "",
  dueDerived: null,
  surname: "",
  family: [],
  chips: {},
  freeText: "",
  notes: [],
  namesWeLike: [],
  declined: [],
  profile: null,
  checkedInput: null,
  freeTextDisabled: false,
  pass: 1,
  rounds: [],
  ratings: {},
  favoriteId: null,
  ourPick: null,
  token: null,
};

const STORAGE_KEY = "nameplanner:v1";

/** After this long without use, a returning visit starts a new search (issue #64). Matches the analytics run TTL. */
export const IDLE_RESTART_MS = 24 * 60 * 60 * 1000;

/** What is stored: the state plus when it was last saved. */
type Saved = Partial<AppState> & { savedAt?: number };

type Update = Partial<AppState> | ((state: AppState) => Partial<AppState>);

interface AppContextValue {
  state: AppState;
  update: (change: Update) => void;
  startOver: () => void;
  deleteAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Drops chips saved by an older version (the old "unisex" chip), which the server would reject. */
function knownChips(chips: AppState["chips"] | undefined): AppState["chips"] {
  return Object.fromEntries(Object.entries(chips ?? {}).filter(([id]) => (CHIP_IDS as string[]).includes(id)));
}

/**
 * Resumes where the parent left off, unless the app sat unused for a day or more. Then it opens on the
 * welcome screen with everything entered kept (sex, due date, family, preferences) and the names
 * voted "no" remembered, the same as Start over. Data saved before timestamps existed counts as old.
 * A parent who already reached the summary (on it now, or searching again after it) is never reset,
 * so a finished list is not lost.
 */
export function restore(saved: Saved | null, now = Date.now()): { state: AppState; restarted: boolean } {
  if (!saved) return { state: initialState, restarted: false };
  const { savedAt, ...rest } = saved;
  const state: AppState = { ...initialState, ...rest, chips: knownChips(rest.chips) };
  const idle = savedAt === undefined || now - savedAt >= IDLE_RESTART_MS;
  const reachedSummary = state.step === "summary" || state.pass > 1;
  if (!idle || state.step === "welcome" || reachedSummary) return { state, restarted: false };
  return { state: { ...state, ...restartPatch(state) }, restarted: true };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const { state, restarted } = restore(raw ? JSON.parse(raw) : null);
    if (restarted) newRun();
    return state;
  } catch {
    return initialState;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => setState(load()), []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    } catch {
      // Storage can be unavailable (private mode); the flow still works for this visit.
    }
  }, [state]);

  const update = useCallback((change: Update) => {
    setState((s) => {
      if (!s) return s;
      const patch = typeof change === "function" ? change(s) : change;
      describeChange(patch).forEach(track);
      return { ...s, ...patch };
    });
  }, []);

  const startOver = useCallback(() => {
    newRun();
    update(restartPatch);
  }, [update]);

  const deleteAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    clearJourney();
    forgetAnalytics();
    setState(initialState);
  }, []);

  if (!state) return null;
  return <AppContext.Provider value={{ state, update, startOver, deleteAll }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

export const shownIds = (s: AppState) => s.rounds.flatMap((r) => r.suggestions.map((x) => x.name.id));

export const shownSuggestions = (s: AppState) => s.rounds.flatMap((r) => r.suggestions);

/** The open round of this pass, if the parent left it before seeing every name. */
export function unseenNames(s: AppState): { round: number; names: Suggestion[] } | null {
  const rounds = s.rounds.filter((r) => r.pass === s.pass);
  const open = rounds.at(-1);
  if (!open || open.completed) return null;
  const names = open.suggestions.slice(open.seen ?? 0).filter((x) => !s.ratings[x.name.id]?.verdict);
  return names.length ? { round: rounds.length, names } : null;
}

/** Every name the parent turned down, in this search or an earlier one. */
export function declinedNames(s: AppState): string[] {
  const now = shownSuggestions(s).filter((x) => s.ratings[x.name.id]?.verdict === "no").map((x) => x.name.nameHe);
  return [...new Set([...s.declined, ...now])];
}

/** A new search: the rounds and votes are cleared, everything the parent entered and the declined names are kept. */
export function restartPatch(s: AppState): Partial<AppState> {
  return {
    step: initialState.step,
    declined: declinedNames(s),
    pass: initialState.pass,
    rounds: initialState.rounds,
    ratings: initialState.ratings,
    favoriteId: initialState.favoriteId,
    ourPick: initialState.ourPick,
  };
}

export function roundRequest(s: AppState): RoundRequest {
  return {
    babySex: s.babySex ?? "unknown",
    dueDerived: s.dueDerived,
    surname: s.surname,
    family: s.family,
    chips: s.chips,
    profile: s.profile,
    namesWeLike: s.namesWeLike,
    declined: declinedNames(s),
    ratings: Object.values(s.ratings).map(({ nameId, verdict }) => ({ nameId, verdict })),
    shownIds: shownIds(s),
  };
}
