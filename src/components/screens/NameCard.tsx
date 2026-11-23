"use client";

import { useState } from "react";
import { displayMeaning, popularity } from "@/lib/names/catalog";
import type { Fit, Origin, Rating, Suggestion, Verdict } from "@/lib/types";
import { useFeedback } from "../Feedback";
import { MascotSays, type MascotMood } from "../Mascot";
import { Card, inputClass } from "../ui";

const VERDICTS: { id: Exclude<Verdict, "taken">; label: string; selected: string }[] = [
  { id: "no", label: "לא", selected: "border-ink bg-ink text-white" },
  { id: "unsure", label: "אולי", selected: "border-lavender-dark bg-lavender-dark text-white" },
  { id: "interesting", label: "מעניין!", selected: "border-rose-dark bg-rose-dark text-white" },
];

/** Each fit has its own icon as well as its colour, so the state never relies on colour alone. */
const FIT_CHIPS: Record<Fit, { icon: string; label: string; className: string }> = {
  met: { icon: "✓", label: "מתקיים", className: "bg-lavender-soft text-lavender-dark" },
  partly: { icon: "~", label: "מתקיים חלקית", className: "border border-dashed border-ink-soft/60 bg-white text-ink-soft" },
  not_met: { icon: "✗", label: "לא מתקיים", className: "bg-ink/10 text-ink" },
};

const SEX_LABELS = { boy: "לבן", girl: "לבת", unisex: "יוניסקס" };
const TREND_LABELS = { rising: "במגמת עלייה", falling: "במגמת ירידה", steady: "יציב" };

const ORIGIN_LABELS: Record<Origin, string> = {
  hebrew: "עברי",
  aramaic: "ארמי",
  arabic: "ערבי",
  greek: "יווני",
  latin: "לטיני",
  persian: "פרסי",
  yiddish: "יידי",
  english: "אנגלי",
  other: "אחר",
};

/** The mascot's reaction to each verdict; the line is picked by name id so it stays put on re-render. */
const REACTIONS: Record<Verdict, { mood: MascotMood; lines: string[] }> = {
  interesting: { mood: "cheer", lines: ["יש! שמרתי אותו בצד.", "איזה יופי, נשמע מבטיח!", "מעולה, יש לנו כיוון מבטיח!"] },
  unsure: { mood: "idea", lines: ["בסדר, אפשר לחשוב על זה עוד.", "נחזור אליו בסיכום.", "גם \"אולי\" זו תשובה."] },
  no: { mood: "neutral", lines: ["לא נורא ואנחנו על זה, יש עוד הרבה שמות!", "הבנתי, נמשיך לחפש.", "אוקיי, הוא לא מתאים."] },
  taken: { mood: "surprised", lines: ["אה, כבר תפוס! לא נציע אותו שוב."] },
};

const reactionFor = (verdict: Verdict, id: number) => {
  const r = REACTIONS[verdict];
  return { mood: r.mood, line: r.lines[id % r.lines.length] };
};

/** Plain-language band for the latest CBS rank. */
function commonness(rank: number): string {
  if (rank <= 20) return "נפוץ מאוד";
  if (rank <= 100) return "נפוץ";
  if (rank <= 500) return "מוכר אבל לא נפוץ";
  return "נדיר";
}

interface Props {
  suggestion: Suggestion;
  rating: Rating | undefined;
  showSex: boolean;
  allowNotes: boolean;
  onRate: (verdict: Verdict) => void;
  onNote: (note: string) => void;
  onUndoTaken: () => void;
  /** Bigger name for the one-at-a-time round view. */
  large?: boolean;
}

