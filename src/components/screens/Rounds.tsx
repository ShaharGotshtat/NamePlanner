"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorIdOf, fetchRound, withErrorId } from "@/lib/client/api";
import { Prefetch } from "@/lib/client/prefetch";
import { inputKey, runCheck } from "@/lib/client/preferences";
import { roundRequest, useApp, type AppState } from "@/lib/client/state";
import { ROUNDS_PER_PASS } from "@/lib/constants";
import type { Verdict } from "@/lib/types";
import { Mascot, ThinkingMascot, type MascotMood } from "../Mascot";
import { Button, inputClass } from "../ui";
import { FinishCheck } from "./FinishCheck";
import { NameCard } from "./NameCard";

/** The header mascot mirrors the latest vote in this round. */
const HEADER_MOOD: Record<Verdict | "start", MascotMood> = {
  start: "happy",
  interesting: "cheer",
  unsure: "idea",
  no: "neutral",
  taken: "surprised",
};

const currentRound = (s: AppState) => {
  const last = s.rounds.at(-1);
  return last && last.pass === s.pass && !last.completed ? last : null;
};

/** Names the round that comes after the rounds of this pass shown so far. */
const nextRoundKey = (s: AppState) => `${s.pass}:${s.rounds.filter((r) => r.pass === s.pass).length + 1}`;

/** The next round is fetched once every name but the last has a vote, so it misses only one vote. */
const PREFETCH_VOTES_LEFT = 1;

type RoundResult = Awaited<ReturnType<typeof fetchRound>>;

