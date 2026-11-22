"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "../Mascot";
import { Button } from "../ui";

/** Asks before the summary when the open round still has names the parent has not seen. */
export function FinishCheck({ count, onKeepGoing, onFinish }: { count: number; onKeepGoing: () => void; onFinish: () => void }) {
  const primary = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onKeepGoing();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onKeepGoing]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden className="absolute inset-0 bg-ink/45" onClick={onKeepGoing} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-check-title"
        className="relative flex w-full max-w-md flex-col gap-4 rounded-t-3xl bg-white px-5 pt-3 pb-7"
      >
        <div aria-hidden className="h-1 w-10 self-center rounded-full bg-line" />
        <div className="flex items-center gap-3">
          <Mascot mood="surprised" size={56} />
          <div>
            <h2 id="finish-check-title" className="font-display text-xl font-semibold">
              רגע לפני הסיכום
            </h2>
            <p className="mt-1">
              נשארו עוד <b className="font-semibold">{count === 1 ? "שם אחד" : `${count} שמות`}</b> בסבב הזה שעוד לא ראיתם.
            </p>
          </div>
        </div>
        <div aria-hidden className="flex gap-2">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-rose bg-cream font-display text-2xl font-semibold text-rose-dark"
            >
              ?
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Button ref={primary} className="min-h-14 text-lg" onClick={onKeepGoing}>
            להמשיך לראות
          </Button>
          <Button variant="secondary" onClick={onFinish}>
            לסיכום בכל זאת
          </Button>
        </div>
        <p className="text-center text-xs text-ink-soft">השמות יחכו לכם בסיכום, תחת „עוד לא ראיתם”.</p>
      </section>
    </div>
  );
}
