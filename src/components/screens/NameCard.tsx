"use client";

import { useState } from "react";
import { displayMeaning, popularity } from "@/lib/names/catalog";
import type { Fit, Origin, Rating, Suggestion, Verdict } from "@/lib/types";
import { useFeedback } from "../Feedback";
import { Card, inputClass } from "../ui";

const VERDICTS: { id: Exclude<Verdict, "taken">; label: string; selected: string }[] = [
  { id: "no", label: "לא", selected: "border-ink bg-ink text-white" },
  { id: "unsure", label: "אולי", selected: "border-teal bg-teal text-white" },
  { id: "interesting", label: "מעניין!", selected: "border-coral-dark bg-coral-dark text-white" },
];

const FIT_ICONS: Record<Fit, { icon: string; label: string; className: string }> = {
  met: { icon: "✓", label: "מתקיים", className: "bg-teal text-white" },
  partly: { icon: "~", label: "מתקיים חלקית", className: "bg-amber-400 text-ink" },
  not_met: { icon: "✗", label: "לא מתקיים", className: "bg-ink/15 text-ink" },
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
  other: "אחר",
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
  onMisread: (requirement: string, misread: boolean) => void;
  onUndoTaken: () => void;
}

export function NameCard({ suggestion, rating, showSex, allowNotes, onRate, onNote, onMisread, onUndoTaken }: Props) {
  const openFeedback = useFeedback();
  const [whyOpen, setWhyOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!rating?.note);
  const [misread, setMisread] = useState<string[]>([]);
  const { name, sex, explanation } = suggestion;
  const { latest, trend } = popularity(name);
  const meaning = displayMeaning(name);

  if (rating?.verdict === "taken") {
    return (
      <Card className="text-center text-ink-soft">
        <p>
          <span className="font-medium text-ink">{name.nameHe}</span> נוסף לשמות התפוסים במשפחה.
        </p>
        <button className="mt-1 min-h-11 text-sm font-medium text-teal underline" onClick={onUndoTaken}>
          ביטול
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">{name.niqqud}</h2>
          <p className="text-sm text-ink-soft" dir="ltr">
            {name.translit.join(" / ")}
          </p>
        </div>
        {showSex && <span className="rounded-full bg-blush px-3 py-1 text-xs">{SEX_LABELS[sex]}</span>}
      </div>

      <button className="mt-2 min-h-11 text-sm font-medium text-teal" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>
        {whyOpen ? "הסתרה" : "למה השם הזה?"}
      </button>
      {whyOpen && (
        <div className="space-y-4 text-sm">
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
                {ORIGIN_LABELS[name.origin]}
                {name.biblicalRef && ` · מופיע בתנ״ך (${name.biblicalRef})`}
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
            <div>
              <p className="mb-2 font-medium">מול מה שביקשתם</p>
              <ul className="space-y-2">
              {explanation.map((line) => (
                <li key={line.requirement} className="flex items-start gap-2">
                  <span aria-label={FIT_ICONS[line.fit].label} className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${FIT_ICONS[line.fit].className}`}>
                    {FIT_ICONS[line.fit].icon}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{line.requirement}:</span> {line.detail}
                    {allowNotes &&
                      (misread.includes(line.requirement) ? (
                        <span className="block text-xs text-teal">
                          תודה, נתקן בסבב הבא.{" "}
                          <button
                            className="min-h-9 font-medium underline"
                            onClick={() => {
                              setMisread(misread.filter((r) => r !== line.requirement));
                              onMisread(line.requirement, false);
                            }}
                          >
                            ביטול
                          </button>
                        </span>
                      ) : (
                        <button
                          className="block min-h-9 text-xs text-ink-soft underline"
                          onClick={() => {
                            setMisread([...misread, line.requirement]);
                            onMisread(line.requirement, true);
                          }}
                        >
                          לא לזה התכוונתי
                        </button>
                      ))}
                  </span>
                </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`מה דעתכם על ${name.nameHe}?`}>
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

      {allowNotes && noteOpen && (
        <input
          className={`${inputClass} mt-2 text-sm`}
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
