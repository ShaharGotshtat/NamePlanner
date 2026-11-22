"use client";

import { useState, type ReactNode } from "react";
import { CHIPS, type ChipDefinition } from "@/lib/engine/chips";
import { errorIdOf, withErrorId } from "@/lib/client/api";
import { MANY_MUSTS, missingData, nextLevel, usableChips } from "@/lib/client/chip-levels";
import { dueChipLabel } from "@/lib/links";
import { needsCheck, runCheck } from "@/lib/client/preferences";
import { useApp, type AppState } from "@/lib/client/state";
import type { ChipId, ChipLevel } from "@/lib/types";
import { TagInput } from "../TagInput";
import { Button, inputClass, ScreenTitle } from "../ui";

export function Preferences() {
  const { state, update } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pending = needsCheck(state);

  const cycle = (id: ChipId) =>
    update((s) => {
      const { [id]: current, ...rest } = s.chips;
      const next = nextLevel(id, current);
      return { chips: next ? { ...rest, [id]: next } : rest };
    });

  const chosen = Object.values(usableChips(state));
  const selectedCount = chosen.length;
  const mustCount = chosen.filter((level) => level === "must").length;

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
      <ScreenTitle mood="happy" subtitle="לחיצה אחת: רצוי. שנייה: חובה. שלישית: מבטלת.">מה חשוב לכם בשם?</ScreenTitle>

      <div aria-hidden className="-mt-3 mb-4 flex items-center gap-2 text-xs text-ink-soft">
        <span className="rounded-full border-2 border-line bg-white px-2.5 py-1 text-ink">לא חשוב</span>
        <span>←</span>
        <span className={`rounded-full border-2 px-2.5 py-1 font-medium ${LEVEL_STYLES.want}`}>✓ רצוי</span>
        <span>←</span>
        <span className={`rounded-full border-2 px-2.5 py-1 font-medium ${LEVEL_STYLES.must}`}>
          <LockIcon /> חובה
        </span>
      </div>

      <div role="group" aria-label="מה חשוב לכם" className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <ChipButton
            key={chip.id}
            chip={chip.id === "dueDateLink" && state.dueDerived ? { ...chip, label: dueChipLabel(state.dueDerived) } : chip}
            level={state.chips[chip.id]}
            hint={missingData(chip, state)}
            onClick={() => cycle(chip.id)}
          />
        ))}
      </div>

      <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
        {selectedCount === 0 ? "לא נבחר כלום עדיין" : `נבחרו ${selectedCount}, מתוכם ${mustCount} חובה`}
      </p>
      {mustCount >= MANY_MUSTS && (
        <p className="mt-2 rounded-xl bg-[#fdeceb] px-3 py-2 text-sm text-rose-deep">
          {mustCount} דרישות חובה עלולות לצמצם מאוד את ההצעות. אפשר להפוך חלק ל„רצוי”.
        </p>
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

const LEVEL_STYLES: Record<ChipLevel | "off", string> = {
  off: "border-line bg-white text-ink hover:border-lavender-dark/50",
  want: "border-lavender-dark bg-lavender-soft text-lavender-dark",
  must: "border-lavender-dark bg-lavender-dark text-white",
};

const LEVEL_NAMES: Record<ChipLevel | "off", string> = { off: "לא נבחר", want: "רצוי", must: "חובה" };

function LockIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-[-1px]">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * One chip per criterion; each tap moves it to the next level. Every level's text is laid in the same
 * grid cell and only the current one shows, so the chip keeps its size and the row never reflows.
 */
function ChipButton({ chip, level, hint, onClick }: { chip: ChipDefinition; level: ChipLevel | undefined; hint: string | null; onClick: () => void }) {
  const state = hint ? "off" : (level ?? "off");
  const variants: { key: ChipLevel | "off"; content: ReactNode }[] = [
    { key: "off", content: chip.label },
    ...(chip.filter ? [] : [{ key: "want" as const, content: <>✓ {chip.label}</> }]),
    { key: "must", content: <><LockIcon /> {chip.label} · חובה</> },
  ];
  return (
    <button
      type="button"
      disabled={!!hint}
      aria-label={hint ? `${chip.label}: ${hint}` : `${chip.label}: ${LEVEL_NAMES[state]}`}
      onClick={onClick}
      className={`min-h-11 rounded-full border-2 px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${LEVEL_STYLES[state]}`}
    >
      {hint ? (
        <>
          {chip.label} <span className="text-xs font-normal">· {hint}</span>
        </>
      ) : (
        <span className="grid">
          {variants.map((v) => (
            <span key={v.key} aria-hidden className={`col-start-1 row-start-1 ${v.key === "off" ? "" : "font-medium"} ${v.key === state ? "" : "invisible"}`}>
              {v.content}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