export function NameCard({ suggestion, rating, showSex, allowNotes, onRate, onNote, onUndoTaken, large }: Props) {
  const openFeedback = useFeedback();
  const [whyOpen, setWhyOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!rating?.note);
  const { name, sex, reason, explanation } = suggestion;
  const { latest, trend } = popularity(name);
  const meaning = displayMeaning(name);

  if (rating?.verdict === "taken") {
    return (
      <Card className="text-ink-soft">
        <MascotSays mood="surprised" size={48}>
          <span className="font-medium text-ink">{name.nameHe}</span> נוסף לשמות התפוסים במשפחה.
        </MascotSays>
        <button className="mt-1 min-h-11 text-sm font-medium text-lavender-dark underline" onClick={onUndoTaken}>
          ביטול
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={`font-display font-semibold ${large ? "text-5xl leading-tight" : "text-3xl"}`}>{name.niqqud}</h2>
          <p className="text-sm text-ink-soft" dir="ltr">
            {name.translit.join(" / ")}
          </p>
          {!!name.variants?.length && <p className="text-xs text-ink-soft">נכתב גם: {name.variants.join(", ")}</p>}
        </div>
        {showSex && <span className="rounded-full bg-cream px-3 py-1 text-xs">{SEX_LABELS[sex]}</span>}
      </div>

      {reason && <p className="mt-3 truncate text-base" title={reason}>{reason}</p>}

      <button className="mt-1 flex min-h-11 items-center gap-1 text-sm font-medium text-lavender-dark" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>
        {whyOpen ? "הסתרה" : "למה השם הזה?"}
        <span aria-hidden className={`text-xs transition-transform ${whyOpen ? "rotate-180" : ""}`}>▾</span>
      </button>
      {whyOpen && (
        <div className="space-y-3 rounded-2xl bg-cream px-4 py-3 text-sm">
          <dl className="space-y-1.5">
            {meaning && (
              <div>
                <dt className="inline font-medium">משמעות: </dt>
                <dd className="inline">{meaning}</dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium">מקור: </dt>
              <dd className="inline">
                {name.originHe ?? ORIGIN_LABELS[name.origin]}
                {name.biblicalRef && ` · ${name.formOf?.length ? `השם ${name.formOf[0]} ` : ""}מופיע בתנ״ך (${name.biblicalRef})`}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">כמה נפוץ: </dt>
              <dd className="inline">
                {commonness(latest.rank)}. {latest.count.toLocaleString("he-IL")} תינוקות ב-{latest.year}, מקום {latest.rank}, {TREND_LABELS[trend]}
              </dd>
            </div>
          </dl>
          {explanation.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="מול הבקשות">
              {explanation.map((line) => {
                const chip = FIT_CHIPS[line.fit];
                return (
                  <li key={line.requirement} title={line.detail} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${chip.className}`}>
                    <span aria-hidden>{chip.icon}</span>
                    <span className="sr-only">{chip.label}: </span>
                    {line.fit === "met" ? line.requirement : `${line.requirement}: ${line.detail}`}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`הדירוג של ${name.nameHe}`}>
        {VERDICTS.map((v) => (
          <button
            key={v.id}
            role="radio"
            aria-checked={rating?.verdict === v.id}
            onClick={() => onRate(v.id)}
            className={`min-h-11 rounded-2xl border-2 text-sm font-medium ${rating?.verdict === v.id ? v.selected : "border-line bg-white"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {rating?.verdict && (
        <MascotSays key={rating.verdict} mood={reactionFor(rating.verdict, name.id).mood} size={48} className="mt-3">
          {reactionFor(rating.verdict, name.id).line}
        </MascotSays>
      )}

      {allowNotes && noteOpen && (
        <input
          className={`${inputClass} mt-2 text-base sm:text-sm`}
          maxLength={200}
          value={rating?.note ?? ""}
          placeholder="למשל: דומה מדי לבת הדודה"
          aria-label={`הערה על ${name.nameHe}`}
          onChange={(e) => onNote(e.target.value)}
        />
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-ink-soft">
        {allowNotes && !noteOpen && (
          <button className="min-h-9 underline" onClick={() => setNoteOpen(true)}>
            הוספת הערה
          </button>
        )}
        <button className="min-h-9 underline" onClick={() => onRate("taken")}>
          תפוס אצלנו במשפחה
        </button>
        <button className="min-h-9 underline" onClick={() => openFeedback({ type: "error", nameId: name.id, nameHe: name.nameHe })}>
          דיווח על ההצעה
        </button>
      </div>
    </Card>
  );
}
