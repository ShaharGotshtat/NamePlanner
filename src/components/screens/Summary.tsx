"use client";

import { useEffect, useRef, useState } from "react";
import { fetchOurPick } from "@/lib/client/api";
import { displayMeaning } from "@/lib/names/catalog";
import { roundRequest, shownSuggestions, useApp } from "@/lib/client/state";
import type { Suggestion } from "@/lib/types";
import { MascotSays } from "../Mascot";
import { TagInput } from "../TagInput";
import { Button, Card, ScreenTitle } from "../ui";
import { ExportList } from "./ExportList";

const TOP_COUNT = 3;

export function Summary() {
  const { state, update } = useApp();
  const shown = shownSuggestions(state);
  const verdictOf = (s: Suggestion) => state.ratings[s.name.id]?.verdict;

  const interesting = shown
    .filter((s) => verdictOf(s) === "interesting")
    .sort((a, b) => Number(b.name.id === state.favoriteId) - Number(a.name.id === state.favoriteId));
  const unsure = shown.filter((s) => verdictOf(s) === "unsure");
  const favorite = interesting.find((s) => s.name.id === state.favoriteId) ?? (interesting.length === 1 ? interesting[0] : null);

  const goAgain = () => update((s) => ({ pass: s.pass + 1, step: "preferences", favoriteId: null }));

  return (
    <div>
      {favorite ? (
        <FirstChoice favorite={favorite} others={interesting.filter((s) => s !== favorite)} />
      ) : interesting.length > 1 ? (
        <PickFavorite names={interesting} onPick={(id) => update({ favoriteId: id })} />
      ) : (
        <NoMatch unsure={unsure} />
      )}

      {(favorite || interesting.length > 1) && <ExportList names={interesting} favorite={favorite} />}

      {!state.flagged && (
        <Button variant="secondary" className="mt-8 w-full" onClick={goAgain}>
          עוד סבב של שמות חדשים
        </Button>
      )}
    </div>
  );
}

function FirstChoice({ favorite, others }: { favorite: Suggestion; others: Suggestion[] }) {
  return (
    <>
      <ScreenTitle mood="cheer" subtitle="שתפו אותו עם בן או בת הזוג.">
        <span className="text-coral">{favorite.name.niqqud}</span> הוא הבחירה הראשונה שלכם!
      </ScreenTitle>
      {displayMeaning(favorite.name) && (
        <Card>
          <p>
            <span className="font-medium">משמעות:</span> {displayMeaning(favorite.name)}
          </p>
        </Card>
      )}
      {others.length > 0 && (
        <p className="mt-4 text-sm text-ink-soft">עוד שמות שאהבתם: {others.map((s) => s.name.nameHe).join(", ")}</p>
      )}
    </>
  );
}

function PickFavorite({ names, onPick }: { names: Suggestion[]; onPick: (id: number) => void }) {
  const top = names.slice(0, TOP_COUNT).map((s) => s.name.nameHe);
  return (
    <>
      <ScreenTitle mood="happy" subtitle="איזה מהם הכי אהבתם?">השמות המובילים שאהבתם הם {top.join(", ")}.</ScreenTitle>
      <ul className="space-y-2">
        {names.map((s) => (
          <li key={s.name.id}>
            <button className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-white px-4 ring-1 ring-line hover:ring-coral" onClick={() => onPick(s.name.id)}>
              <span className="font-display text-xl font-semibold">{s.name.niqqud}</span>
              <span className="text-sm text-ink-soft">{displayMeaning(s.name)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function NoMatch({ unsure }: { unsure: Suggestion[] }) {
  const { state, update } = useApp();
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);
  const pick = state.ourPick?.pass === state.pass ? state.ourPick : null;

  useEffect(() => {
    if (pick || requested.current) return;
    requested.current = true;
    setLoading(true);
    fetchOurPick(roundRequest(state), state.token)
      .then(({ suggestion, token }) => update({ token, ourPick: { pass: state.pass, suggestion, dismissed: false } }))
      .catch(() => update({ ourPick: { pass: state.pass, suggestion: null, dismissed: false } }))
      .finally(() => setLoading(false));
  }, [pick, state, update]);

  const markInteresting = (s: Suggestion) =>
    update((st) => ({ ratings: { ...st.ratings, [s.name.id]: { nameId: s.name.id, verdict: "interesting" } }, favoriteId: s.name.id }));

  return (
    <>
      <ScreenTitle mood="sad">מצטערים, לא מצאנו התאמה מושלמת.</ScreenTitle>
      {unsure.length > 0 && <p className="text-ink-soft">שמות שסימנתם כ״אולי״: {unsure.map((s) => s.name.nameHe).join(", ")}</p>}

      <div className="mt-6">
        <p className="mb-2 font-medium">שמות שאתם אוהבים, גם אם הם תפוסים</p>
        <TagInput
          label="שם שאתם אוהבים"
          values={state.namesWeLike}
          onChange={(namesWeLike) => update({ namesWeLike })}
          placeholder="למשל: שם של ילד של חברים"
        />
        <p className="mt-1 text-xs text-ink-soft">בסבב הבא נחפש שמות בסגנון שלהם.</p>
      </div>

      {loading && <MascotSays mood="think" className="mt-6">בוחרים בשבילכם שם...</MascotSays>}
      {pick?.suggestion && !pick.dismissed && (
        <Card className="mt-6">
          <p className="text-xs font-medium text-teal">הבחירה שלנו, שלא סימנתם</p>
          <h2 className="mt-1 font-display text-3xl font-semibold">{pick.suggestion.name.niqqud}</h2>
          <p className="mt-2 text-sm">{pick.suggestion.reason}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => markInteresting(pick.suggestion!)}>מעניין</Button>
            <Button variant="secondary" onClick={() => update({ ourPick: { ...pick, dismissed: true } })}>
              לא תודה
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
