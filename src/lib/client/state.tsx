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

export type Step = "welcome" | "family" | "preferences" | "rounds" | "summary";

export interface RoundState {
  pass: number;
  suggestions: Suggestion[];
  completed: boolean;
}

/** Everything the parent enters. It lives only in this browser's local storage. */
export interface AppState {
  step: Step;
  terms: { version: string; acceptedAt: string } | null;
  babySex: BabySex | null;
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
  flagged: boolean;
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
  flagged: false,
  pass: 1,
  rounds: [],
  ratings: {},
  favoriteId: null,
  ourPick: null,
  token: null,
};

const STORAGE_KEY = "nameplanner:v1";

type Update = Partial<AppState> | ((state: AppState) => Partial<AppState>);

interface AppContextValue {
  state: AppState;
  update: (change: Update) => void;
  startOver: () => void;
  deleteAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function load(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode); the flow still works for this visit.
    }
  }, [state]);

  const update = useCallback((change: Update) => {
    setState((s) => (s ? { ...s, ...(typeof change === "function" ? change(s) : change) } : s));
  }, []);

  const startOver = useCallback(() => update(restartPatch), [update]);

  const deleteAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
