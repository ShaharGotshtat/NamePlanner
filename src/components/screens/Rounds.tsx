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
  const [misreads, setMisreads] = useState<string[]>([]);
  const requested = useRef(false);

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
      ...misreads.map((r) => `לגבי "${r}": לא לזה התכוונתי`),
      ...(roundNote.trim() ? [`על הסבב: ${roundNote.trim()}`] : []),
    ];

    const finishedPass = roundNumber >= ROUNDS_PER_PASS;
    const completed = { rounds: state.rounds.map((r) => (r === round ? { ...r, completed: true } : r)) };
    let patch: Partial<AppState> = { ...completed, ...(finishedPass ? { step: "summary" as const } : {}) };

    if (newNotes.length && allowNotes) {
      setLoading(true);
      const withNotes = { ...state, notes: [...state.notes, ...newNotes] };
      try {
        patch = { ...patch, notes: withNotes.notes, ...(await runCheck(withNotes)).patch };
      } catch {
        patch = { ...patch, notes: withNotes.notes };
      }
      setLoading(false);
    }

    setRoundNote("");
    setMisreads([]);
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

  const allRated = round.suggestions.every((x) => state.ratings[x.name.id]?.verdict);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-lg font-semibold">
          סבב {roundNumber} מתוך {ROUNDS_PER_PASS}
        </p>
        <Button variant="secondary" className="text-sm" onClick={() => update({ step: "summary" })}>
          מצאתי!
        </Button>
      </div>
      <p className="mb-4 text-xs text-ink-soft">ההצעות נוצרות בבינה מלאכותית. בדקו שם לפני שאתם רושמים אותו.</p>

      <div className="space-y-4">
        {round.suggestions.map((s) => (
          <NameCard
            key={s.name.id}
            suggestion={s}
            rating={state.ratings[s.name.id]}
            showSex={state.babySex === "unknown"}
            allowNotes={allowNotes}
            onRate={(verdict) => rate(s.name.id, verdict)}
            onNote={(note) => setNote(s.name.id, note)}
            onMisread={(requirement) => setMisreads((m) => [...m, requirement])}
          />
        ))}
      </div>

      {allowNotes && (
        <input
          className={`${inputClass} mt-4 text-sm`}
          maxLength={200}
          value={roundNote}
          onChange={(e) => setRoundNote(e.target.value)}
          placeholder="הערה על כל הסבב (למשל: כולם מיושנים מדי)"
          aria-label="הערה על הסבב"
        />
      )}

      <Button className="mt-6 w-full" disabled={!allRated} onClick={next}>
        {roundNumber >= ROUNDS_PER_PASS ? "לסיכום" : "לסבב הבא"}
      </Button>
    </div>
  );
}
