"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { startSession } from "@/lib/client/api";
import { useApp } from "@/lib/client/state";
import { TERMS_VERSION } from "@/lib/constants";
import { deriveFromDueDate } from "@/lib/due-date";
import type { BabySex } from "@/lib/types";
import { Button, inputClass, Toggle } from "../ui";

const SEXES: { id: BabySex; label: string }[] = [
  { id: "boy", label: "בן" },
  { id: "girl", label: "בת" },
  { id: "unknown", label: "עוד לא יודעים" },
];

export function Welcome() {
  const { state, update } = useApp();
  const [open, setOpen] = useState<boolean | null>(null);
  const [dueDate, setDueDate] = useState("");

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
    <div className="pt-6">
      <h1 className="font-display text-3xl font-semibold leading-tight">
        מאפס רעיונות לרשימה קצרה של שמות, <span className="text-coral">בעשר דקות.</span>
      </h1>
      <p className="mt-3 text-ink-soft">בלי הרשמה. כל מה שתכתבו נשאר בטלפון שלכם.</p>

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
          value={dueDate}
          onChange={(e) => {
            setDueDate(e.target.value);
            update({ dueDerived: e.target.value ? deriveFromDueDate(e.target.value) : null });
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
        <>
          <Button className="mt-8 w-full text-lg" disabled={!state.babySex || open === null} onClick={start}>
            בואו נתחיל
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
            בלחיצה על התחלה אתם מסכימים ל
            <Link href="/terms" className="underline">
              תנאי השימוש
            </Link>{" "}
            ומבינים שההצעות נוצרות בבינה מלאכותית ועשויות לטעות.
          </p>
        </>
      )}
    </div>
  );
}
