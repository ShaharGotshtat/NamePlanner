"use client";

import { useState } from "react";
import { CHIPS, isFilterChip } from "@/lib/engine/chips";
import { errorIdOf, withErrorId } from "@/lib/client/api";
import { needsCheck, runCheck } from "@/lib/client/preferences";
import { useApp, type AppState } from "@/lib/client/state";
import type { ChipId, ChipLevel } from "@/lib/types";
import { LevelPicker } from "../LevelPicker";
import { TagInput } from "../TagInput";
import { Button, inputClass, ScreenTitle, Toggle } from "../ui";

export function Preferences() {
  const { state, update } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const chips = CHIPS.filter((c) => !c.needsDueDate || state.dueDerived);
  const pending = needsCheck(state);

  const toggle = (id: ChipId) =>
    update((s) => {
      const { [id]: current, ...rest } = s.chips;
      return { chips: current ? rest : { ...rest, [id]: isFilterChip(id) ? "must" : "want" } };
    });

  const setLevel = (id: ChipId, level: ChipLevel) => update((s) => ({ chips: { ...s.chips, [id]: level } }));

  const selected = chips.filter((c) => state.chips[c.id] && !c.filter);

  const goToRounds = () => update({ step: "rounds" });

  /** An open round without votes was picked for the old input, so it is dropped and a fresh one is fetched. */
  const dropUnvotedRound = (s: AppState) => {
    const last = s.rounds.at(-1);
    const unvoted = last && last.pass === s.pass && !last.completed && !last.suggestions.some((x) => s.ratings[x.name.id]?.verdict);
    return unvoted ? { rounds: s.rounds.slice(0, -1) } : {};
  };

  /**
   * One tap goes straight to the suggestions. How the free text was understood shows as a short line
   * on the first round, not as a confirmation step here. Only a problem with the text stops here.
   */
  const proceed = async () => {
    if (!pending) return goToRounds();
    setBusy(true);
    setMessage(null);
    try {
      const result = await runCheck(state);
      setMessage(result.message);
      const go = result.ok && !result.message;
      update((s) => ({ ...result.patch, ...(go ? { ...dropUnvotedRound(s), step: "rounds" as const } : {}) }));
    } catch (error) {
      setMessage(withErrorId("משהו השתבש. אפשר לנסות שוב.", errorIdOf(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ScreenTitle mood="happy" subtitle="אפשר לבחור כל מה שחשוב.">מה חשוב לכם בשם?</ScreenTitle>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const level = state.chips[chip.id];
          return (
            <Toggle key={chip.id} selected={!!level} onClick={() => toggle(chip.id)}>
              {level && <span aria-hidden>✓ </span>}
              {chip.label}
              {level === "must" && !chip.filter && <span className="ms-1 rounded-full bg-white/25 px-2 text-xs">חובה</span>}
            </Toggle>
          );
        })}
      </div>

      {selected.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line" aria-labelledby="must-title">
          <h2 id="must-title" className="font-medium">
            כמה זה חשוב?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">רצוי: שמות כאלה יקבלו עדיפות. חובה: שם שלא עומד בזה לא יוצע בכלל.</p>
          <ul className="mt-3 divide-y divide-line">
            {selected.map((chip) => {
              const level = state.chips[chip.id] ?? "want";
              return (
                <li key={chip.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
                  <span className="text-sm">{chip.label}</span>
                  <LevelPicker label={chip.label} level={level} onChange={(next) => setLevel(chip.id, next)} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <p className="mb-2 font-medium">
          שמות אהובים <span className="text-sm font-normal text-ink-soft">(נלמד מהסגנון שלהם, בלי להציע אותם)</span>
        </p>
        <TagInput label="שם אהוב" values={state.namesWeLike} onChange={(namesWeLike) => update({ namesWeLike })} placeholder="למשל: תמר" />
      </div>

      {!state.freeTextDisabled && (
        <label className="mt-8 block">
          <span className="mb-2 block font-medium">עוד משהו שחשוב לדעת?</span>
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            maxLength={500}
            value={state.freeText}
            onChange={(e) => update({ freeText: e.target.value })}
            placeholder="למשל: שם עם משמעות שקשורה לטבע"
          />
        </label>
      )}

      {message && <p className="mt-4 rounded-2xl bg-white p-3 text-sm ring-1 ring-line">{message}</p>}

      <Button className="mt-8 w-full" onClick={proceed} disabled={busy}>
        {busy ? "אנחנו על זה..." : "המשך"}
      </Button>
    </div>
  );
}
