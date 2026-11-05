"use client";

import { useState } from "react";
import { CHIPS } from "@/lib/engine/chips";
import { errorIdOf, withErrorId } from "@/lib/client/api";
import { needsCheck, runCheck } from "@/lib/client/preferences";
import { useApp } from "@/lib/client/state";
import type { ChipId, ChipLevel } from "@/lib/types";
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
      return { chips: current ? rest : { ...rest, [id]: "want" } };
    });

  const setLevel = (id: ChipId, level: ChipLevel) => update((s) => ({ chips: { ...s.chips, [id]: level } }));

  const selected = chips.filter((c) => state.chips[c.id]);

  const goToRounds = () => update({ step: "rounds" });

  const proceed = async () => {
    if (!pending) return goToRounds();
    setBusy(true);
    setMessage(null);
    try {
      const result = await runCheck(state);
      update(result.patch);
      setMessage(result.message);
      if (result.ok && !result.patch.profile?.summary && !result.message) goToRounds();
    } catch (error) {
      setMessage(withErrorId("משהו השתבש. נסו שוב.", errorIdOf(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ScreenTitle mood="happy" subtitle="בחרו כל מה שחשוב לכם. אפשר לבחור כמה שרוצים.">מה חשוב לכם בשם?</ScreenTitle>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const level = state.chips[chip.id];
          return (
            <Toggle key={chip.id} selected={!!level} onClick={() => toggle(chip.id)}>
              {level && <span aria-hidden>✓ </span>}
              {chip.label}
              {level === "must" && <span className="ms-1 rounded-full bg-white/25 px-2 text-xs">חובה</span>}
            </Toggle>
          );
        })}
      </div>

      {selected.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line" aria-labelledby="must-title">
          <h2 id="must-title" className="font-medium">
            משהו מזה חובה?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">שם שלא עומד בדרישת חובה לא יוצע בכלל. כל השאר רק יקבלו עדיפות.</p>
          <ul className="mt-3 divide-y divide-line">
            {selected.map((chip) => {
              const must = state.chips[chip.id] === "must";
              return (
                <li key={chip.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
                  <span className="text-sm">{chip.label}</span>
                  <button
                    role="switch"
                    aria-checked={must}
                    aria-label={`${chip.label}: חובה`}
                    onClick={() => setLevel(chip.id, must ? "want" : "must")}
                    className="flex min-h-11 shrink-0 items-center gap-2 text-sm"
                  >
                    <span className={must ? "font-medium text-ink" : "text-ink-soft"}>{must ? "חובה" : "רצוי"}</span>
                    <span className={`relative h-6 w-11 rounded-full transition-colors ${must ? "bg-lavender-dark" : "bg-ink/20"}`}>
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start] ${must ? "start-[1.375rem]" : "start-0.5"}`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <p className="mb-2 font-medium">
          שמות שאתם אוהבים <span className="text-sm font-normal text-ink-soft">(נלמד מהסגנון שלהם, בלי להציע אותם)</span>
        </p>
        <TagInput label="שם שאתם אוהבים" values={state.namesWeLike} onChange={(namesWeLike) => update({ namesWeLike })} placeholder="למשל: תמר" />
      </div>

      {!state.freeTextDisabled && (
        <label className="mt-8 block">
          <span className="mb-2 block font-medium">ספרו לנו עוד</span>
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            maxLength={500}
            value={state.freeText}
            onChange={(e) => update({ freeText: e.target.value })}
            placeholder="למשל: שם עם משמעות שקשורה לטבע"
          />
        </label>
      )}

      {!pending && state.profile?.summary && (
        <p className="mt-4 rounded-2xl bg-lavender-soft p-3 text-sm">{state.profile.summary} לא מדויק? שנו את הטקסט ונבדוק שוב.</p>
      )}
      {message && <p className="mt-4 rounded-2xl bg-white p-3 text-sm ring-1 ring-line">{message}</p>}

      <Button className="mt-8 w-full" onClick={proceed} disabled={busy}>
        {busy ? "בודקים..." : pending ? "המשך" : "נראה טוב, להצעות"}
      </Button>
    </div>
  );
}