export function Rounds() {
  const { state, update } = useApp();
  const [loading, setLoading] = useState(false);
  // Set when a round fails to load; holds the server's error ID when there is one.
  const [error, setError] = useState<{ errorId: string | null } | null>(null);
  const [roundNote, setRoundNote] = useState("");
  const [lastVerdict, setLastVerdict] = useState<Verdict | null>(null);
  const requested = useRef(false);
  const prefetch = useRef(new Prefetch<RoundResult>());
  // Set while the notes from the last round are being checked, so no round is fetched with the old preferences.
  const [notesPending, setNotesPending] = useState(false);
  // One name is shown at a time. The first name of a round starts sealed; the rest open with the
  // "next name" button. After a reload, resume at the first unrated name.
  const [index, setIndex] = useState(() => {
    const r = currentRound(state);
    if (!r) return 0;
    const firstUnrated = r.suggestions.findIndex((x) => !state.ratings[x.name.id]?.verdict);
    return firstUnrated < 0 ? r.suggestions.length - 1 : firstUnrated;
  });
  const [opened, setOpened] = useState(() => {
    const r = currentRound(state);
    return !!r && r.suggestions.some((x) => state.ratings[x.name.id]?.verdict);
  });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [finishCheck, setFinishCheck] = useState(false);

  const round = currentRound(state);
  const roundNumber = state.rounds.filter((r) => r.pass === state.pass).length;
  const allowNotes = !state.freeTextDisabled;

  const addRound = useCallback(
    ({ suggestions, token, notice }: RoundResult) =>
      update((s) => ({ token, rounds: [...s.rounds, { pass: s.pass, suggestions, completed: false, notice }] })),
    [update],
  );

  /** Shows the prefetched round if there is one; otherwise, or if it failed, asks for the round now. */
  const loadRound = useCallback(async () => {
    const prefetched = prefetch.current.take(nextRoundKey(state));
    if (prefetched && "ready" in prefetched) return addRound(prefetched.ready);
    setLoading(true);
    setError(null);
    try {
      const result = (prefetched && (await prefetched.pending)) || (await fetchRound(roundRequest(state), state.token));
      addRound(result);
    } catch (err) {
      setError({ errorId: errorIdOf(err) });
    } finally {
      setLoading(false);
    }
  }, [state, addRound]);

  useEffect(() => {
    if (round || requested.current) return;
    if (notesPending && !prefetch.current.has(nextRoundKey(state))) return;
    requested.current = true;
    loadRound();
  }, [round, loadRound, notesPending, state]);

  const votes = round ? round.suggestions.filter((x) => state.ratings[x.name.id]?.verdict).length : 0;
  const lastOfPass = roundNumber >= ROUNDS_PER_PASS;
  useEffect(() => {
    if (!round || lastOfPass || notesPending || votes < round.suggestions.length - PREFETCH_VOTES_LEFT) return;
    const token = state.token;
    prefetch.current.start(
      nextRoundKey(state),
      (signal) => fetchRound(roundRequest(state), token, signal),
      (result) => update({ token: result.token }),
    );
  }, [round, lastOfPass, notesPending, votes, state, update]);

  useEffect(() => {
    const current = prefetch.current;
    return () => current.cancel();
  }, []);

  // Counts the names the parent has seen, so the summary can list the rest of a round left early.
  const seenNow = round && opened ? index + 1 : 0;
  useEffect(() => {
    if (!round || seenNow <= (round.seen ?? 0)) return;
    update((s) => ({ rounds: s.rounds.map((r) => (r === round ? { ...r, seen: seenNow } : r)) }));
  }, [round, seenNow, update]);

  const rate = (nameId: number, verdict: Verdict) => {
    setLastVerdict(verdict);
    update((s) => {
      const ratings = { ...s.ratings, [nameId]: { ...s.ratings[nameId], nameId, verdict } };
      if (verdict !== "taken") return { ratings };
      const name = s.rounds.flatMap((r) => r.suggestions).find((x) => x.name.id === nameId)!.name.nameHe;
      return { ratings, family: [...s.family, { name, relation: "other" }] };
    });
  };

  /** Takes back a "Taken in our family" tap: the card returns unrated and the name leaves the family list. */
  const undoTaken = (nameId: number, nameHe: string) => {
    setLastVerdict(null);
    update((s) => {
      const { [nameId]: _, ...ratings } = s.ratings;
      const index = s.family.findLastIndex((f) => f.relation === "other" && f.name === nameHe);
      return { ratings, family: index < 0 ? s.family : s.family.filter((_, i) => i !== index) };
    });
  };

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
      ...(roundNote.trim() ? [`על הסבב: ${roundNote.trim()}`] : []),
    ];

    const finishedPass = roundNumber >= ROUNDS_PER_PASS;
    const completed = { rounds: state.rounds.map((r) => (r === round ? { ...r, completed: true } : r)) };
    let patch: Partial<AppState> = { ...completed, ...(finishedPass ? { step: "summary" as const } : {}) };

    if (newNotes.length && allowNotes) {
      // A round reopened with the back button sends its notes again, so drop repeats.
      const withNotes = { ...state, notes: [...new Set([...state.notes, ...newNotes])] };
      patch = { ...patch, notes: withNotes.notes };
      if (!finishedPass) {
        checkNotesInBackground(withNotes);
      } else {
        // The summary's pick uses the preferences, so the last round's notes are checked before it opens.
        setLoading(true);
        try {
          patch = { ...patch, ...(await runCheck(withNotes)).patch };
        } catch {}
        setLoading(false);
      }
    }

    setRoundNote("");
    setLastVerdict(null);
    setIndex(0);
    setOpened(false);
    requested.current = false;
    update(patch);
  };

  /**
   * The next round does not wait for the notes: they shape the round after it. The result is applied
   * only if the parent's input is still what was sent (not restarted with other input, edited or deleted).
   */
  const checkNotesInBackground = (withNotes: AppState) => {
    const key = inputKey(withNotes);
    setNotesPending(true);
    runCheck(withNotes)
      .then(({ patch }) => update((s) => (inputKey(s) === key ? patch : {})))
      .catch(() => {})
      .finally(() => setNotesPending(false));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <Mascot mood="sad" size={96} />
        <p className="mt-3">{withErrorId("לא הצלחנו להביא הצעות.", error.errorId)}</p>
        <Button className="mt-4" onClick={loadRound}>
          לנסות שוב
        </Button>
      </div>
    );
  }

  if (!round || loading) {
    return (
      <div className="flex flex-col items-center pt-16 text-center text-ink-soft">
        <ThinkingMascot size={96} className="animate-mascot-bob" />
        <p className="mt-3">עוד רגע יגיעו הצעות...</p>
      </div>
    );
  }

  if (round.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center pt-10 text-center">
        <Mascot mood="surprised" size={96} />
        <p className="mt-3">נגמרו לנו השמות שמתאימים בול...</p>
        <Button className="mt-4" onClick={() => update({ step: "summary" })}>
          לסיכום
        </Button>
      </div>
    );
  }

  const anyInteresting = Object.values(state.ratings).some((r) => r.verdict === "interesting");
  const allRated = round.suggestions.every((x) => state.ratings[x.name.id]?.verdict);
  const total = round.suggestions.length;
  const current = round.suggestions[Math.min(index, total - 1)];
  const currentRated = !!state.ratings[current.name.id]?.verdict;
  const isLast = index >= total - 1;

  const goTo = (i: number) => {
    setIndex(i);
    requestAnimationFrame(() => {
      scrollTo({ top: 0 });
      cardRef.current?.focus({ preventScroll: true });
    });
  };

  const unseenCount = round.suggestions.filter((x, i) => (!opened || i > index) && !state.ratings[x.name.id]?.verdict).length;
  const toSummary = () => (unseenCount ? setFinishCheck(true) : update({ step: "summary" }));

  return (
    <div>
      {finishCheck && (
        <FinishCheck
          count={unseenCount}
          onKeepGoing={() => setFinishCheck(false)}
          onFinish={() => update({ step: "summary" })}
        />
      )}
      <div className="mb-4 flex min-h-11 items-center justify-between">
        <div className="flex items-center gap-2">
          <Mascot key={lastVerdict ?? "start"} mood={HEADER_MOOD[lastVerdict ?? "start"]} size={44} className="animate-mascot-pop" />
          <h1 className="font-display text-lg font-semibold focus:outline-none">
            סבב {roundNumber} מתוך {ROUNDS_PER_PASS}
          </h1>
        </div>
        {anyInteresting && (
          <Button variant="secondary" className="animate-name-reveal text-sm" onClick={toSummary}>
            לסיכום
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-soft">ההצעות נוצרות בבינה מלאכותית. כדאי לבדוק כל שם לפני הרישום.</p>
      {roundNumber === 1 && state.profile?.summary && (
        <p className="mb-4 rounded-xl bg-lavender-soft px-3 py-2 text-xs">{state.profile.summary}</p>
      )}
      {roundNumber === 1 && round.notice && <p className="mb-4 rounded-xl bg-lavender-soft px-3 py-2 text-xs">{round.notice}</p>}

      <div className="mb-3 flex items-center justify-center gap-2" aria-label={`שם ${index + 1} מתוך ${total}`}>
        {round.suggestions.map((s, i) => (
          <span
            key={s.name.id}
            aria-hidden
            className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-rose-dark" : state.ratings[s.name.id]?.verdict ? "w-2 bg-rose" : "w-2 bg-line"}`}
          />
        ))}
        <span className="ms-1 text-xs text-ink-soft">
          שם {index + 1} מתוך {total}
        </span>
      </div>

      {!opened ? (
        <button
          onClick={() => {
            setOpened(true);
            goTo(index);
          }}
          className="animate-sealed-pulse flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-rose bg-white p-6 text-center shadow-sm"
        >
          <span aria-hidden className="font-display text-6xl font-semibold text-rose-dark">?</span>
          <span className="rounded-full bg-rose-dark px-5 py-2.5 font-medium text-white">לחשיפת השם הראשון</span>
        </button>
      ) : (
        <div key={current.name.id} ref={cardRef} tabIndex={-1} className="animate-name-reveal rounded-3xl focus:outline-none">
          <NameCard
            large
            suggestion={current}
            rating={state.ratings[current.name.id]}
            showSex={state.babySex === "unknown"}
            allowNotes={allowNotes}
            onRate={(verdict) => rate(current.name.id, verdict)}
            onNote={(note) => setNote(current.name.id, note)}
            onUndoTaken={() => undoTaken(current.name.id, current.name.nameHe)}
          />
        </div>
      )}

      {opened && isLast && allRated && allowNotes && (
        <input
          className={`${inputClass} mt-4 text-base sm:text-sm`}
          maxLength={200}
          value={roundNote}
          onChange={(e) => setRoundNote(e.target.value)}
          placeholder="הערה על כל הסבב (למשל: כולם מיושנים מדי)"
          aria-label="הערה על הסבב"
        />
      )}

      {opened &&
        (isLast ? (
          <Button className="mt-6 w-full py-4 text-lg" disabled={!allRated} onClick={next}>
            {roundNumber >= ROUNDS_PER_PASS ? "לסיכום" : "לסבב הבא"}
          </Button>
        ) : (
          <Button className="mt-6 w-full py-4 text-lg" disabled={!currentRated} onClick={() => goTo(index + 1)}>
            לשם הבא
          </Button>
        ))}

      {opened && index > 0 && (
        <button className="mx-auto mt-2 block min-h-11 text-sm text-ink-soft underline" onClick={() => goTo(index - 1)}>
          חזרה לשם הקודם
        </button>
      )}
    </div>
  );
}
