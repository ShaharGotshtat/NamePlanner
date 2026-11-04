"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRound } from "@/lib/client/api";
import { runCheck } from "@/lib/client/preferences";
import { roundRequest, useApp, type AppState } from "@/lib/client/state";
import { ROUNDS_PER_PASS } from "@/lib/constants";
import type { Verdict } from "@/lib/types";
import { Button, inputClass } from "../ui";
import { NameCard } from "./NameCard";

const currentRound = (s: AppState) => {
  const last = s.rounds.at(-1);
  return last && last.pass === s.pass && !last.completed ? last : null;
};

export function Rounds() {
  const { state, update } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [roundNote, setRoundNote] = useState("");
  const [misreads, setMisreads] = useState<{ nameId: number; requirement: string }[]>([]);
  const requested = useRef(false);
  // Names in a round are revealed one at a time. Already-rated names (e.g. after a reload) start revealed.
  const [revealed, setRevealed] = useState(() => {
    const r = currentRound(state);
    return r ? r.suggestions.filter((x) => state.ratings[x.name.id]?.verdict).length : 0;
  });
  const [animateFrom, setAnimateFrom] = useState(Infinity);
  const revealedRefs = useRef<(HTMLDivElement | null)[]>([]);

  const round = currentRound(state);
  const roundNumber = state.rounds.filter((r) => r.pass === state.pass).length;
  const allowNotes = !state.freeTextDisabled;

  const loadRound = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { suggestions, token } = await fetchRound(roundRequest(state), state.token);
      update((s) => ({ token, rounds: [...s.rounds, { pass: s.pass, suggestions, completed: false }] }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [state, update]);

  useEffect(() => {
    if (round || requested.current) return;
    requested.current = true;
    loadRound();
  }, [round, loadRound]);

  const rate = (nameId: number, verdict: Verdict) =>
    update((s) => {
      const ratings = { ...s.ratings, [nameId]: { ...s.ratings[nameId], nameId, verdict } };
      if (verdict !== "taken") return { ratings };
      const name = s.rounds.flatMap((r) => r.suggestions).find((x) => x.name.id === nameId)!.name.nameHe;
      return { ratings, family: [...s.family, { name, relation: "other" }] };
    });

  /** Takes back a "Taken in our family" tap: the card returns unrated and the name leaves the family list. */
  const undoTaken = (nameId: number, nameHe: string) =>
    update((s) => {
      const { [nameId]: _, ...ratings } = s.ratings;
      const index = s.family.findLastIndex((f) => f.relation === "other" && f.name === nameHe);
      return { ratings, family: index < 0 ? s.family : s.family.filter((_, i) => i !== index) };
    });

  const setNote = (nameId: number, note: string) =>
    update((s) => ({ ratings: { ...s.ratings, [nameId]: { ...s.ratings[nameId], nameId, note } } }));

  const next = async () => {
    if (!round) return;
    const cardNotes = round.suggestions
      .map((x) => ({ name: x.name.nameHe, note: state.ratings[x.name.id]?.note?.trim() }))
      .filter((x) => x.note)
      .map((x) => `על השם ${x.name}: ${x.note}`);
    const newNotes = [
      ...cardNotes,
      ...[...new Set(misreads.map((m) => m.requirement))].map((r) => `לגבי "${r}": לא לזה התכוונתי`),
      ...(roundNote.trim() ? [`על הסבב: ${roundNote.trim()}`] : []),
    ];

    const finishedPass = roundNumber >= ROUNDS_PER_PASS;
    const completed = { rounds: state.rounds.map((r) => (r === round ? { ...r, completed: true } : r)) };
    let patch: Partial<AppState> = { ...completed, ...(finishedPass ? { step: "summary" as const } : {}) };

    if (newNotes.length && allowNotes) {
      setLoading(true);
      // A round reopened with the back button sends its notes again, so drop repeats.
      const withNotes = { ...state, notes: [...new Set([...state.notes, ...newNotes])] };
      try {
        patch = { ...patch, notes: withNotes.notes, ...(await runCheck(withNotes)).patch };
      } catch {
        patch = { ...patch, notes: withNotes.notes };
      }
      setLoading(false);
    }

    setRoundNote("");
    setMisreads([]);
    setRevealed(0);
    setAnimateFrom(0);
    requested.current = false;
    update(patch);
  };

  if (error) {
    return (
      <div className="pt-10 text-center">
        <p>לא הצלחנו להביא הצעות.</p>
        <Button className="mt-4" onClick={loadRound}>
          לנסות שוב
        </Button>
      </div>
    );
  }

  if (!round || loading) {
    return <p className="pt-16 text-center text-ink-soft">מחפשים שמות בשבילכם...</p>;
  }

  if (round.suggestions.length === 0) {
    return (
      <div className="pt-10 text-center">
        <p>נגמרו לנו השמות שמתאימים לכל הבחירות שלכם.</p>
        <Button className="mt-4" onClick={() => update({ step: "summary" })}>
          לסיכום
        </Button>
      </div>
    );
  }

  const anyInteresting = Object.values(state.ratings).some((r) => r.verdict === "interesting");
  const allRated = round.suggestions.every((x) => state.ratings[x.name.id]?.verdict);
  const total = round.suggestions.length;
  const allRevealed = revealed >= total;

  const revealNext = () => {
    const index = revealed;
    setAnimateFrom(Math.min(animateFrom, index));
    setRevealed(index + 1);
    requestAnimationFrame(() => {
      const el = revealedRefs.current[index];
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  };

  return (
    <div>
      <div className="mb-4 flex min-h-11 items-center justify-between">
        <p className="font-display text-lg font-semibold">
          סבב {roundNumber} מתוך {ROUNDS_PER_PASS}
        </p>
        {anyInteresting && (
          <Button variant="secondary" className="animate-name-reveal text-sm" onClick={() => update({ step: "summary" })}>
            מצאתי!
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-soft">ההצעות נוצרות בבינה מלאכותית. בדקו שם לפני שאתם רושמים אותו.</p>

      <div className="space-y-4">
        {round.suggestions.map((s, i) =>
          i < revealed ? (
            <div
              key={s.name.id}
              ref={(el) => {
                revealedRefs.current[i] = el;
              }}
              tabIndex={-1}
              aria-label={`שם ${i + 1} מתוך ${total}`}
              className={`rounded-3xl focus:outline-none ${i >= animateFrom ? "animate-name-reveal" : ""}`}
            >
              <NameCard
                suggestion={s}
                rating={state.ratings[s.name.id]}
                showSex={state.babySex === "unknown"}
                allowNotes={allowNotes}
                onRate={(verdict) => rate(s.name.id, verdict)}
                onNote={(note) => setNote(s.name.id, note)}
                onMisread={(requirement, on) =>
                  setMisreads((m) =>
                    on ? [...m, { nameId: s.name.id, requirement }] : m.filter((x) => !(x.nameId === s.name.id && x.requirement === requirement)),
                  )
                }
                onUndoTaken={() => undoTaken(s.name.id, s.name.nameHe)}
              />
            </div>
          ) : i === revealed ? (
            <button
              key={s.name.id}
              onClick={revealNext}
              aria-label={`חשיפת שם ${i + 1} מתוך ${total}`}
              className="animate-sealed-pulse flex min-h-32 w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-coral bg-white p-5 text-center shadow-sm"
            >
              <span aria-hidden className="font-display text-4xl font-semibold text-coral">?</span>
              <span className="text-sm text-ink-soft">
                שם {i + 1} מתוך {total}
              </span>
            </button>
          ) : (
            <div
              key={s.name.id}
              aria-hidden
              className="flex min-h-20 items-center justify-center rounded-3xl border-2 border-dashed border-line text-2xl text-ink-soft/40"
            >
              ?
            </div>
          ),
        )}
      </div>

      {allowNotes && allRevealed && (
        <input
          className={`${inputClass} mt-4 text-sm`}
          maxLength={200}
          value={roundNote}
          onChange={(e) => setRoundNote(e.target.value)}
          placeholder="הערה על כל הסבב (למשל: כולם מיושנים מדי)"
          aria-label="הערה על הסבב"
        />
      )}

      <Button className="mt-6 w-full" disabled={!allRevealed || !allRated} onClick={next}>
        {roundNumber >= ROUNDS_PER_PASS ? "לסיכום" : "לסבב הבא"}
      </Button>
    </div>
  );
}
