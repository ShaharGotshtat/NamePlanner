"use client";

import { useEffect, useState } from "react";
import { startSession } from "@/lib/client/api";
import { useApp } from "@/lib/client/state";
import { canStart } from "@/lib/client/welcome";
import { TERMS_VERSION } from "@/lib/constants";
import { deriveFromDueDate } from "@/lib/due-date";
import type { BabySex } from "@/lib/types";
import { Mascot } from "../Mascot";
import { Button, inputClass, Toggle } from "../ui";

const SEXES: { id: BabySex; label: string }[] = [
  { id: "boy", label: "בן" },
  { id: "girl", label: "בת" },
  { id: "unknown", label: "עוד לא יודעים" },
];

export function Welcome() {
  const { state, update } = useApp();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    startSession()
      .then(({ open, token }) => {
        setOpen(open);
        update({ token });
      })
      .catch(() => setOpen(true));
  }, [update]);

  const derived = state.dueDerived;

  const start = () =>
    update({ step: "family", terms: { version: TERMS_VERSION, acceptedAt: new Date().toISOString() } });

  return (
    <div className="pt-8">
      <div className="flex flex-col items-center text-center">
        <Mascot className="animate-mascot-bob" />
        <h1 dir="ltr" className="mt-3 font-display text-4xl font-semibold leading-tight">
          Name Planner<span className="text-coral">.</span>
        </h1>
        <p className="mt-2 text-lg text-ink-soft">בואו נמצא שמות לילדים העתידיים שלכם!</p>
      </div>

      <fieldset className="mt-8">
        <legend className="mb-3 font-medium">מי בדרך?</legend>
        <div className="flex flex-wrap gap-2">
          {SEXES.map((s) => (
            <Toggle key={s.id} selected={state.babySex === s.id} onClick={() => update({ babySex: s.id })}>
              {s.label}
            </Toggle>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="mb-2 block font-medium">
          תאריך לידה משוער <span className="text-sm font-normal text-ink-soft">(לא חובה)</span>
        </span>
        <input
          type="date"
          className={inputClass}
          value={state.dueDate}
          onChange={(e) => {
            update({ dueDate: e.target.value, dueDerived: e.target.value ? deriveFromDueDate(e.target.value) : null });
          }}
        />
      </label>
      {derived && (
        <p className="mt-2 text-sm text-teal">
          {[`חודש ${derived.hebrewMonth}`, derived.holiday, `מזל ${derived.zodiac}`, derived.season].filter(Boolean).join(" · ")}
        </p>
      )}

      {open === false ? (
        <p className="mt-8 rounded-2xl bg-white p-4 text-center font-medium">
          היום כבר מלא אצלנו. נשמח לראות אתכם מחר!
        </p>
      ) : (
        <Button className="mt-8 w-full text-lg" disabled={!canStart(state.babySex, open)} onClick={start}>
          בואו נתחיל
        </Button>
      )}
    </div>
  );
}
