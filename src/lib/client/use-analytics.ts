"use client";

import { useEffect, useRef } from "react";
import type { Verdict } from "@/lib/types";
import { trackEvent } from "./analytics";
import { shownSuggestions, type AppState } from "./state";

/** Sends the flow's anonymous usage events: visits, screens, finished rounds, preferences and summaries. */
export function useAnalytics(state: AppState) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const previousStep = useRef<AppState["step"] | null>(null);

  useEffect(() => trackEvent({ name: "visit", props: { mobile: matchMedia("(pointer: coarse)").matches } }), []);

  useEffect(() => {
    const s = stateRef.current;
    const from = previousStep.current;
    previousStep.current = s.step;
    trackEvent({ name: "screen", props: { step: s.step } });

    if (from === "preferences" && s.step === "rounds") {
      trackEvent({
        name: "preferences",
        props: {
          chips: Object.keys(s.chips).filter((id) => s.chips[id as keyof typeof s.chips]),
          freeText: s.freeText.trim().length > 0,
          namesWeLike: s.namesWeLike.length,
        },
      });
    }

    if (s.step === "summary") {
      const counts: Record<Verdict, number> = { interesting: 0, unsure: 0, no: 0, taken: 0 };
      for (const x of shownSuggestions(s)) {
        const verdict = s.ratings[x.name.id]?.verdict;
        if (verdict) counts[verdict]++;
      }
      trackEvent({ name: "finished", props: { pass: s.pass, ...counts } });
    }
  }, [state.step]);

  const roundsDone = state.rounds.filter((r) => r.pass === state.pass && r.completed).length;
  const reported = useRef(new Set<string>());
  useEffect(() => {
    const key = `${state.pass}:${roundsDone}`;
    if (!roundsDone || reported.current.has(key)) return;
    reported.current.add(key);
    trackEvent({ name: "round_done", props: { pass: state.pass, round: roundsDone } });
  }, [state.pass, roundsDone]);
}
